const $ = (s) => document.querySelector(s);
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const dinero = (n) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const fecha = (d) => new Date(d).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const hora = (d) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const estado = { funcion: null, seleccion: new Set(), modoAuto: false, adminKey: sessionStorage.getItem('adminKey') || '' };

async function api(ruta, opciones = {}) {
  const res = await fetch('/api' + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(estado.adminKey && { 'x-admin-key': estado.adminKey }), ...opciones.headers },
    body: opciones.body && JSON.stringify(opciones.body),
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(datos.error || 'Error de red'), datos, { status: res.status });
  return datos;
}

function aviso(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (error ? ' error' : '');
  t.hidden = false;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => (t.hidden = true), 4000);
}

function mostrar(vista) {
  document.querySelectorAll('.vista').forEach((v) => v.classList.toggle('activa', v.id === vista));
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('activo', b.dataset.vista === vista));
  if (vista === 'cartelera') cargarCartelera();
  window.scrollTo(0, 0);
}
document.querySelectorAll('nav button').forEach((b) => (b.onclick = () => mostrar(b.dataset.vista)));
document.querySelectorAll('[data-ir]').forEach((b) => (b.onclick = () => mostrar(b.dataset.ir)));

// ---------- PÓSTERS ----------
// Si la imagen .jpg no existe, se prueba .png y .webp; si tampoco, se muestra un póster genérico.
function htmlPoster(p, clase = '') {
  return `<div class="poster ${clase}" data-titulo="${esc(p.titulo)}" data-genero="${esc(p.genero)}">
    ${p.posterUrl ? `<img src="${esc(p.posterUrl)}" alt="Póster de ${esc(p.titulo)}" />` : ''}</div>`;
}

function posterGenerico(div) {
  div.innerHTML = `<div class="poster-generico"><img src="logo.svg" alt="" />
    <span class="poster-titulo">${esc(div.dataset.titulo)}</span><span class="poster-genero">${esc(div.dataset.genero)}</span></div>`;
}

function activarPosters(cont) {
  cont.querySelectorAll('.poster').forEach((div) => {
    const img = div.querySelector('img');
    if (!img) return posterGenerico(div);
    const alternativas = /\.jpg$/i.test(img.getAttribute('src')) ? ['.png', '.webp'] : [];
    img.addEventListener('error', () => {
      const siguiente = alternativas.shift();
      if (siguiente) img.src = img.getAttribute('src').replace(/\.\w+$/, siguiente);
      else posterGenerico(div);
    });
  });
}

// ---------- CARTELERA ----------
async function cargarCartelera() {
  const cont = $('#lista-peliculas');
  try {
    const peliculas = await api('/peliculas');
    const conFunciones = peliculas.filter((p) => p.funciones.length);
    if (!conFunciones.length) return (cont.innerHTML = '<p class="vacio">No hay funciones programadas.</p>');
    cont.innerHTML = conFunciones.map((p) => {
      const porDia = {};
      for (const f of p.funciones) {
        let dia = new Date(f.inicio).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
        dia = dia[0].toUpperCase() + dia.slice(1);
        (porDia[dia] ||= []).push(f);
      }
      return `<article class="pelicula">
        ${htmlPoster(p)}
        <div class="pelicula-info">
        <h3>${esc(p.titulo)}</h3>
        <div class="etiquetas"><span class="etiqueta">${esc(p.clasificacion)}</span><span class="etiqueta">${esc(p.genero)}</span><span class="etiqueta">${p.duracionMin} min</span></div>
        <p class="ayuda">${esc(p.sinopsis)}</p>
        ${Object.entries(porDia).map(([dia, fs]) => `<div class="dia"><strong>${dia}</strong><div class="horarios">
          ${fs.map((f) => `<button class="horario" data-funcion="${f._id}" ${f.disponibles ? '' : 'disabled'}>
            ${hora(f.inicio)} · ${f.formato}<small>${esc(f.sala.nombre)} · ${f.idioma} · ${dinero(f.precio)}</small>
            <small>${f.disponibles ? f.disponibles + ' disponibles' : 'AGOTADO'}</small></button>`).join('')}
        </div></div>`).join('')}
        </div>
      </article>`;
    }).join('');
    activarPosters(cont);
    cont.querySelectorAll('[data-funcion]').forEach((b) => (b.onclick = () => abrirFuncion(b.dataset.funcion)));
  } catch (e) {
    cont.innerHTML = `<p class="vacio">No se pudo cargar la cartelera: ${esc(e.message)}</p>`;
  }
}

