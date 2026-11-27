const { Schema, model } = require('mongoose');

// Cada boleto va embebido dentro de la compra (modelo de documento):
// una sola lectura recupera la compra completa con todos sus boletos.
const boletoSchema = new Schema(
  {
    codigo: { type: String, required: true },
    asiento: { type: String, required: true },
    precio: { type: Number, required: true },
    vip: { type: Boolean, default: false },
  },
  { _id: false }
);

const compraSchema = new Schema(
  {
    codigo: { type: String, required: true, unique: true },
    funcion: { type: Schema.Types.ObjectId, ref: 'Funcion', required: true },
    cliente: {
      nombre: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
    },
    boletos: { type: [boletoSchema], validate: (v) => v.length > 0 },
    total: { type: Number, required: true },
    metodoPago: { type: String, enum: ['tarjeta', 'efectivo'], default: 'tarjeta' },
    asignacion: { type: String, enum: ['manual', 'automatica'], default: 'manual' },
    estado: { type: String, enum: ['pagada', 'cancelada'], default: 'pagada' },
    canceladaEn: Date,
  },
  { timestamps: true }
);

compraSchema.index({ 'cliente.email': 1 });
compraSchema.index({ funcion: 1 });

module.exports = model('Compra', compraSchema);
