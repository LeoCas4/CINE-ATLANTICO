const { Schema, model } = require('mongoose');

const funcionSchema = new Schema(
  {
    pelicula: { type: Schema.Types.ObjectId, ref: 'Pelicula', required: true },
    sala: { type: Schema.Types.ObjectId, ref: 'Sala', required: true },
    inicio: { type: Date, required: true },
    fin: { type: Date, required: true },
    precio: { type: Number, required: true, min: 0 },
    idioma: { type: String, enum: ['Español', 'Subtitulada'], default: 'Español' },
    formato: { type: String, enum: ['2D', '3D', 'IMAX'], default: '2D' },
    // Lista de asientos vendidos. Se actualiza de forma atómica para evitar
    // que dos personas compren el mismo asiento al mismo tiempo.
    asientosOcupados: { type: [String], default: [] },
  },
  { timestamps: true }
);

funcionSchema.index({ sala: 1, inicio: 1 });
funcionSchema.index({ inicio: 1 });

module.exports = model('Funcion', funcionSchema);
