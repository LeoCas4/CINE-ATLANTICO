const crypto = require('crypto');
const Funcion = require('./models/Funcion');
const Compra = require('./models/Compra');
const { mejoresAsientos } = require('./asignacion');

const MAX_BOLETOS = 10;
const MAX_REINTENTOS = 15;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

class ErrorNegocio extends Error {
  constructor(mensaje, status = 400, extra = {}) {
    super(mensaje);
    this.status = status;
    Object.assign(this, extra);
  }
}

function generarCodigo() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  return 'CIN-' + Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

async function cargarFuncion(funcionId) {
  const funcion = await Funcion.findById(funcionId).populate('sala').populate('pelicula');
  if (!funcion) throw new ErrorNegocio('La función no existe', 404);
  if (funcion.inicio <= new Date()) throw new ErrorNegocio('La función ya comenzó; no se venden boletos');
  return funcion;
}

/**
 * Reserva atómicamente los asientos: la actualización solo se aplica si
 * NINGUNO de los asientos solicitados está ya en asientosOcupados.
 * MongoDB garantiza atomicidad a nivel de documento, así que dos compras
 * simultáneas del mismo asiento no pueden tener éxito ambas.
 */
async function reservarAsientos(funcionId, asientos) {
  return Funcion.findOneAndUpdate(
    { _id: funcionId, inicio: { $gt: new Date() }, asientosOcupados: { $nin: asientos } },
    { $push: { asientosOcupados: { $each: asientos } } },
    { new: true }
  );
}

async function liberarAsientos(funcionId, asientos) {
  await Funcion.updateOne({ _id: funcionId }, { $pullAll: { asientosOcupados: asientos } });
}

function validarCliente(cliente) {
  const nombre = cliente?.nombre?.trim();
  const email = cliente?.email?.trim();
  if (!nombre) throw new ErrorNegocio('El nombre del cliente es obligatorio');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErrorNegocio('Email inválido');
  return { nombre, email };
}

/**
 * Compra boletos.
 *  - Asignación manual: se envía `asientos: ["E5","E6"]`
 *  - Asignación automática: se envía `cantidad: 2`
 */
async function comprar({ funcionId, asientos, cantidad, cliente, metodoPago }) {
  const datosCliente = validarCliente(cliente);
  const automatica = !Array.isArray(asientos) || asientos.length === 0;
  const n = automatica ? Number(cantidad) : asientos.length;

  if (!Number.isInteger(n) || n < 1) throw new ErrorNegocio('Indica los asientos o la cantidad de boletos');
  if (n > MAX_BOLETOS) throw new ErrorNegocio(`Máximo ${MAX_BOLETOS} boletos por compra`);

  let funcion = await cargarFuncion(funcionId);
  const sala = funcion.sala;
  let elegidos;
  let reservada = null;

  if (!automatica) {
    elegidos = [...new Set(asientos.map((a) => String(a).toUpperCase().trim()))];
    if (elegidos.length !== asientos.length) throw new ErrorNegocio('Hay asientos repetidos');
    const invalidos = elegidos.filter((a) => !sala.asientoValido(a));
    if (invalidos.length) throw new ErrorNegocio(`Asientos inválidos: ${invalidos.join(', ')}`);
    reservada = await reservarAsientos(funcion._id, elegidos);
    if (!reservada) {
      const actual = await Funcion.findById(funcion._id);
      const tomados = elegidos.filter((a) => actual.asientosOcupados.includes(a));
      throw new ErrorNegocio(
        tomados.length ? `Asientos ya vendidos: ${tomados.join(', ')}` : 'La función ya no está disponible',
        409,
        { asientosNoDisponibles: tomados }
      );
    }
  } else {
    // Reintentos: si otra compra gana la carrera, se recalcula con el estado nuevo
    for (let intento = 0; intento < MAX_REINTENTOS && !reservada; intento++) {
      elegidos = mejoresAsientos(sala, funcion.asientosOcupados, n);
      if (!elegidos) throw new ErrorNegocio(`No hay ${n} asientos disponibles`, 409);
      reservada = await reservarAsientos(funcion._id, elegidos);
      if (!reservada) {
        await esperar(Math.random() * 20 * (intento + 1));
        funcion = await cargarFuncion(funcionId);
      }
    }
    if (!reservada) throw new ErrorNegocio('Alta demanda, intenta de nuevo', 409);
  }

  const codigo = generarCodigo();
  const boletos = elegidos.sort(compararAsientos).map((asiento) => {
    const vip = sala.filasVip.includes(asiento[0]);
    return {
      codigo: `${codigo}-${asiento}`,
      asiento,
      vip,
      precio: funcion.precio + (vip ? sala.recargoVip : 0),
    };
  });

  try {
    const compra = await Compra.create({
      codigo,
      funcion: funcion._id,
      cliente: datosCliente,
      boletos,
      total: boletos.reduce((s, b) => s + b.precio, 0),
      metodoPago: metodoPago === 'efectivo' ? 'efectivo' : 'tarjeta',
      asignacion: automatica ? 'automatica' : 'manual',
    });
    return obtenerCompra(compra.codigo);
  } catch (err) {
    // Compensación: si no se pudo guardar la compra, se liberan los asientos
    await liberarAsientos(funcion._id, elegidos);
    throw err;
  }
}

async function obtenerCompra(codigo) {
  const compra = await Compra.findOne({ codigo: String(codigo).toUpperCase().trim() }).populate({
    path: 'funcion',
    select: '-asientosOcupados',
    populate: [{ path: 'pelicula' }, { path: 'sala', select: 'nombre' }],
  });
  if (!compra) throw new ErrorNegocio('Compra no encontrada', 404);
  return compra;
}

async function cancelar(codigo, email) {
  const compra = await obtenerCompra(codigo);
  if (compra.cliente.email !== String(email || '').toLowerCase().trim()) {
    throw new ErrorNegocio('El email no coincide con el de la compra', 403);
  }
  if (compra.funcion.inicio <= new Date()) throw new ErrorNegocio('La función ya comenzó; no se puede cancelar');

  // Cambio de estado atómico para que la cancelación no se procese dos veces
  const actualizada = await Compra.findOneAndUpdate(
    { _id: compra._id, estado: 'pagada' },
    { estado: 'cancelada', canceladaEn: new Date() },
    { new: true }
  );
  if (!actualizada) throw new ErrorNegocio('La compra ya estaba cancelada', 409);
  await liberarAsientos(compra.funcion._id, compra.boletos.map((b) => b.asiento));
  return obtenerCompra(codigo);
}

function compararAsientos(a, b) {
  return a[0] === b[0] ? Number(a.slice(1)) - Number(b.slice(1)) : a.localeCompare(b);
}

module.exports = { comprar, obtenerCompra, cancelar, ErrorNegocio, MAX_BOLETOS };
