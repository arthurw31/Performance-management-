/* Orchestration des transitions (transitions.dev).
   - 19 · tilt 3D vers le pointeur, avec reflet suivi au curseur
   - 26 · compteur à rouleaux (0-9) avec flou directionnel vertical
   - 16 · pilule glissante de la navigation
   Tout est guardé par prefers-reduced-motion. */

'use strict';

const MOTION_REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- 19. Tilt 3D + reflet ---------- */

// Le pointeur est suivi sur le wrapper plat (.t-tilt) qui ne tourne jamais :
// si on écoutait la carte qui pivote, ses bords glisseraient sous le curseur
// et le survol clignoterait près des bordures.
const TILT_MAX = 12; // degrés au bord de la carte

function tiltInit(root = document) {
  root.querySelectorAll('.t-tilt:not([data-tilt])').forEach(tilt => {
    tilt.dataset.tilt = '1';
    const card = tilt.querySelector('.t-tilt-card');
    if (!card) return;

    const reset = () => {
      tilt.classList.remove('is-hover');
      card.classList.remove('is-tilting');
      card.style.setProperty('--tilt-rx', '0deg');
      card.style.setProperty('--tilt-ry', '0deg');
    };

    const track = e => {
      if (MOTION_REDUCE.matches) return;
      const r = tilt.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      tilt.classList.add('is-hover');
      card.classList.add('is-tilting');
      card.style.setProperty('--tilt-ry', ((px - 0.5) * TILT_MAX).toFixed(2) + 'deg');
      card.style.setProperty('--tilt-rx', ((0.5 - py) * TILT_MAX).toFixed(2) + 'deg');
      card.style.setProperty('--tilt-gx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--tilt-gy', (py * 100).toFixed(1) + '%');
    };

    tilt.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') {
        try { tilt.setPointerCapture(e.pointerId); } catch (_) { /* ignoré */ }
      }
    });
    tilt.addEventListener('pointermove', track);
    tilt.addEventListener('pointerup', reset);
    tilt.addEventListener('pointercancel', reset);
    tilt.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') reset(); });
  });
}

/* ---------- 26. Compteur à rouleaux ---------- */

// Construit une colonne par chiffre : une bande verticale de 0 à 9 que l'on
// translate de (tours × 10 + chiffre) cellules. Le flou est un feGaussianBlur
// SVG vertical uniquement — un blur() CSS baverait aussi horizontalement.
function reelRender(el, value, opts = {}) {
  const digits = String(value).split('');
  const spins = opts.spins != null ? opts.spins : 3;
  el.innerHTML = '';

  if (MOTION_REDUCE.matches) { el.textContent = value; return; }

  digits.forEach((d, col) => {
    const wrap = document.createElement('div');
    wrap.className = 't-reel-col';
    const strip = document.createElement('div');
    strip.className = 't-reel-strip';
    // (spins + 1) passages de 0-9 : de quoi tourner avant d'atterrir.
    for (let s = 0; s <= spins; s++) {
      for (let n = 0; n <= 9; n++) {
        const cell = document.createElement('div');
        cell.className = 't-reel-digit';
        cell.textContent = n;
        strip.appendChild(cell);
      }
    }
    wrap.appendChild(strip);
    el.appendChild(wrap);

    const cellH = wrap.getBoundingClientRect().height || 1;
    const target = -(spins * 10 + Number(d)) * cellH;
    const stagger = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--reel-stagger'), 10) || 90;
    const delay = col * stagger;

    strip.style.transform = 'translateY(0px)';
    strip.style.filter = `url(#reel-blur-${col % 4})`;
    requestAnimationFrame(() => {
      strip.style.transition = `transform var(--reel-dur) var(--reel-ease) ${delay}ms`;
      strip.style.transform = `translateY(${target}px)`;
    });

    // Décroissance du flou sur la fenêtre propre à cette colonne.
    const dur = 1500;
    const start = performance.now() + delay;
    const filt = document.querySelector(`#reel-blur-${col % 4} feGaussianBlur`);
    if (!filt) return;
    const decay = now => {
      const t = Math.min(1, Math.max(0, (now - start) / dur));
      const dev = 3 * (1 - t) * (1 - t);
      filt.setAttribute('stdDeviation', `0 ${dev.toFixed(2)}`);
      if (t < 1) requestAnimationFrame(decay);
      else strip.style.filter = 'none';
    };
    requestAnimationFrame(decay);
  });
}

/* ---------- 16. Pilule glissante de la navigation ---------- */

function navPillSync() {
  const bar = document.querySelector('.topbar');
  const pill = document.getElementById('nav-pill');
  if (!bar || !pill) return;
  const active = bar.querySelector('.navlink.active');
  if (!active) { pill.classList.remove('ready'); return; }
  const r = active.getBoundingClientRect();
  const b = bar.getBoundingClientRect();
  pill.style.width = r.width + 'px';
  pill.style.transform = `translateX(${r.left - b.left + bar.scrollLeft}px)`;
  pill.classList.add('ready');
}

window.addEventListener('resize', navPillSync);
