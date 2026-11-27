// Conexión a RabbitMQ compartida por todos los microservicios.
//
// Los servicios se comunican con eventos publicados en un exchange de tipo
// "topic": cada evento lleva una clave de ruteo (por ejemplo "compra.creada")
// y RabbitMQ lo copia a todas las colas que se suscribieron a esa clave.
const amqp = require('amqplib');

const EXCHANGE = 'cine.eventos';

const EVENTOS = {
  COMPRA_CREADA: 'compra.creada',
  COMPRA_CANCELADA: 'compra.cancelada',
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Se conecta a RabbitMQ y se reconecta solo si la conexión se pierde.
 * Cada vez que hay conexión llama a `alConectar(conexion)` para que el
 * servicio cree sus canales, colas y consumidores.
 */
function mantenerConexion(url, nombre, alConectar) {
  let detenido = false;
  let conexionActual = null;

  async function conectar() {
    for (let intento = 1; !detenido; intento++) {
      try {
        const conexion = await amqp.connect(url);
        conexionActual = conexion;
        conexion.on('error', (err) => console.error(`[${nombre}] Error de RabbitMQ: ${err.message}`));
        conexion.on('close', () => {
          conexionActual = null;
          if (detenido) return;
          console.warn(`[${nombre}] Se perdió la conexión con RabbitMQ; reconectando...`);
          esperar(3000).then(conectar);
        });
        await alConectar(conexion);
        console.log(`[${nombre}] Conectado a RabbitMQ`);
        return;
      } catch (err) {
        if (conexionActual) await conexionActual.close().catch(() => {});
        conexionActual = null;
        const espera = Math.min(1000 * intento, 10000);
        console.warn(`[${nombre}] RabbitMQ no disponible (${err.message}); reintento en ${espera / 1000} s`);
        await esperar(espera);
      }
    }
  }

  conectar();
  return {
    async detener() {
      detenido = true;
      if (conexionActual) await conexionActual.close().catch(() => {});
    },
  };
}

/** Declara el exchange de eventos. Es idempotente: si ya existe no pasa nada. */
async function declararExchange(canal) {
  await canal.assertExchange(EXCHANGE, 'topic', { durable: true });
}

/**
 * Declara la cola de un servicio, su cola de mensajes fallidos y la suscribe
 * a las claves de ruteo indicadas. Los mensajes que fallan dos veces pasan a
 * "<cola>.fallidos" para revisarlos después en lugar de perderse.
 */
async function declararCola(canal, cola, claves) {
  await declararExchange(canal);
  await canal.assertQueue(`${cola}.fallidos`, { durable: true });
  await canal.assertQueue(cola, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `${cola}.fallidos` },
  });
  for (const clave of claves) await canal.bindQueue(cola, EXCHANGE, clave);
}

module.exports = { EXCHANGE, EVENTOS, mantenerConexion, declararExchange, declararCola, esperar };
