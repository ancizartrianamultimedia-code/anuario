/* ==========================================================
   JAVASCRIPT DEL ANUARIO
   1) Fotos de relleno   2) Buscar   3) Pasar páginas como un libro
   4) Efecto parallax
   ========================================================== */

// Imágenes de relleno cuando todavía no hay foto o firma
const FOTO_VACIA = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">' +
  '<rect width="300" height="400" fill="#dbe6f3"/>' +
  '<circle cx="150" cy="150" r="55" fill="#8aa4c8"/>' +
  '<path d="M50 400c0-90 45-140 100-140s100 50 100 140z" fill="#8aa4c8"/></svg>'
);
const FIRMA_VACIA = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 100"><rect width="350" height="100" fill="#fff"/></svg>'
);

// Elementos de la página
const libro        = document.querySelector('.libro');
const buscador     = document.querySelector('#buscar');
const contador     = document.querySelector('#contador');
const btnAnterior  = document.querySelector('#btn-anterior');
const btnSiguiente = document.querySelector('#btn-siguiente');
const indicador    = document.querySelector('#indicador');

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
let actual = 0;          // posición de la página que se está viendo
let animando = false;    // evita pasar dos páginas a la vez

function paginas() {
  return Array.from(document.querySelectorAll('.estudiante-pagina'));
}

/* ---------- 1) Fotos de relleno ---------- */
function prepararPagina(pagina) {
  const foto = pagina.querySelector('.estudiante-foto');
  foto.addEventListener('error', () => { foto.src = FOTO_VACIA; });
  if (!foto.getAttribute('src')) foto.src = FOTO_VACIA;

  const firma = pagina.querySelector('.estudiante-firma');
  firma.addEventListener('error', () => { firma.src = FIRMA_VACIA; });
  if (!firma.getAttribute('src')) firma.src = FIRMA_VACIA;
}

/* ---------- 2) Buscar: salta a la página del estudiante ---------- */
buscador.addEventListener('input', () => {
  const texto = buscador.value.trim().toLowerCase();
  if (!texto) { buscador.classList.remove('sin-resultado'); return; }
  const i = paginas().findIndex(p =>
    p.querySelector('.estudiante-nombre').textContent.toLowerCase().includes(texto));
  buscador.classList.toggle('sin-resultado', i < 0);
  if (i >= 0) mostrar(i, i > actual ? 1 : -1);
});

/* ==========================================================
   3) PASAR PÁGINAS COMO UN LIBRO
   Solo se ve una página. Al pulsar Siguiente o Anterior:
     1. la página actual recibe una clase de salida (sale-sig / sale-ant)
     2. al terminar, se le añade classList.add('oculto')
     3. la nueva página pierde 'oculto' y recibe una clase de entrada
   Las animaciones están en styles.css (sección 11).
   ========================================================== */

// Actualiza botones, indicador y títulos de sección
function actualizarVista() {
  const total = paginas().length;
  document.querySelectorAll('.seccion').forEach(s => {
    s.classList.toggle('oculto', !s.querySelector('.estudiante-pagina:not(.oculto)'));
  });
  indicador.textContent = 'Página ' + (actual + 1) + ' de ' + total;
  btnAnterior.disabled  = actual === 0;
  btnSiguiente.disabled = actual === total - 1;
  pedirParallax();
}

// direccion: 1 = siguiente, -1 = anterior, 0 = sin animación
function mostrar(nuevo, direccion) {
  const lista = paginas();
  nuevo = Math.max(0, Math.min(nuevo, lista.length - 1));
  const vieja = lista[actual];
  const nueva = lista[nuevo];

  if (!direccion || reducirMovimiento.matches || !vieja || vieja === nueva) {
    lista.forEach(p => p.classList.add('oculto'));
    nueva.classList.remove('oculto');
    actual = nuevo;
    actualizarVista();
    return;
  }
  if (animando) return;
  animando = true;

  vieja.classList.add(direccion > 0 ? 'sale-sig' : 'sale-ant');
  setTimeout(() => {
    vieja.classList.remove('sale-sig', 'sale-ant');
    vieja.classList.add('oculto');                       // ocultar la actual
    nueva.classList.remove('oculto');                    // mostrar la nueva
    nueva.classList.add(direccion > 0 ? 'entra-sig' : 'entra-ant');
    actual = nuevo;
    actualizarVista();
    if (nueva.getBoundingClientRect().top < 0) nueva.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      nueva.classList.remove('entra-sig', 'entra-ant');
      animando = false;
    }, 450);
  }, 300);
}

