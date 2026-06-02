// Official kit photos sourced from olympics.com (FIFA World Cup 2026 kits article).
// Keyed by team slug. Teams not yet listed fall back to the SVG Jersey render.

const cdn = (id: string) =>
  `https://img.olympics.com/images/image/private/t_s_16_9_g_auto/t_s_w1460/f_auto/primary/${id}`;

export type KitImageSet = {
  home?: string;
  away?: string;
  third?: string;
};

export const KIT_IMAGES: Record<string, KitImageSet> = {
  algeria: { home: cdn("yk4xey4ser0lr4ebhooo"), away: cdn("ztgvrdyhy6utri4nei0o") },
  argentina: { home: cdn("vjnnyuj1fmjmw43sy6i0"), away: cdn("mbsnx7l7f0d8pir0pbmf") },
  australia: { home: cdn("ncwgnhovwzbppfm4kva5"), away: cdn("kf6qmjhggjve6js3wm4b") },
  austria: { home: cdn("ju02ldsqzngtyljdax8t"), away: cdn("senxnvtoo3ikdbjc1bm5") },
  belgium: { home: cdn("zndkyivoubtwb9zrys9e"), away: cdn("ij6phb5rhng1rrbcn5tm") },
  "bosnia-herzegovina": { home: cdn("bvm7b7msifsf8eftnujv") },
  brazil: { home: cdn("fwnsmsel18ntghyybimv"), away: cdn("qrjzdlosfewyr0hlaw9v") },
  "cabo-verde": { home: cdn("flgd5yerbq1yjryfcpzf"), away: cdn("yrhjv0gdljyin6drnkh9") },
  canada: { home: cdn("yljvzg9zw4el3aywjwe0"), away: cdn("m51czre0bdnoebtit0qo") },
  colombia: { home: cdn("h8aekdaep7rar2fmolt4"), away: cdn("xamovce4u5nbcz7j52eh") },
  "cote-divoire": { home: cdn("uvp3ngydpbfo8atxbxgo"), away: cdn("wihnbdplqu61cp6c1jeb") },
  croatia: { home: cdn("mcmgpow5acrce5axuqtl") },
  curacao: { away: cdn("j3c7amskdzuxlfoqpezc") },
  czechia: { home: cdn("tuosgsyfmqnhoqzvkdfa"), away: cdn("l9zyp0iqg4htlx8gpyov") },
  // DR Congo not in this dataset's slug list
  ecuador: { home: cdn("jw6grlqx6hv635fomolv") },
};

export const getKitImages = (slug: string): KitImageSet => KIT_IMAGES[slug] ?? {};
