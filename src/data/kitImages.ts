// Official 2026 World Cup kits sourced from footballkitarchive.com.
// Keyed by team slug (matches src/data/wc26.ts). Teams without an entry fall
// back to the stylized SVG Jersey render.

const fka = (path: string) => `https://www.footballkitarchive.com${path}`;

export type KitImageSet = {
  home?: string;
  away?: string;
  third?: string;
};

export const KIT_IMAGES: Record<string, KitImageSet> = {
  argentina: {
    home: fka("/cdn/2025/11/06/a1SELcUGLTc6f3n-small/argentina-2026-home-kit.jpg"),
    away: fka("/cdn/2026/04/27/JOFIBByEzQQnFjz-small/argentina-2026-away-kit.jpg"),
  },
  australia: {
    home: fka("/cdn/2026/03/23/M8W39CCXFMIRTs8-small/australia-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/31/t7vSzChigoadgTH-small/australia-2026-away-kit.jpg"),
  },
  austria: {
    home: fka("/cdn/2025/12/03/zRd4xpF2HJmuxEB-small/austria-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/24/F6vPKCY7HC99bvL-small/austria-2026-away-kit.jpg"),
  },
  belgium: {
    away: fka("/cdn/2026/05/07/HWUyNAoNPBWjDMH-small/belgium-2026-away-kit.jpg"),
  },
  "bosnia-herzegovina": {
    home: fka("/cdn/2026/05/31/szkKYkCKekBDSHn-small/bosnia-and-herzegovina-2026-home-kit.jpg"),
  },
  brazil: {
    home: fka("/cdn/2026/03/24/MKfgrcxSaeHiOmw-small/brazil-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/17/XQqDXoBY5hwzZgu-small/brazil-2026-away-kit.jpg"),
  },
  "congo-dr": {
    home: fka("/cdn/2025/12/22/4CW6K1u6D7MFYQO-small/democratic-republic-of-the-congo-2026-home-kit.jpg"),
  },
  "cote-divoire": {
    home: fka("/cdn/2026/03/20/qI5jY00N25fq0WE-small/ivory-coast-2026-home-kit.jpg"),
  },
  croatia: {
    home: fka("/cdn/2026/03/23/xAOV4mTxZrLQzqx-small/croatia-2026-home-kit.jpg"),
  },
  curacao: {
    home: fka("/cdn/2026/05/23/plrBm379WP1k7SK-small/curacao-2026-home-kit.jpg"),
    away: fka("/cdn/2026/05/19/Ap1Ma735duBPC12-small/curacao-2026-away-kit.jpg"),
  },
  czechia: {
    home: fka("/cdn/2025/12/03/OhbE5745JHVLsqV-small/czech-republic-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/20/k44Q4klnPT1CAZJ-small/czech-republic-2026-away-kit.jpg"),
  },
  egypt: {
    home: fka("/cdn/2026/03/20/dyZF7pFy6vA2nIW-small/egypt-2026-home-kit.jpg"),
  },
  england: {
    home: fka("/cdn/2026/03/23/8uZTYg8ufKQzEdA-small/england-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/23/1G17G8r7fpf670H-small/england-2026-away-kit.jpg"),
  },
  france: {
    home: fka("/cdn/2026/03/23/RZEA8txP0cgeKM7-small/france-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/23/mc5zVTSjeE4BuMI-small/france-2026-away-kit.jpg"),
  },
  germany: {
    home: fka("/cdn/2026/05/26/2bjGnu0N4pXNmbF-small/germany-2026-home-kit.jpg"),
    away: fka("/cdn/2026/04/27/t3G6Mh2wc1BgVKc-small/germany-2026-away-kit.jpg"),
    third: fka("/cdn/2026/05/04/ArubCk7qMm5UPC2-small/germany-2026-third-kit.jpg"),
  },
  ghana: {
    home: fka("/cdn/2026/03/20/wRFISzsYsw4tzGF-small/ghana-2026-home-kit.jpg"),
  },
  haiti: {
    away: fka("/cdn/2026/04/01/540Qc5fqNIKKGv7-small/haiti-2026-away-kit.jpg"),
  },
  iran: {
    home: fka("/cdn/2026/05/26/VGBHsmrziYEWG8M-small/iran-2026-home-kit.jpg"),
    away: fka("/cdn/2026/05/14/Xyc9IBmrSP3sMdF-small/iran-2026-away-kit.jpg"),
  },
  japan: {
    home: fka("/cdn/2026/05/26/9ph59lnLxXQtvZ3-small/japan-2026-home-kit.jpg"),
    away: fka("/cdn/2026/04/28/B5aOOVlfjruM4WR-small/japan-2026-away-kit.jpg"),
  },
  jordan: {
    third: fka("/cdn/2026/05/19/KWHxLHtCNokH5ij-small/jordan-2026-third-kit.jpg"),
  },
  "korea-republic": {
    home: fka("/cdn/2026/03/19/iVZJxWQVmgvfXDM-small/south-korea-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/19/6xVd0X0oElJBKET-small/south-korea-2026-away-kit.jpg"),
  },
  mexico: {
    home: fka("/cdn/2026/05/26/FOhmRemrvSSDflc-small/mexico-2026-home-kit.jpg"),
    third: fka("/cdn/2026/05/11/4J3z5Tojcg5SiwR-small/mexico-2026-third-kit.jpg"),
  },
  morocco: {
    home: fka("/cdn/2026/03/24/ZdP7UJwggEU1gve-small/morocco-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/20/hhcUgDNuaXjm8Kt-small/morocco-2026-away-kit.jpg"),
  },
  netherlands: {
    home: fka("/cdn/2026/03/23/mwX10ulNGNJ1Goh-small/netherlands-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/23/wm5d47WjYpQJ6eo-small/netherlands-2026-away-kit.jpg"),
  },
  "new-zealand": {
    home: fka("/cdn/2026/03/20/Jo7MnKvuJdc7NAH-small/new-zealand-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/20/l6OOV79Aqhz9rtt-small/new-zealand-2026-away-kit.jpg"),
  },
  norway: {
    home: fka("/cdn/2026/03/19/FtuuzZo3z3w4MOw-small/norway-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/19/CnEv9zo0ziHL04G-small/norway-2026-away-kit.jpg"),
  },
  panama: {
    away: fka("/cdn/2026/04/24/rpmmUQTaq8O8tu4-small/panama-2026-away-kit.jpg"),
  },
  paraguay: {
    home: fka("/cdn/2026/03/20/nOTMyjJSMlO3I6h-small/paraguay-2026-home-kit.jpg"),
  },
  portugal: {
    home: fka("/cdn/2025/12/05/UKRf3T0qRYuUrx1-small/portugal-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/24/p2N2gydRM0VLlW0-small/portugal-2026-away-kit.jpg"),
  },
  qatar: {
    away: fka("/cdn/2026/05/07/uWRZa2TYjs9ARuT-small/qatar-2026-away-kit.jpg"),
  },
  "saudi-arabia": {
    home: fka("/cdn/2025/11/06/zOzwgy8KFqgqEcv-small/saudi-arabia-2026-home-kit.jpg"),
    away: fka("/cdn/2026/05/07/rOhglc8k4YRHHsV-small/saudi-arabia-2026-away-kit.jpg"),
  },
  senegal: {
    home: fka("/cdn/2026/03/20/qwV95velHj325sC-small/senegal-2026-home-kit.jpg"),
  },
  "south-africa": {
    away: fka("/cdn/2026/03/20/plLoFaSrHds9GAt-small/south-africa-2026-away-kit.jpg"),
  },
  spain: {
    home: fka("/cdn/2026/05/26/RL4VgSr3sj6HeJa-small/spain-2026-home-kit.jpg"),
    away: fka("/cdn/2026/04/27/bG81qFGoW6iqmes-small/spain-2026-away-kit.jpg"),
  },
  switzerland: {
    home: fka("/cdn/2025/12/03/ZHhsHDPZayHTTPh-small/switzerland-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/24/ZqaVuV6v0qMFB7h-small/switzerland-2026-away-kit.jpg"),
  },
  uruguay: {
    home: fka("/cdn/2026/04/11/IvtWf6h2xj9RMmv-small/uruguay-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/21/CB6ak57eCU3EGXK-small/uruguay-2026-away-kit.jpg"),
  },
  usa: {
    home: fka("/cdn/2026/03/16/LDR5lUs11D3vZhT-small/usa-2026-home-kit.jpg"),
    away: fka("/cdn/2026/03/21/aPbmuLu870UfCox-small/usa-2026-away-kit.jpg"),
  },
};

export const getKitImages = (slug: string): KitImageSet => KIT_IMAGES[slug] ?? {};
