const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../src/app');
const { seed } = require('../src/seed');
const Funcion = require('../src/models/Funcion');
const { mejoresAsientos } = require('../src/asignacion');

let mongo, server, base, funcionId;

async function api(ruta, opciones = {}) {
  const res = await fetch(base + ruta, {
    method: opciones.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
    body: opciones.body && JSON.stringify(opciones.body),
  });
  return { status: res.status, body: await res.json() };
}
const cliente = { nombre: 'Ana', email: 'ana@correo.com' };

before(async () => {
  // Usa MONGODB_URI_TEST si está definida; si no, levanta un MongoDB en memoria
  let uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  }
  await mongoose.connect(uri);
  await seed();
  // Función futura garantizada (por si el seed corre de noche)
  const f = await Funcion.findOne().sort({ inicio: -1 });
  funcionId = String(f._id);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server?.close();
  if (process.env.MONGODB_URI_TEST) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongo?.stop();
});

test('algoritmo: elige bloque contiguo centrado y respeta pasillos', () => {
  const sala = { filas: 5, asientosPorFila: 10, pasillos: [5], asientosDeshabilitados: [] };
  const a = mejoresAsientos(sala, [], 2);
  assert.strictEqual(a.length, 2);
  // C5 y C6 están separados por pasillo: no deben salir juntos como bloque
  assert.ok(!(a.includes('C5') && a.includes('C6')));
  assert.strictEqual(a[0][0], a[1][0], 'misma fila');
  // sin espacio suficiente
  assert.strictEqual(mejoresAsientos({ filas: 1, asientosPorFila: 2, asientosDeshabilitados: [] }, ['A1'], 2), null);
});

test('cartelera lista películas con funciones', async () => {
  const r = await api('/peliculas');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.length >= 4);
});

test('compra manual y bloqueo del asiento vendido', async () => {
  const r = await api('/compras', { method: 'POST', body: { funcionId, asientos: ['E5', 'E6'], cliente } });
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.boletos.length, 2);
  assert.match(r.body.codigo, /^CIN-/);

  const r2 = await api('/compras', { method: 'POST', body: { funcionId, asientos: ['E6', 'E7'], cliente } });
  assert.strictEqual(r2.status, 409);
  assert.deepStrictEqual(r2.body.asientosNoDisponibles, ['E6']);

  const f = await api('/funciones/' + funcionId);
  assert.ok(f.body.asientosOcupados.includes('E5'));
  assert.ok(!f.body.asientosOcupados.includes('E7'), 'E7 no debe quedar reservado tras el conflicto');
});

test('compras simultáneas del mismo asiento: solo una gana', async () => {
  const intentos = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      api('/compras', { method: 'POST', body: { funcionId, asientos: ['B3'], cliente: { nombre: 'X' + i, email: `x${i}@c.com` } } })
    )
  );
  assert.strictEqual(intentos.filter((r) => r.status === 201).length, 1);
  assert.strictEqual(intentos.filter((r) => r.status === 409).length, 14);
});

test('asignación automática simultánea no repite asientos', async () => {
  const intentos = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      api('/compras', { method: 'POST', body: { funcionId, cantidad: 3, cliente: { nombre: 'A' + i, email: `a${i}@c.com` } } })
    )
  );
  const asientos = intentos.filter((r) => r.status === 201).flatMap((r) => r.body.boletos.map((b) => b.asiento));
  assert.strictEqual(asientos.length, 24);
  assert.strictEqual(new Set(asientos).size, 24);
  const f = await Funcion.findById(funcionId);
  assert.strictEqual(new Set(f.asientosOcupados).size, f.asientosOcupados.length);
});

test('validaciones: asiento inválido, duplicado, email y límite', async () => {
  assert.strictEqual((await api('/compras', { method: 'POST', body: { funcionId, asientos: ['Z99'], cliente } })).status, 400);
  assert.strictEqual((await api('/compras', { method: 'POST', body: { funcionId, asientos: ['C1', 'C1'], cliente } })).status, 400);
  assert.strictEqual((await api('/compras', { method: 'POST', body: { funcionId, asientos: ['C2'], cliente: { nombre: 'a', email: 'malo' } } })).status, 400);
  assert.strictEqual((await api('/compras', { method: 'POST', body: { funcionId, cantidad: 11, cliente } })).status, 400);
});

test('cancelar libera los asientos y exige el email correcto', async () => {
  const c = (await api('/compras', { method: 'POST', body: { funcionId, asientos: ['D1'], cliente } })).body;
  assert.strictEqual((await api(`/compras/${c.codigo}/cancelar`, { method: 'POST', body: { email: 'otro@c.com' } })).status, 403);
  const r = await api(`/compras/${c.codigo}/cancelar`, { method: 'POST', body: { email: 'ANA@correo.com' } });
  assert.strictEqual(r.body.estado, 'cancelada');
  assert.strictEqual((await api(`/compras/${c.codigo}/cancelar`, { method: 'POST', body: { email: cliente.email } })).status, 409);
  const f = await api('/funciones/' + funcionId);
  assert.ok(!f.body.asientosOcupados.includes('D1'));
});

test('admin: requiere clave, crea función y evita traslapes; reporte', async () => {
  assert.strictEqual((await api('/admin/reporte')).status, 401);
  const h = { 'x-admin-key': 'admin123' };
  const salas = (await api('/admin/salas', { headers: h })).body;
  const peli = (await api('/admin/peliculas', { method: 'POST', headers: h, body: { titulo: 'Nueva', duracionMin: 100 } })).body;
  const inicio = new Date(Date.now() + 30 * 86400000).toISOString();
  const r = await api('/admin/funciones', { method: 'POST', headers: h, body: { peliculaId: peli._id, salaId: salas[0]._id, inicio, precio: 80 } });
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const choque = await api('/admin/funciones', { method: 'POST', headers: h, body: { peliculaId: peli._id, salaId: salas[0]._id, inicio, precio: 80 } });
  assert.strictEqual(choque.status, 409);
  const rep = await api('/admin/reporte', { headers: h });
  assert.strictEqual(rep.status, 200);
  assert.ok(rep.body.totales.boletos >= 27);
});
