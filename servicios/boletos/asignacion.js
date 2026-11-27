// Algoritmo de asignación automática de los "mejores" asientos disponibles.
// Prefiere asientos juntos, en una fila a ~60% del fondo de la sala y
// lo más cerca posible del centro de la pantalla.

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function puntaje(filaIdx, colCentro, sala) {
  const filaIdeal = (sala.filas - 1) * 0.6;
  const colIdeal = (sala.asientosPorFila + 1) / 2;
  return Math.abs(filaIdx - filaIdeal) * 1.5 + Math.abs(colCentro - colIdeal);
}

/**
 * @param {object} sala      documento Sala (filas, asientosPorFila, pasillos, asientosDeshabilitados)
 * @param {string[]} ocupados asientos ya vendidos
 * @param {number} cantidad   número de asientos requeridos
 * @returns {string[]|null}   códigos de asiento, o null si no hay suficientes
 */
function mejoresAsientos(sala, ocupados, cantidad) {
  const noDisponibles = new Set([...ocupados, ...(sala.asientosDeshabilitados || [])]);
  const pasillos = new Set(sala.pasillos || []);
  let mejor = null;

  // 1) Buscar un bloque contiguo en la misma fila (un pasillo rompe el bloque)
  for (let f = 0; f < sala.filas; f++) {
    const letra = LETRAS[f];
    let inicioBloque = 1;
    for (let c = 1; c <= sala.asientosPorFila; c++) {
      if (noDisponibles.has(`${letra}${c}`)) {
        inicioBloque = c + 1;
        continue;
      }
      if (c > 1 && pasillos.has(c - 1) && inicioBloque < c) inicioBloque = c;
      if (c - inicioBloque + 1 >= cantidad) {
        const desde = c - cantidad + 1;
        const p = puntaje(f, (desde + c) / 2, sala);
        if (!mejor || p < mejor.p) {
          mejor = { p, asientos: Array.from({ length: cantidad }, (_, i) => `${letra}${desde + i}`) };
        }
      }
    }
  }
  if (mejor) return mejor.asientos;

  // 2) No hay bloque contiguo: tomar los mejores asientos sueltos
  const libres = [];
  for (let f = 0; f < sala.filas; f++) {
    for (let c = 1; c <= sala.asientosPorFila; c++) {
      const cod = `${LETRAS[f]}${c}`;
      if (!noDisponibles.has(cod)) libres.push({ cod, p: puntaje(f, c, sala) });
    }
  }
  if (libres.length < cantidad) return null;
  return libres.sort((a, b) => a.p - b.p).slice(0, cantidad).map((x) => x.cod);
}

module.exports = { mejoresAsientos };