// ---------- SELECCIÓN DE ASIENTOS ----------
async function abrirFuncion(id, conservarSeleccion = false) {
  try {
    estado.funcion = await api('/funciones/' + id);
  } catch (e) {
    return aviso(e.message, true);
  }
  if (!conservarSeleccion) {
    estado.seleccion.clear();
    estado.modoAuto = false;
  }
  const f = estado.funcion;
  $('#info-funcion').innerHTML = `${htmlPoster(f.pelicula, 'poster-chico')}<div><h2>${esc(f.pelicula.titulo)}</h2>
    <div>${fecha(f.inicio)} · ${esc(f.sala.nombre)} · ${f.formato} · ${f.idioma} · ${dinero(f.precio)} por boleto
    ${f.sala.recargoVip ? ` · VIP +${dinero(f.sala.recargoVip)}` : ''} · <b>${f.disponibles}</b> disponibles</div></div>`;
  activarPosters($('#info-funcion'));
  dibujarMapa();
  mostrar('seleccion');
}

function dibujarMapa(conflictos = []) {
  const { sala, asientosOcupados } = estado.funcion;
  const ocupados = new Set(asientosOcupados);
  const deshab = new Set(sala.asientosDeshabilitados);
  const pasillos = new Set(sala.pasillos);
  let html = '';
  for (let f = 0; f < sala.filas; f++) {
    const letra = LETRAS[f];
    const vip = sala.filasVip.includes(letra);
    html += `<div class="fila"><span class="letra">${letra}</span>`;
    for (let c = 1; c <= sala.asientosPorFila; c++) {
      const cod = letra + c;
      let clase = 'libre';
      if (deshab.has(cod)) clase = 'hueco';
      else if (ocupados.has(cod)) clase = 'ocupado';
      else if (estado.seleccion.has(cod)) clase = 'seleccionado';
      if (vip && clase === 'libre') clase += ' vip';
      if (conflictos.includes(cod)) clase += ' conflicto';
      html += `<button class="asiento ${clase}" data-asiento="${cod}" title="${cod}${vip ? ' (VIP)' : ''}" ${clase.startsWith('libre') || clase.startsWith('seleccionado') ? '' : 'disabled'}>${clase === 'hueco' ? '' : c}</button>`;
      if (pasillos.has(c)) html += '<span class="pasillo"></span>';
    }
    html += `<span class="letra">${letra}</span></div>`;
  }
  $('#mapa').innerHTML = html;
  $('#mapa').querySelectorAll('[data-asiento]:not(:disabled)').forEach((b) => (b.onclick = () => alternarAsiento(b.dataset.asiento)));
  actualizarResumen();
}

function alternarAsiento(cod) {
  if (estado.seleccion.has(cod)) estado.seleccion.delete(cod);
  else if (estado.seleccion.size >= 10) return aviso('Máximo 10 boletos por compra', true);
  else estado.seleccion.add(cod);
  estado.modoAuto = false;
  dibujarMapa();
}

function precioAsiento(cod) {
  const { sala, precio } = estado.funcion;
  return precio + (sala.filasVip.includes(cod[0]) ? sala.recargoVip : 0);
}

