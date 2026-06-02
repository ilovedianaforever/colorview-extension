// ================================================================
// ColorView Extension - Simulation Core
// Shared between popup.js and content.js
// Based on Brettel, Vienot & Mollon (1997) algorithm
// WCAG 2.1 contrast ratio calculation
// ================================================================

'use strict';

const CVD_MATRICES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281,  0.099216],
    [-0.003882, -0.048116, 1.051998]
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501,  0.047413],
    [-0.011820, -0.084030, 1.095850]
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809,  0.147602],
    [0.004733, 0.691367,  0.303900]
  ]
};

const ANOMALY_SEVERITY = { protanomaly: 0.6, deuteranomaly: 0.6 };

const ACHROMATOPSIA_MATRIX = [
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722]
];

const CVD_NAMES = {
  protanopia: '红色盲', deuteranopia: '绿色盲', tritanopia: '蓝色盲',
  protanomaly: '红色弱', deuteranomaly: '绿色弱', achromatopsia: '全色盲'
};

const CVD_TYPES = ['protanopia', 'deuteranopia', 'tritanopia', 'protanomaly', 'deuteranomaly', 'achromatopsia'];

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
  c = Math.max(0, Math.min(1, c));
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
}

function applyMatrix(m, r, g, b) {
  return [
    m[0][0] * r + m[0][1] * g + m[0][2] * b,
    m[1][0] * r + m[1][1] * g + m[1][2] * b,
    m[2][0] * r + m[2][1] * g + m[2][2] * b
  ];
}

function lerpMatrix(a, b, t) {
  const result = [];
  for (let i = 0; i < 3; i++) {
    result[i] = [];
    for (let j = 0; j < 3; j++) {
      result[i][j] = (1 - t) * a[i][j] + t * b[i][j];
    }
  }
  return result;
}

const IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

function getSimMatrix(cvdType) {
  if (cvdType === 'achromatopsia') return ACHROMATOPSIA_MATRIX;
  if (CVD_MATRICES[cvdType]) return CVD_MATRICES[cvdType];
  const baseType = cvdType.replace('omaly', 'opia');
  const severity = ANOMALY_SEVERITY[cvdType] || 0.6;
  if (CVD_MATRICES[baseType]) return lerpMatrix(IDENTITY, CVD_MATRICES[baseType], severity);
  return IDENTITY;
}

function simulatePixel(matrix, r, g, b) {
  let rn = srgbToLinear(r / 255);
  let gn = srgbToLinear(g / 255);
  let bn = srgbToLinear(b / 255);
  const [lr, lg, lb] = applyMatrix(matrix, rn, gn, bn);
  return [
    Math.round(Math.max(0, Math.min(255, linearToSrgb(lr) * 255))),
    Math.round(Math.max(0, Math.min(255, linearToSrgb(lg) * 255))),
    Math.round(Math.max(0, Math.min(255, linearToSrgb(lb) * 255)))
  ];
}

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => {
    const c = Math.max(0, Math.min(255, Math.round(v)));
    return c.toString(16).padStart(2, '0');
  }).join('');
}

function relativeLuminance(r, g, b) {
  return 0.2126 * srgbToLinear(r / 255) + 0.7152 * srgbToLinear(g / 255) + 0.0722 * srgbToLinear(b / 255);
}

function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function simulateImageData(imageData, cvdType) {
  const matrix = getSimMatrix(cvdType);
  const dst = new ImageData(imageData.width, imageData.height);
  const src = imageData.data, dstData = dst.data;
  for (let i = 0; i < src.length; i += 4) {
    const [sr, sg, sb] = simulatePixel(matrix, src[i], src[i + 1], src[i + 2]);
    dstData[i] = sr; dstData[i + 1] = sg; dstData[i + 2] = sb; dstData[i + 3] = src[i + 3];
  }
  return dst;
}
