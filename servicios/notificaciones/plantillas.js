// Arma los correos que se envían al cliente a partir de un evento.
// Cada boleto lleva un código QR con su código, que el cine escanearía en la entrada.
const QRCode = require('qrcode');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const dinero = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const fecha = (d) =>
  new Date(d).toLocaleString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: process.env.TZ || 'America/Mexico_City',
  });

function marco(titulo, contenido) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#f2f2f2">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;border-bottom:3px solid #ff7a00;padding-bottom:12px">
      <div style="color:#ff7a00;font-size:11px;letter-spacing:6px;font-weight:bold">CINE</div>
      <div style="font-size:26px;font-weight:800;letter-spacing:1px">ATLÁNTICO</div>
    </div>
    <h1 style="font-size:20px;margin:20px 0 8px">${esc(titulo)}</h1>
    ${contenido}
    <p style="color:#888;font-size:12px;margin-top:24px">Este correo fue enviado automáticamente por el servicio de notificaciones de Cine Atlántico.</p>
  </div></body></html>`;
}

function detalleFuncion(datos) {
  const f = datos.funcion;
  return `<p style="margin:0 0 4px;font-size:16px"><b>${esc(f.pelicula)}</b></p>
  <p style="margin:0 0 16px;color:#bbb">${esc(fecha(f.inicio))} · ${esc(f.sala)} · ${esc(f.formato)} · ${esc(f.idioma)}</p>`;
}

/** Correo de confirmación de compra, con un QR por boleto. */
async function correoCompra(evento) {
  const d = evento.datos;
  const adjuntos = [];
  const boletos = [];
  for (const b of d.boletos) {
    const cid = `qr-${b.codigo}@cine-atlantico`;
    adjuntos.push({ filename: `${b.codigo}.png`, content: await QRCode.toBuffer(b.codigo, { width: 220, margin: 1 }), cid });
    boletos.push(`<td style="background:#fff;color:#111;border-radius:10px;border-left:6px dashed #ff7a00;padding:12px;text-align:center;width:50%">
      <div style="font-size:28px;font-weight:800">${esc(b.asiento)}${b.vip ? ' <span style="font-size:12px">VIP</span>' : ''}</div>
      <img src="cid:${cid}" width="140" height="140" alt="Código QR del boleto ${esc(b.codigo)}">
      <div style="font-family:monospace;font-size:12px">${esc(b.codigo)}</div>
      <div style="font-size:13px">${dinero(b.precio)}</div></td>`);
  }
  // Dos boletos por fila
  const filas = [];
  for (let i = 0; i < boletos.length; i += 2) filas.push(`<tr>${boletos[i]}${boletos[i + 1] || '<td></td>'}</tr>`);

  return {
    to: `${d.cliente.nombre} <${d.cliente.email}>`,
    subject: `Tus boletos para ${d.funcion.pelicula} · Compra ${d.codigo}`,
    html: marco(
      `¡Gracias por tu compra, ${d.cliente.nombre}!`,
      `${detalleFuncion(d)}
      <p>Código de compra: <b style="color:#ff7a00">${esc(d.codigo)}</b> · Total: <b>${dinero(d.total)}</b></p>
      <p>Presenta el código QR de cada boleto en la entrada de la sala.</p>
      <table role="presentation" cellspacing="8" style="width:100%">${filas.join('')}</table>`
    ),
    text: `Compra ${d.codigo}: ${d.boletos.length} boleto(s) para ${d.funcion.pelicula}, ${fecha(d.funcion.inicio)}, ${d.funcion.sala}. Asientos: ${d.boletos
      .map((b) => b.asiento)
      .join(', ')}. Total: ${dinero(d.total)}.`,
    attachments: adjuntos,
  };
}

/** Correo de confirmación de cancelación. */
function correoCancelacion(evento) {
  const d = evento.datos;
  const asientos = d.boletos.map((b) => b.asiento).join(', ');
  return {
    to: `${d.cliente.nombre} <${d.cliente.email}>`,
    subject: `Compra ${d.codigo} cancelada`,
    html: marco(
      'Tu compra fue cancelada',
      `${detalleFuncion(d)}
      <p>La compra <b style="color:#ff7a00">${esc(d.codigo)}</b> quedó cancelada y los asientos <b>${esc(asientos)}</b> vuelven a estar disponibles.</p>`
    ),
    text: `La compra ${d.codigo} para ${d.funcion.pelicula} fue cancelada. Asientos liberados: ${asientos}.`,
  };
}

module.exports = { correoCompra, correoCancelacion };
