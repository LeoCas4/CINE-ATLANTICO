// Microservicio de reportes.
// Escucha los eventos de compra en RabbitMQ, los guarda en su propia base de
// datos (cine_reportes) y ofrece las estadísticas en GET /estadisticas.
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { mantenerConexion, declararCola } = require('../compartido/rabbitmq');
const { crearEstadisticas } = require('./estadisticas');

const COLA = 'reportes';
const PORT = Number(process.env.REPORTES_PORT || 3002);
const URI = process.env.REPORTES_MONGODB_URI || 'mongodb://127.0.0.1:27017/cine_reportes';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

async function iniciar() {
  const conexion = await mongoose.createConnection(URI).asPromise();
  console.log(`[reportes] MongoDB conectado: ${conexion.name}`);
  const estadisticas = crearEstadisticas(conexion);

  mantenerConexion(RABBITMQ_URL, 'reportes', async (conn) => {
    const canal = await conn.createChannel();
    await declararCola(canal, COLA, ['compra.*']);
    await canal.prefetch(10);
    await canal.consume(COLA, async (msg) => {
      if (!msg) return;
      try {
        const evento = JSON.parse(msg.content.toString());
        const nuevo = await estadisticas.registrar(evento);
        console.log(`[reportes] ${evento.tipo} ${evento.datos?.codigo}${nuevo ? '' : ' (repetido, ignorado)'}`);
        canal.ack(msg);
      } catch (err) {
        console.error(`[reportes] No se pudo registrar el evento: ${err.message}`);
        canal.nack(msg, false, !msg.fields.redelivered); // un reintento; después, a reportes.fallidos
      }
    });
    console.log(`[reportes] Escuchando la cola "${COLA}"`);
  });

  const app = express();
  app.get('/estadisticas', async (req, res, next) => {
    try {
      res.json(await estadisticas.obtener());
    } catch (err) {
      next(err);
    }
  });
  app.get('/salud', (req, res) => res.json({ servicio: 'reportes', estado: 'ok' }));
  app.listen(PORT, () => console.log(`[reportes] Estadísticas en http://localhost:${PORT}/estadisticas`));
}

iniciar().catch((err) => {
  console.error('[reportes] No se pudo iniciar:', err.message);
  process.exit(1);
});
