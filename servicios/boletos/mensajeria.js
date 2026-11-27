// Publicación de eventos del servicio de boletos hacia RabbitMQ.
//
// Patrón "outbox": si RabbitMQ no está disponible en el momento de la compra,
// el evento se guarda en la colección "eventospendientes" de MongoDB y se
// reenvía en cuanto vuelve la conexión. Así la venta de boletos nunca se
// detiene por culpa del broker y ningún evento se pierde.
const crypto = require('crypto');
const { Schema, model } = require('mongoose');
const { EXCHANGE, mantenerConexion, declararExchange } = require('../compartido/rabbitmq');

const EventoPendiente = model(
  'EventoPendiente',
  new Schema({ _id: String, evento: { type: Object, required: true }, creadoEn: { type: Date, default: Date.now } })
);

let activo = false; // false = mensajería desactivada (por ejemplo, en las pruebas)
let canal = null;
let conexion = null;
let temporizador = null;

/** Conecta con RabbitMQ. Sin URL, la mensajería queda desactivada. */
function iniciar(url) {
  if (!url) {
    console.log('[boletos] RABBITMQ_URL no está definida: la mensajería está desactivada');
    return;
  }
  activo = true;
  conexion = mantenerConexion(url, 'boletos', async (conn) => {
    const nuevo = await conn.createConfirmChannel();
    await declararExchange(nuevo);
    nuevo.on('close', () => {
      if (canal === nuevo) canal = null;
    });
    canal = nuevo;
    await reenviarPendientes();
  });
  temporizador = setInterval(() => reenviarPendientes().catch(() => {}), 10000);
  temporizador.unref();
}

async function enviar(evento) {
  if (!canal) throw new Error('sin conexión con RabbitMQ');
  canal.publish(EXCHANGE, evento.tipo, Buffer.from(JSON.stringify(evento)), {
    persistent: true, // el mensaje sobrevive a un reinicio de RabbitMQ
    contentType: 'application/json',
    messageId: evento.id,
    type: evento.tipo,
    timestamp: Math.floor(Date.now() / 1000),
  });
  await canal.waitForConfirms(); // RabbitMQ confirma que recibió y guardó el mensaje
}

/** Publica un evento. Nunca lanza error: si no puede enviarlo, lo guarda para después. */
async function publicar(tipo, datos) {
  if (!activo) return null;
  const evento = { id: crypto.randomUUID(), tipo, fecha: new Date().toISOString(), origen: 'boletos', datos };
  try {
    await enviar(evento);
  } catch (err) {
    console.warn(`[boletos] No se pudo publicar ${tipo} (${err.message}); queda pendiente`);
    await EventoPendiente.create({ _id: evento.id, evento }).catch((e) =>
      console.error(`[boletos] No se pudo guardar el evento pendiente: ${e.message}`)
    );
  }
  return evento;
}

/** Reenvía, en orden, los eventos que quedaron pendientes. */
async function reenviarPendientes() {
  if (!canal) return 0;
  const pendientes = await EventoPendiente.find().sort({ creadoEn: 1 }).limit(100);
  let enviados = 0;
  for (const p of pendientes) {
    try {
      await enviar(p.evento);
      await EventoPendiente.deleteOne({ _id: p._id });
      enviados++;
    } catch {
      break; // se perdió la conexión: se reintenta en el siguiente ciclo
    }
  }
  if (enviados) console.log(`[boletos] Se reenviaron ${enviados} evento(s) pendiente(s)`);
  return enviados;
}

async function detener() {
  clearInterval(temporizador);
  activo = false;
  canal = null;
  if (conexion) await conexion.detener();
  conexion = null;
}

/** Solo para las pruebas: activa la mensajería sin conectarse a RabbitMQ. */
function _activarSinConexion() {
  activo = true;
}

module.exports = { iniciar, publicar, reenviarPendientes, detener, EventoPendiente, _activarSinConexion };
