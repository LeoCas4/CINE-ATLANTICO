const express = require('express');
const mongoose = require('mongoose');
const Pelicula = require('../models/Pelicula');
const Funcion = require('../models/Funcion');
const Compra = require('../models/Compra');
const { mejoresAsientos } = require('../asignacion');
const { comprar, obtenerCompra, cancelar, ErrorNegocio } = require('../servicioCompras');

const router = express.Router();
const idValido = (id) => mongoose.isValidObjectId(id);

// Cartelera: películas activas con funciones próximas
router.get('/peliculas', async (req, res) => {
  const funciones = await Funcion.find({ inicio: { $gt: new Date() } })
    .sort({ inicio: 1 })
    .populate('sala', 'nombre filas asientosPorFila asientosDeshabilitados')
    .select('-asientosOcupados -createdAt -updatedAt')
    .lean();

  const ocupacion = await Funcion.aggregate([
    { $match: { _id: { $in: funciones.map((f) => f._id) } } },
    { $project: { vendidos: { $size: '$asientosOcupados' } } },
  ]);
  const vendidos = Object.fromEntries(ocupacion.map((o) => [String(o._id), o.vendidos]));

  const peliculas = await Pelicula.find({ activa: true }).sort({ titulo: 1 }).lean();
  res.json(
    peliculas.map((p) => ({
      ...p,
      funciones: funciones
        .filter((f) => String(f.pelicula) === String(p._id))
        .map((f) => {
          const capacidad = f.sala.filas * f.sala.asientosPorFila - f.sala.asientosDeshabilitados.length;
          return { ...f, sala: { _id: f.sala._id, nombre: f.sala.nombre }, disponibles: capacidad - (vendidos[f._id] || 0) };
        }),
    }))
  );
});

// Detalle de una función con el mapa de la sala y los asientos ocupados
router.get('/funciones/:id', async (req, res) => {
  if (!idValido(req.params.id)) throw new ErrorNegocio('Id inválido');
  const f = await Funcion.findById(req.params.id).populate('pelicula').populate('sala');
  if (!f) throw new ErrorNegocio('La función no existe', 404);
  res.json({
    _id: f._id,
    inicio: f.inicio,
    fin: f.fin,
    precio: f.precio,
    idioma: f.idioma,
    formato: f.formato,
    pelicula: f.pelicula,
    sala: f.sala,
    asientosOcupados: f.asientosOcupados,
    disponibles: f.sala.capacidad() - f.asientosOcupados.length,
  });
});

// Sugerencia de mejores asientos (no reserva nada)
router.get('/funciones/:id/sugerencia', async (req, res) => {
  if (!idValido(req.params.id)) throw new ErrorNegocio('Id inválido');
  const cantidad = Number(req.query.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) throw new ErrorNegocio('Cantidad inválida (1-10)');
  const f = await Funcion.findById(req.params.id).populate('sala');
  if (!f) throw new ErrorNegocio('La función no existe', 404);
  const asientos = mejoresAsientos(f.sala, f.asientosOcupados, cantidad);
  if (!asientos) throw new ErrorNegocio(`No hay ${cantidad} asientos disponibles`, 409);
  res.json({ asientos });
});

router.post('/compras', async (req, res) => {
  const { funcionId, asientos, cantidad, cliente, metodoPago } = req.body;
  if (!idValido(funcionId)) throw new ErrorNegocio('Función inválida');
  const compra = await comprar({ funcionId, asientos, cantidad, cliente, metodoPago });
  res.status(201).json(compra);
});

router.get('/compras', async (req, res) => {
  const email = String(req.query.email || '').toLowerCase().trim();
  if (!email) throw new ErrorNegocio('Indica el email');
  const compras = await Compra.find({ 'cliente.email': email })
    .sort({ createdAt: -1 })
    .populate({ path: 'funcion', select: '-asientosOcupados', populate: [{ path: 'pelicula', select: 'titulo' }, { path: 'sala', select: 'nombre' }] });
  res.json(compras);
});

router.get('/compras/:codigo', async (req, res) => {
  res.json(await obtenerCompra(req.params.codigo));
});

router.post('/compras/:codigo/cancelar', async (req, res) => {
  res.json(await cancelar(req.params.codigo, req.body.email));
});

module.exports = router;
