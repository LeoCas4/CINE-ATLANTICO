// Microservicio de notificaciones.
// Escucha los eventos de compra en RabbitMQ y envía los correos al cliente:
// boletos con código QR al comprar, y aviso al cancelar.
require('dotenv').config();
const nodemailer = require('nodemailer');
const { EVENTOS, mantenerConexion, declararCola, esperar } = require('../compartido/rabbitmq');
const { correoCompra, correoCancelacion } = require('./plantillas');

const COLA = 'notificaciones';
const REMITENTE = process.env.CORREO_REMITENTE || 'Cine Atlántico <boletos@cine-atlantico.local>';

const transporte = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: false,
  ...(process.env.SMTP_USER && { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }),
});

const PLANTILLAS = {
  [EVENTOS.COMPRA_CREADA]: correoCompra,
  [EVENTOS.COMPRA_CANCELADA]: correoCancelacion,
};

async function procesar(evento) {
  const plantilla = PLANTILLAS[evento.tipo];
  if (!plantilla) return; // evento que no le interesa a este servicio
  const correo = await plantilla(evento);
  await transporte.sendMail({ from: REMITENTE, ...correo });
  console.log(`[notificaciones] ${evento.tipo}: correo enviado a ${evento.datos.cliente.email} (${evento.datos.codigo})`);
}

function iniciar(url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672') {
  return mantenerConexion(url, 'notificaciones', async (conexion) => {
    const canal = await conexion.createChannel();
    await declararCola(canal, COLA, ['compra.*']);
    await canal.prefetch(5); // procesa hasta 5 mensajes a la vez

    await canal.consume(COLA, async (msg) => {
      if (!msg) return;
      try {
        await procesar(JSON.parse(msg.content.toString()));
        canal.ack(msg); // listo: RabbitMQ borra el mensaje de la cola
      } catch (err) {
        if (!msg.fields.redelivered) {
          // Primer fallo (por ejemplo, el servidor de correo no responde): se reintenta
          console.warn(`[notificaciones] Falló el envío (${err.message}); se reintentará`);
          await esperar(5000);
          canal.nack(msg, false, true);
        } else {
          // Segundo fallo: el mensaje pasa a la cola "notificaciones.fallidos"
          console.error(`[notificaciones] Falló de nuevo (${err.message}); mensaje enviado a ${COLA}.fallidos`);
          canal.nack(msg, false, false);
        }
      }
    });
    console.log(`[notificaciones] Escuchando la cola "${COLA}"`);
  });
}

if (require.main === module) iniciar();

module.exports = { iniciar, procesar };
