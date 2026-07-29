/* Jeu d'icônes SVG, traits ultra-fins (1.25), dessinées à la main.
   Remplace les emojis : une interface premium n'utilise pas d'emojis
   comme iconographie. Toutes les icônes partagent la même grille 24×24,
   le même poids de trait et des terminaisons arrondies. */

'use strict';

const ICONS = {
  target:    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none"/>',
  cpu:       '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/><rect x="10" y="10" width="4" height="4" rx="1.2"/><path d="M10 2.8v3.7M14 2.8v3.7M10 17.5v3.7M14 17.5v3.7M2.8 10h3.7M2.8 14h3.7M17.5 10h3.7M17.5 14h3.7"/>',
  globe:     '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5z"/>',
  calendar:  '<rect x="3.5" y="5.2" width="17" height="15.3" rx="3.2"/><path d="M8 2.8v4.6M16 2.8v4.6M3.5 10.2h17"/>',
  chart:     '<path d="M4 3.8v16.4h16.2"/><path d="M7.6 15.4l3.6-4.2 3 2.6 4.6-6.2"/>',
  book:      '<path d="M4 4.6h5.4A2.6 2.6 0 0 1 12 7.2v12.9a2.1 2.1 0 0 0-2.1-2.1H4z"/><path d="M20 4.6h-5.4A2.6 2.6 0 0 0 12 7.2v12.9a2.1 2.1 0 0 1 2.1-2.1H20z"/>',
  calculator:'<rect x="5.2" y="3" width="13.6" height="18" rx="3.2"/><path d="M8.6 7.2h6.8"/><path d="M9 11.6h.01M12 11.6h.01M15 11.6h.01M9 15.4h.01M12 15.4h.01M15 15.4h.01"/>',
  scale:     '<path d="M12 4.2v15.6M7.4 19.8h9.2M12 6.4L6 8.2M12 6.4l6 1.8"/><path d="M2.9 13.1l3.1-4.5 3.1 4.5a3.1 3.1 0 0 1-6.2 0z"/><path d="M14.9 13.1L18 8.6l3.1 4.5a3.1 3.1 0 0 1-6.2 0z"/>',
  branch:    '<circle cx="6.2" cy="6" r="2.4"/><circle cx="6.2" cy="18" r="2.4"/><circle cx="17.8" cy="12" r="2.4"/><path d="M6.2 8.4v7.2M8.6 6h3.6a3.2 3.2 0 0 1 3.2 3.2v.6M8.6 18h3.6a3.2 3.2 0 0 0 3.2-3.2v-.6"/>',
  pen:       '<path d="M4.2 19.8l1.1-4.2L16 4.9a2.2 2.2 0 0 1 3.1 3.1L8.4 18.7z"/><path d="M14.6 6.3l3.1 3.1"/>',
  orbit:     '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="8.6" ry="4.3"/><ellipse cx="12" cy="12" rx="4.3" ry="8.6"/>',
  flag:      '<path d="M5.4 21V3.4"/><path d="M5.4 4.6h11.2l-2.1 3.6 2.1 3.6H5.4"/>',
  bolt:      '<path d="M13.4 3L5.2 13.6h5.9L10.6 21l8.2-10.6h-5.9z"/>',
  headphones:'<path d="M4 14.2v-2.1a8 8 0 0 1 16 0v2.1"/><rect x="2.8" y="13.4" width="4.2" height="7.2" rx="2.1"/><rect x="17" y="13.4" width="4.2" height="7.2" rx="2.1"/>',
  image:     '<rect x="3.5" y="4.6" width="17" height="14.8" rx="3.2"/><circle cx="9" cy="10" r="1.5"/><path d="M4.2 17.4l4.8-4.6 3.4 2.9 3.1-2.6 4.7 4.3"/>',
  cards:     '<rect x="7.4" y="3.4" width="13.2" height="13.2" rx="3.2"/><path d="M16.6 20.6H8.2a4.4 4.4 0 0 1-4.4-4.4V7.8"/>',
  note:      '<rect x="4.6" y="3.4" width="14.8" height="17.2" rx="3.2"/><path d="M8.4 8.4h7.2M8.4 12.4h7.2M8.4 16.4h4"/>',
  doc:       '<path d="M13.6 3.4H7.2a2.6 2.6 0 0 0-2.6 2.6v12a2.6 2.6 0 0 0 2.6 2.6h9.6a2.6 2.6 0 0 0 2.6-2.6V9.4z"/><path d="M13.6 3.4v6h5.8"/>',
  cap:       '<path d="M2.6 8.6L12 4.4l9.4 4.2-9.4 4.2z"/><path d="M6.6 10.6v4.8c0 1.6 2.4 3 5.4 3s5.4-1.4 5.4-3v-4.8"/><path d="M21.4 8.6v6"/>',
  /* Roue dentée pleine (et non un cercle à rayons, qui se confondrait
     avec l'icône soleil de la bascule de thème à petite taille). */
  gear:      '<circle cx="12" cy="12" r="3.1"/><path d="M19.1 14.6a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.84 2.84l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56v.17a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.84-2.84l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H2.6a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.84-2.84l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 9.7 3.19V3.02a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.84 2.84l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03h.17a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z"/>',
  cloud:     '<path d="M7.2 18.4h9.4a4.1 4.1 0 0 0 .4-8.2 6.1 6.1 0 0 0-11.8 1.6 3.6 3.6 0 0 0 2 6.6z"/>',
  volume:    '<path d="M4 9.4h3.1L11.6 6v12L7.1 14.6H4z"/><path d="M15 9.6a3.6 3.6 0 0 1 0 4.8"/><path d="M17.6 7a7.2 7.2 0 0 1 0 10"/>',
  play:      '<path d="M7.4 4.6L19 12 7.4 19.4z"/>',
  bulb:      '<path d="M9.2 17.2h5.6M10.2 20.4h3.6"/><path d="M12 3.2a6.1 6.1 0 0 0-3.6 11v3.0h7.2v-3.0A6.1 6.1 0 0 0 12 3.2z"/>',
  check:     '<path d="M4.6 12.6l4.9 4.9L19.4 6.6"/>',
  close:     '<path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8"/>',
  arrow:     '<path d="M6.8 17.2L17.2 6.8"/><path d="M8.6 6.8h8.6v8.6"/>',
  repeat:    '<path d="M3.8 11.2A7.2 7.2 0 0 1 11 4h5.6"/><path d="M14.2 1.6l2.9 2.4-2.9 2.4"/><path d="M20.2 12.8A7.2 7.2 0 0 1 13 20H7.4"/><path d="M9.8 22.4L6.9 20l2.9-2.4"/>',
  coffee:    '<path d="M4.2 9.2h13v5.9a4.2 4.2 0 0 1-4.2 4.2H8.4a4.2 4.2 0 0 1-4.2-4.2z"/><path d="M17.2 10.6h1.4a2.6 2.6 0 0 1 0 5.2h-1.4"/><path d="M7.6 3.2v2.6M11.4 3.2v2.6"/>',
  trash:     '<path d="M4.6 6.6h14.8"/><path d="M9.2 6.6V4.4h5.6v2.2"/><path d="M6.8 6.6l.9 13h8.6l.9-13"/>',
  send:      '<path d="M20.4 3.6L3.6 10.4l6.6 2.9 2.9 6.6z"/><path d="M10.2 13.3l4.4-4.4"/>',
  clock:     '<circle cx="12" cy="12" r="8.4"/><path d="M12 6.8v5.4l3.6 2.1"/>',
  sun:       '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2.6M12 19v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M2.4 12h2.6M19 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9"/>',
  moon:      '<path d="M20.4 14.2A8.6 8.6 0 1 1 9.8 3.6a6.9 6.9 0 0 0 10.6 10.6z"/>'
};

// Rend une icône. Taille en px, hérite de la couleur du texte parent.
function ic(name, size = 20) {
  const p = ICONS[name];
  if (!p) return '';
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
}

// Icônes des sous-tests Tage Mage et des fiches méthode (plus d'emojis).
const TM_ICON = {
  comprehension: 'book', calcul: 'calculator', raisonnement: 'scale',
  conditions: 'branch', expression: 'pen', logique: 'orbit'
};
const METHOD_ICON = Object.assign({}, TM_ICON, {
  'toeic-part5': 'note', 'toeic-listening': 'headphones', 'toeic-reading': 'doc'
});