function actualizarResumen() {
  const asientos = [...estado.seleccion].sort((a, b) => (a[0] === b[0] ? a.slice(1) - b.slice(1) : a.localeCompare(b)));
  const total = asientos.reduce((s, a) => s + precioAsiento(a), 0);
  $('#resumen').innerHTML = asientos.length
    ? `${asientos.length} boleto(s): <b>${asientos.join(', ')}</b>${estado.modoAuto ? ' <span class="etiqueta">automático</span>' : ''}<div class="total">${dinero(total)}</div>`
    : '<span class="vacio">Ningún asiento seleccionado</span>';
  $('#btn-comprar').disabled = !asientos.length;
}

$('#btn-auto').onclick = async () => {
  const cantidad = Number($('#auto-cantidad').value);
  try {
    const { asientos } = await api(`/funciones/${estado.funcion._id}/sugerencia?cantidad=${cantidad}`);
    estado.seleccion = new Set(asientos);
    estado.modoAuto = true;
    dibujarMapa();
  } catch (e) {
    aviso(e.message, true);
  }
};

$('#form-compra').onsubmit = async (ev) => {
  ev.preventDefault();
  const datos = Object.fromEntries(new FormData(ev.target));
  const btn = $('#btn-comprar');
  btn.disabled = true;
  btn.textContent = 'Procesando…';
  const body = {
    funcionId: estado.funcion._id,
    cliente: { nombre: datos.nombre, email: datos.email },
    metodoPago: datos.metodoPago,
    // En modo automático el servidor vuelve a calcular y reservar atómicamente
    ...(estado.modoAuto ? { cantidad: estado.seleccion.size } : { asientos: [...estado.seleccion] }),
  };
  try {
    const compra = await api('/compras', { method: 'POST', body });
    $('#detalle-compra').innerHTML = renderCompra(compra);
    localStorage.setItem('ultimoEmail', datos.email);
    $('#form-buscar').q.value = datos.email;
    mostrar('confirmacion');
  } catch (e) {
    aviso(e.message, true);
    if (e.status === 409) {
      const tomados = e.asientosNoDisponibles || [];
      tomados.forEach((a) => estado.seleccion.delete(a));
      await abrirFuncion(estado.funcion._id, true);
      dibujarMapa(tomados);
    }
  } finally {
    btn.textContent = 'Comprar';
    actualizarResumen();
  }
};

function renderCompra(c, conCancelar = false) {
  const f = c.funcion;
  return `<div class="compra ${c.estado}">
    <div><b>Compra ${esc(c.codigo)}</b> · <span class="estado-${c.estado}">${c.estado.toUpperCase()}</span> · ${esc(c.cliente.nombre)} (${esc(c.cliente.email)})</div>
    <div class="ayuda">${esc(f.pelicula.titulo)} · ${fecha(f.inicio)} · ${esc(f.sala.nombre)} · ${f.formato} · Total ${dinero(c.total)} · Pago: ${c.metodoPago} · Asignación ${c.asignacion}</div>
    <div class="boletos">${c.boletos.map((b) => `<div class="boleto">
      <div class="ayuda" style="color:#555">${esc(f.pelicula.titulo)}</div>
      <div class="asiento-grande">${b.asiento}${b.vip ? ' <small>VIP</small>' : ''}</div>
      <div>${esc(f.sala.nombre)} · ${fecha(f.inicio)}</div>
      <div>${dinero(b.precio)}</div>
      <code>${esc(b.codigo)}</code></div>`).join('')}</div>
    ${conCancelar && c.estado === 'pagada' && new Date(f.inicio) > new Date() ? `<button class="secundario" data-cancelar="${esc(c.codigo)}">Cancelar compra</button>` : ''}
  </div>`;
}

