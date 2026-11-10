const { Schema, model } = require('mongoose');

const peliculaSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true },
    sinopsis: { type: String, default: '' },
    genero: { type: String, default: '' },
    clasificacion: { type: String, enum: ['AA', 'A', 'B', 'B15', 'C', 'D'], default: 'B' },
    duracionMin: { type: Number, required: true, min: 1 },
    posterUrl: { type: String, default: '' },
    activa: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('Pelicula', peliculaSchema);
