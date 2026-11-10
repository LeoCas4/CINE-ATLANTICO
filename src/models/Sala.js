const { Schema, model } = require('mongoose');

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const salaSchema = new Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true },
    filas: { type: Number, required: true, min: 1, max: 26 },
    asientosPorFila: { type: Number, required: true, min: 1, max: 40 },
    // Columnas después de las cuales hay un pasillo (solo visual), p. ej. [4, 10]
    pasillos: { type: [Number], default: [] },
    // Asientos que no existen o están fuera de servicio, p. ej. ["A1", "A12"]
    asientosDeshabilitados: { type: [String], default: [] },
    // Filas VIP con recargo, p. ej. ["G", "H"]
    filasVip: { type: [String], default: [] },
    recargoVip: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

salaSchema.methods.letrasFilas = function () {
  return LETRAS.slice(0, this.filas).split('');
};

salaSchema.methods.asientoValido = function (codigo) {
  const m = /^([A-Z])(\d{1,2})$/.exec(codigo);
  if (!m) return false;
  const fila = LETRAS.indexOf(m[1]);
  const num = Number(m[2]);
  return (
    fila >= 0 &&
    fila < this.filas &&
    num >= 1 &&
    num <= this.asientosPorFila &&
    !this.asientosDeshabilitados.includes(codigo)
  );
};

salaSchema.methods.capacidad = function () {
  return this.filas * this.asientosPorFila - this.asientosDeshabilitados.length;
};

module.exports = model('Sala', salaSchema);
