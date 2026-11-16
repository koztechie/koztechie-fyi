const CVD_MATRICES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

function toLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function toLab(hex, matrix) {
  const srgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = srgb.map(toLinear);
  const simulated = matrix.map((row) =>
    Math.max(0, Math.min(1, row.reduce((sum, factor, i) => sum + factor * linear[i], 0)))
  );
  const [r, g, b] = simulated;
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (value) => value > 0.008856451679
    ? Math.cbrt(value)
    : 7.787037 * value + 16 / 116;
  const [fx, fy, fz] = [x, y, z].map(f);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE00(first, second) {
  const [L1, a1, b1] = first;
  const [L2, a2, b2] = second;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (a, b) => (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  const h1p = hue(a1p, b1);
  const h2p = hue(a2p, b2);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  const dh = h2p - h1p;
  let dhp;

  if (C1p * C2p === 0) dhp = 0;
  else if (dh > 180) dhp = dh - 360;
  else if (dh < -180) dhp = dh + 360;
  else dhp = dh;

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);
  const Lbar = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbar;

  if (C1p * C2p === 0) hbar = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbar = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbar = (h1p + h2p + 360) / 2;
  else hbar = (h1p + h2p - 360) / 2;

  const T = 1
    - 0.17 * Math.cos((hbar - 30) * Math.PI / 180)
    + 0.24 * Math.cos(2 * hbar * Math.PI / 180)
    + 0.32 * Math.cos((3 * hbar + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hbar - 63) * Math.PI / 180);
  const SL = 1 + 0.015 * (Lbar - 50) ** 2 / Math.sqrt(20 + (Lbar - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7))
    * Math.sin(60 * Math.exp(-(((hbar - 275) / 25) ** 2)) * Math.PI / 180);

  return Math.sqrt(
    (dLp / SL) ** 2
    + (dCp / SC) ** 2
    + (dHp / SH) ** 2
    + RT * (dCp / SC) * (dHp / SH),
  );
}

export function cvdDeltaE00(firstHex, secondHex) {
  return Object.entries(CVD_MATRICES).map(([deficiency, matrix]) => ({
    deficiency,
    deltaE: deltaE00(toLab(firstHex, matrix), toLab(secondHex, matrix)),
  }));
}