function pasar(paso) {
  const destino = actual + paso;
  if (destino < 0 || destino >= paginas().length) return;
  mostrar(destino, paso);
}

btnSiguiente.addEventListener('click', () => pasar(1));
btnAnterior.addEventListener('click', () => pasar(-1));

// Flechas del teclado (no cuando se escribe en el buscador)
document.addEventListener('keydown', e => {
  if (e.target.closest('input')) return;
  if (e.key === 'ArrowRight') pasar(1);
  if (e.key === 'ArrowLeft') pasar(-1);
});

// Deslizar el dedo en el celular
let toqueX = null;
libro.addEventListener('touchstart', e => { toqueX = e.touches[0].clientX; }, { passive: true });
libro.addEventListener('touchend', e => {
  if (toqueX === null) return;
  const dx = e.changedTouches[0].clientX - toqueX;
  toqueX = null;
  if (Math.abs(dx) > 70) pasar(dx < 0 ? 1 : -1);
}, { passive: true });

/* ==========================================================
   4) EFECTO PARALLAX
   - La foto de portada (data-velocidad) baja a una fracción del scroll.
   - Cada foto con su firma y su texto se mueven en sentido contrario,
     según qué tan lejos estén del centro de la pantalla.
   - El fondo rojo se desplaza más lento que la página.
   Se desactiva si la persona pidió "reducir movimiento".
   ========================================================== */
let esperandoFrame = false;

function parallax() {
  esperandoFrame = false;
  const moviles = document.querySelectorAll('[data-velocidad], .estudiante-lateral, .estudiante-info');

  if (reducirMovimiento.matches) {          // sin movimiento: limpiar y salir
    moviles.forEach(el => (el.style.transform = ''));
    document.body.style.setProperty('--fondo-y', '0px');
    return;
  }

  const y = window.scrollY;
  document.body.style.setProperty('--fondo-y', y * 0.25 + 'px');

  document.querySelectorAll('[data-velocidad]').forEach(el => {
    el.style.transform = 'translate3d(0,' + y * el.dataset.velocidad + 'px,0)';
  });

  const centro = window.innerHeight / 2;
  document.querySelectorAll('.estudiante-pagina').forEach(pagina => {
    if (pagina.classList.contains('oculto')) return;
    const caja = pagina.getBoundingClientRect();
    if (caja.bottom < -200 || caja.top > window.innerHeight + 200) return;  // fuera de pantalla
    const distancia = caja.top + caja.height / 2 - centro;
    pagina.querySelector('.estudiante-lateral').style.transform = 'translate3d(0,' + distancia * -0.07 + 'px,0)';
    pagina.querySelector('.estudiante-info').style.transform = 'translate3d(0,' + distancia * 0.03 + 'px,0)';
  });
}

function pedirParallax() {
  if (!esperandoFrame) {                    // un solo cálculo por cuadro
    esperandoFrame = true;
    requestAnimationFrame(parallax);
  }
}
window.addEventListener('scroll', pedirParallax, { passive: true });
window.addEventListener('resize', pedirParallax);
reducirMovimiento.addEventListener('change', pedirParallax);

/* ---------- Inicio ---------- */
paginas().forEach(prepararPagina);
const totalEstudiantes = document.querySelectorAll('#estudiantes .estudiante-pagina').length;
contador.textContent = totalEstudiantes + ' estudiantes';
mostrar(0, 0);
parallax();
