// Lógica del servicio de reportes, separada del transporte (RabbitMQ y HTTP)
// para poder probarla sola.
//
// Cada evento recibido se guarda como un "movimiento" cuyo _id es el id del
// evento. Si RabbitMQ entrega el mismo mensaje dos veces, el segundo insert
// choca con el _id repetido y se ignora: el evento se cuenta una sola vez.
const { Schema } = require('mongoose');
const { EVENTOS } = require('../compartido/rabbitmq');

const movimientoSchema = new Schema({
  _id: String, // id del evento
  tipo: { type: String, enum: Object.values(EVENTOS), required: true },
  codigoCompra: String,
  pelicula: String,
  sala: String,
  inicioFuncion: Date,
  boletos: Number,
  importe: Number,
  fechaEvento: Date,
  recibidoEn: { type: Date, default: Date.now },
});

function crearEstadisticas(conexion) {
  const Movimiento = conexion.model('Movimiento', movimientoSchema);

  /** Registra un evento. Devuelve false si ya se había registrado antes. */
  async function registrar(evento) {
    if (!Object.values(EVENTOS).includes(evento.tipo)) return false;
    const d = evento.datos;
    try {
      await Movimiento.create({
        _id: evento.id,
        tipo: evento.tipo,
        codigoCompra: d.codigo,
        pelicula: d.funcion.pelicula,
        sala: d.funcion.sala,
        inicioFuncion: d.funcion.inicio,
        boletos: d.boletos.length,
        importe: d.total,
        fechaEvento: evento.fecha,
      });
      return true;
    } catch (err) {
      if (err.code === 11000) return false; // evento repetido
      throw err;
    }
  }

  /** Estadísticas por película, calculadas con una agregación sobre los movimientos. */
  async function obtener() {
    const creada = EVENTOS.COMPRA_CREADA;
    const peliculas = await Movimiento.aggregate([
      {
        $group: {
          _id: '$pelicula',
          compras: { $sum: { $cond: [{ $eq: ['$tipo', creada] }, 1, 0] } },
          cancelaciones: { $sum: { $cond: [{ $eq: ['$tipo', creada] }, 0, 1] } },
          boletosVendidos: { $sum: { $cond: [{ $eq: ['$tipo', creada] }, '$boletos', { $multiply: ['$boletos', -1] }] } },
          ingresos: { $sum: { $cond: [{ $eq: ['$tipo', creada] }, '$importe', { $multiply: ['$importe', -1] }] } },
          ultimoMovimiento: { $max: '$fechaEvento' },
        },
      },
      { $project: { _id: 0, pelicula: '$_id', compras: 1, cancelaciones: 1, boletosVendidos: 1, ingresos: 1, ultimoMovimiento: 1 } },
      { $sort: { ingresos: -1, pelicula: 1 } },
    ]);
    const totales = peliculas.reduce(
      (t, p) => ({
        compras: t.compras + p.compras,
        cancelaciones: t.cancelaciones + p.cancelaciones,
        boletosVendidos: t.boletosVendidos + p.boletosVendidos,
        ingresos: t.ingresos + p.ingresos,
      }),
      { compras: 0, cancelaciones: 0, boletosVendidos: 0, ingresos: 0 }
    );
    const ultimosEventos = await Movimiento.find()
      .sort({ recibidoEn: -1 })
      .limit(10)
      .select('-_id tipo codigoCompra pelicula boletos importe recibidoEn')
      .lean();
    return { totales, peliculas, ultimosEventos, eventosRegistrados: await Movimiento.estimatedDocumentCount() };
  }

  return { registrar, obtener, Movimiento };
}

module.exports = { crearEstadisticas };
