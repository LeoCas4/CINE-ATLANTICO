const express = require('express');
const mongoose = require('mongoose');
const Pelicula = require('../models/Pelicula');
const Sala = require('../models/Sala');
const Funcion = require('../models/Funcion');
const Compra = require('../models/Compra');
const { ErrorNegocio } = require('../servicioCompras');

const router = express.Router();
const LIMPIEZA_MIN = 15; // minutos entre funciones para limpiar la sala

router.use((req, res, next) => {
  if (req.get('x-admin-key') !== (process.env.ADMIN_KEY || 'admin123')) {
    return res.status(401).json({ error: 'Clave de administrador incorrecta' });
  }
  next();
});

router.get('/peliculas', async (req, res) => res.json(await Pelicula.find().sort({ titulo: 1 })));
router.post('/peliculas', async (req, res) => res.status(201).json(await Pelicula.create(req.body)));
router.patch('/peliculas/:id', async (req, res) => {
  const p = await Pelicula.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!p) throw new ErrorNegocio('Película no encontrada', 404);
  res.json(p);
});

router.get('/salas', async (req, res) => res.json(await Sala.find().sort({ nombre: 1 })));
router.post('/salas', async (req, res) => res.status(201).json(await Sala.create(req.body)));

router.post('/funciones', async (req, res) => {
  const { peliculaId, salaId, inicio, precio, idioma, formato } = req.body;
  if (!mongoose.isValidObjectId(peliculaId) || !mongoose.isValidObjectId(salaId)) throw new ErrorNegocio('Película o sala inválida');
  const [pelicula, sala] = await Promise.all([Pelicula.findById(peliculaId), Sala.findById(salaId)]);
  if (!pelicula || !sala) throw new ErrorNegocio('Película o sala no encontrada', 404);

  const ini = new Date(inicio);
  if (isNaN(ini)) throw new ErrorNegocio('Fecha de inicio inválida');
  if (ini <= new Date()) throw new ErrorNegocio('La función debe ser en el futuro');
  const fin = new Date(ini.getTime() + pelicula.duracionMin * 60000);

  // Evitar que dos funciones se traslapen en la misma sala
  const margen = LIMPIEZA_MIN * 60000;
  const choque = await Funcion.findOne({
    sala: sala._id,
    inicio: { $lt: new Date(fin.getTime() + margen) },
    fin: { $gt: new Date(ini.getTime() - margen) },
  }).populate('pelicula', 'titulo');
  if (choque) {
    throw new ErrorNegocio(`La sala está ocupada por "${choque.pelicula.titulo}" (${choque.inicio.toLocaleString('es-MX')})`, 409);
  }

  const f = await Funcion.create({ pelicula: pelicula._id, sala: sala._id, inicio: ini, fin, precio, idioma, formato });
  res.status(201).json(f);
});

router.delete('/funciones/:id', async (req, res) => {
  const vendidas = await Compra.countDocuments({ funcion: req.params.id, estado: 'pagada' });
  if (vendidas) throw new ErrorNegocio('No se puede eliminar: la función tiene boletos vendidos', 409);
  const r = await Funcion.findByIdAndDelete(req.params.id);
  if (!r) throw new ErrorNegocio('Función no encontrada', 404);
  res.json({ ok: true });
});

// Reporte de ventas por función (pipeline de agregación de MongoDB)
router.get('/reporte', async (req, res) => {
  const reporte = await Compra.aggregate([
    { $match: { estado: 'pagada' } },
    { $group: { _id: '$funcion', boletos: { $sum: { $size: '$boletos' } }, ingresos: { $sum: '$total' }, compras: { $sum: 1 } } },
    { $lookup: { from: 'funcions', localField: '_id', foreignField: '_id', as: 'funcion' } },
    { $unwind: '$funcion' },
    { $lookup: { from: 'peliculas', localField: 'funcion.pelicula', foreignField: '_id', as: 'pelicula' } },
    { $lookup: { from: 'salas', localField: 'funcion.sala', foreignField: '_id', as: 'sala' } },
    { $unwind: '$pelicula' },
    { $unwind: '$sala' },
    {
      $project: {
        _id: 0,
        funcionId: '$_id',
        pelicula: '$pelicula.titulo',
        sala: '$sala.nombre',
        inicio: '$funcion.inicio',
        compras: 1,
        boletos: 1,
        ingresos: 1,
        ocupacion: {
          $round: [
            { $multiply: [100, { $divide: ['$boletos', { $subtract: [{ $multiply: ['$sala.filas', '$sala.asientosPorFila'] }, { $size: '$sala.asientosDeshabilitados' }] }] }] },
            1,
          ],
        },
      },
    },
    { $sort: { inicio: 1 } },
  ]);
  const totales = reporte.reduce((t, r) => ({ boletos: t.boletos + r.boletos, ingresos: t.ingresos + r.ingresos }), { boletos: 0, ingresos: 0 });
  res.json({ totales, funciones: reporte });
});

module.exports = router;
