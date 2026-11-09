const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const publico = require('./routes/publico');
const admin = require('./routes/admin');

// Express 4 no captura errores de funciones async: se envuelven todas las rutas
for (const router of [publico, admin]) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const l of layer.route.stack) {
      const fn = l.handle;
      l.handle = (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
    }
  }
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', publico);
app.use('/api/admin', admin);

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message, ...(err.asientosNoDisponibles && { asientosNoDisponibles: err.asientosNoDisponibles }) });
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 11000) return res.status(409).json({ error: 'Registro duplicado' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