// ---------- MIS BOLETOS ----------
const formBuscar = $('#form-buscar');
formBuscar.q.value = localStorage.getItem('ultimoEmail') || '';
formBuscar.onsubmit = async (ev) => {
  ev.preventDefault();
  const q = formBuscar.q.value.trim();
  const cont = $('#resultado-busqueda');
  try {
    const compras = q.includes('@') ? await api('/compras?email=' + encodeURIComponent(q)) : [await api('/compras/' + encodeURIComponent(q))];
    cont.innerHTML = compras.length ? compras.map((c) => renderCompra(c, true)).join('') : '<p class="vacio">No hay compras con ese email.</p>';
    cont.querySelectorAll('[data-cancelar]').forEach((b) => (b.onclick = () => cancelarCompra(b.dataset.cancelar)));
  } catch (e) {
    cont.innerHTML = `<p class="vacio">${esc(e.message)}</p>`;
  }
};

async function cancelarCompra(codigo) {
  const email = prompt('Para confirmar, escribe el email con el que compraste:');
  if (!email) return;
  try {
    await api(`/compras/${codigo}/cancelar`, { method: 'POST', body: { email } });
    aviso('Compra cancelada. Los asientos quedaron liberados.');
    formBuscar.requestSubmit();
  } catch (e) {
    aviso(e.message, true);
  }
}

// ---------- ADMIN ----------
async function entrarAdmin() {
  try {
    const [peliculas, salas] = await Promise.all([api('/admin/peliculas'), api('/admin/salas')]);
    sessionStorage.setItem('adminKey', estado.adminKey);
    $('#admin-panel').hidden = false;
    $('#form-funcion').peliculaId.innerHTML = peliculas.map((p) => `<option value="${p._id}">${esc(p.titulo)} (${p.duracionMin} min)</option>`).join('');
    $('#form-funcion').salaId.innerHTML = salas.map((s) => `<option value="${s._id}">${esc(s.nombre)} (${s.filas}×${s.asientosPorFila})</option>`).join('');
    cargarReporte();
  } catch (e) {
    $('#admin-panel').hidden = true;
    aviso(e.message, true);
  }
}
$('#btn-admin-entrar').onclick = () => {
  estado.adminKey = $('#admin-key').value;
  entrarAdmin();
};
if (estado.adminKey) {
  $('#admin-key').value = estado.adminKey;
  entrarAdmin();
}

async function cargarReporte() {
  const { totales, funciones } = await api('/admin/reporte');
  $('#reporte').innerHTML = funciones.length
    ? `<p>Total: <b>${totales.boletos}</b> boletos · <b>${dinero(totales.ingresos)}</b></p>
      <table><tr><th>Película</th><th>Sala</th><th>Función</th><th>Compras</th><th>Boletos</th><th>Ocupación</th><th>Ingresos</th></tr>
      ${funciones.map((r) => `<tr><td>${esc(r.pelicula)}</td><td>${esc(r.sala)}</td><td>${fecha(r.inicio)}</td><td>${r.compras}</td><td>${r.boletos}</td><td>${r.ocupacion}%</td><td>${dinero(r.ingresos)}</td></tr>`).join('')}</table>`
    : '<p class="vacio">Aún no hay ventas.</p>';
}
$('#btn-reporte').onclick = cargarReporte;

const lista = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
function enviarAdmin(form, ruta, transformar) {
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      await api(ruta, { method: 'POST', body: transformar(Object.fromEntries(new FormData(form))) });
      aviso('Guardado correctamente');
      form.reset();
      entrarAdmin();
    } catch (e) {
      aviso(e.message, true);
    }
  };
}
enviarAdmin($('#form-pelicula'), '/admin/peliculas', (d) => ({ ...d, duracionMin: Number(d.duracionMin) }));
enviarAdmin($('#form-funcion'), '/admin/funciones', (d) => ({ ...d, precio: Number(d.precio), inicio: new Date(d.inicio).toISOString() }));
enviarAdmin($('#form-sala'), '/admin/salas', (d) => ({
  ...d,
  filas: Number(d.filas),
  asientosPorFila: Number(d.asientosPorFila),
  recargoVip: Number(d.recargoVip),
  pasillos: lista(d.pasillos).map(Number),
  filasVip: lista(d.filasVip).map((x) => x.toUpperCase()),
}));

cargarCartelera();
