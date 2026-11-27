// Pruebas de la mensajería entre microservicios.
// Las que necesitan RabbitMQ se ejecutan solo si RABBITMQ_URL_TEST está definida.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { seed } = require('../servicios/boletos/seed');
const Funcion = require('../servicios/boletos/models/Funcion');
const servicioCompras = require('../servicios/boletos/servicioCompras');
const mensajeria = require('../servicios/boletos/mensajeria');
const { EXCHANGE, EVENTOS, declararExchange } = require('../servicios/compartido/rabbitmq');
const { correoCompra, correoCancelacion } = require('../servicios/notificaciones/plantillas');
const { crearEstadisticas } = require('../servicios/reportes/estadisticas');

const RABBITMQ_URL = process.env.RABBITMQ_URL_TEST;
const sinRabbit = !RABBITMQ_URL && 'define RABBITMQ_URL_TEST para probar con RabbitMQ';

let mongo, conexionReportes, estadisticas, funcionId;
let amqpConexion, amqpCanal, colaPrueba;

/** Cambia el nombre de la base de datos de una URI de MongoDB. */
function conBase(uri, nombre) {
  const u = new URL(uri);
  u.pathname = `/${nombre}`;
  return u.toString();
}

const cliente = { nombre: 'Ana', email: 'ana@correo.com' };

const eventoEjemplo = (id, tipo = EVENTOS.COMPRA_CREADA) => ({
  id,
  tipo,
  fecha: new Date().toISOString(),
  datos: {
    codigo: 'CIN-PRUEBA',
    cliente,
    total: 240,
    boletos: [
      { codigo: 'CIN-PRUEBA-F7', asiento: 'F7', precio: 120, vip: false },
      { codigo: 'CIN-PRUEBA-F8', asiento: 'F8', precio: 120, vip: false },
    ],
    funcion: { inicio: new Date(), formato: 'IMAX', idioma: 'Español', pelicula: 'Star Wars', sala: 'Sala 3 IMAX' },
  },
});

/** Espera hasta `n` mensajes en la cola de prueba. */
async function recibir(n, ms = 5000) {
  const recibidos = [];
  const limite = Date.now() + ms;
  while (recibidos.length < n && Date.now() < limite) {
    const msg = await amqpCanal.get(colaPrueba, { noAck: true });
    if (msg) recibidos.push(JSON.parse(msg.content.toString()));
    else await new Promise((r) => setTimeout(r, 100));
  }
  return recibidos;
}

async function esperarHasta(condicion, ms = 5000) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (await condicion()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

before(async () => {
  let base = process.env.MONGODB_URI_TEST;
  if (!base) {
    mongo = await MongoMemoryServer.create();
    base = mongo.getUri();
  }
  await mongoose.connect(conBase(base, 'cine_test_mensajeria'));
  await seed();
  await mensajeria.EventoPendiente.deleteMany();
  funcionId = String((await Funcion.findOne().sort({ inicio: -1 }))._id);

  conexionReportes = await mongoose.createConnection(conBase(base, 'cine_test_reportes')).asPromise();
  await conexionReportes.dropDatabase();
  estadisticas = crearEstadisticas(conexionReportes);

  if (RABBITMQ_URL) {
    amqpConexion = await amqp.connect(RABBITMQ_URL);
    amqpCanal = await amqpConexion.createChannel();
    await declararExchange(amqpCanal);
    ({ queue: colaPrueba } = await amqpCanal.assertQueue('', { exclusive: true }));
    await amqpCanal.bindQueue(colaPrueba, EXCHANGE, 'compra.*');
  }
});

after(async () => {
  await mensajeria.detener();
  if (amqpConexion) await amqpConexion.close();
  await conexionReportes.dropDatabase();
  await conexionReportes.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongo?.stop();
});

test('notificaciones: el correo de compra lleva un código QR por boleto', async () => {
  const correo = await correoCompra(eventoEjemplo('e1'));
  assert.strictEqual(correo.to, 'Ana <ana@correo.com>');
  assert.match(correo.subject, /CIN-PRUEBA/);
  assert.strictEqual(correo.attachments.length, 2);
  for (const a of correo.attachments) {
    assert.ok(a.content.subarray(1, 4).toString() === 'PNG', 'el QR es una imagen PNG');
    assert.ok(correo.html.includes(`cid:${a.cid}`), 'el QR aparece dentro del correo');
  }
  const cancelacion = correoCancelacion(eventoEjemplo('e2', EVENTOS.COMPRA_CANCELADA));
  assert.match(cancelacion.subject, /cancelada/);
  assert.match(cancelacion.text, /F7, F8/);
});

test('reportes: un evento repetido se cuenta una sola vez', async () => {
  assert.strictEqual(await estadisticas.registrar(eventoEjemplo('evento-1')), true);
  assert.strictEqual(await estadisticas.registrar(eventoEjemplo('evento-1')), false, 'el repetido se ignora');
  assert.strictEqual(await estadisticas.registrar(eventoEjemplo('evento-2', EVENTOS.COMPRA_CANCELADA)), true);

  const { totales, peliculas, eventosRegistrados } = await estadisticas.obtener();
  assert.strictEqual(eventosRegistrados, 2);
  assert.deepStrictEqual(totales, { compras: 1, cancelaciones: 1, boletosVendidos: 0, ingresos: 0 });
  assert.strictEqual(peliculas[0].pelicula, 'Star Wars');
});

test('outbox: sin RabbitMQ el evento se guarda y se reenvía al reconectar', { skip: sinRabbit }, async () => {
  mensajeria._activarSinConexion(); // mensajería activa pero sin conexión
  const compra = await servicioCompras.comprar({ funcionId, asientos: ['C5'], cliente });
  assert.ok(await esperarHasta(async () => (await mensajeria.EventoPendiente.countDocuments()) === 1), 'quedó pendiente');

  mensajeria.iniciar(RABBITMQ_URL); // al conectar, reenvía los pendientes
  const [evento] = await recibir(1);
  assert.strictEqual(evento?.datos.codigo, compra.codigo);
  assert.ok(await esperarHasta(async () => (await mensajeria.EventoPendiente.countDocuments()) === 0), 'se vació');
});

test('compra y cancelación publican sus eventos con los datos de la compra', { skip: sinRabbit }, async () => {
  const compra = await servicioCompras.comprar({ funcionId, asientos: ['D1', 'D2'], cliente });
  await servicioCompras.cancelar(compra.codigo, cliente.email);

  const [creada, cancelada] = await recibir(2);
  assert.strictEqual(creada.tipo, EVENTOS.COMPRA_CREADA);
  assert.strictEqual(creada.datos.codigo, compra.codigo);
  assert.deepStrictEqual(creada.datos.boletos.map((b) => b.asiento), ['D1', 'D2']);
  assert.strictEqual(creada.datos.cliente.email, cliente.email);
  assert.ok(creada.datos.funcion.pelicula, 'incluye el título de la película');
  assert.strictEqual(cancelada.tipo, EVENTOS.COMPRA_CANCELADA);
  assert.strictEqual(cancelada.datos.estado, 'cancelada');
  assert.notStrictEqual(creada.id, cancelada.id);
});
