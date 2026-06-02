// ================================================================
// ColorView Extension - Popup Script
// ================================================================

'use strict';

const $ = (id) => document.getElementById(id);

// --- State ---
const state = {
  cvdType: 'deuteranopia',
  fgColor: [51, 51, 51],
  bgColor: [255, 255, 255],
  image: null,
  imageData: null,
  hasImage: false
};

// --- DOM ---
const dom = {};
['uploadArea', 'fileInput', 'originalCanvas', 'simulatedCanvas',
 'originalPlaceholder', 'simPlaceholder', 'simTypeName', 'imageInfo',
 'imageInfoText', 'removeImageBtn', 'imageCvdSection', 'previewSection',
 'fgColorPicker', 'fgColorHex', 'bgColorPicker', 'bgColorHex',
 'contrastRatio', 'aa-normal', 'aa-large', 'aaa-normal', 'aaa-large',
 'textPreview', 'suggestions', 'cvdSelector', 'startPageSimBtn',
 'stopPageSimBtn', 'pageCvdSelect', 'pageSimSection'
].forEach(id => { dom[id] = $(id); });

const origCtx = dom.originalCanvas.getContext('2d', { willReadFrequently: true });
const simCtx = dom.simulatedCanvas.getContext('2d', { willReadFrequently: true });

// ==================== Page Simulation ====================

dom.startPageSimBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'startPageSimulation', cvdType: state.cvdType });
  dom.startPageSimBtn.style.display = 'none';
  dom.stopPageSimBtn.style.display = '';
});
dom.stopPageSimBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stopPageSimulation' });
  dom.startPageSimBtn.style.display = '';
  dom.stopPageSimBtn.style.display = 'none';
});

// Sync page sim state
chrome.runtime.sendMessage({ action: 'getState' }, (data) => {
  if (data && data.pageSimEnabled) {
    dom.startPageSimBtn.style.display = 'none';
    dom.stopPageSimBtn.style.display = '';
  } else {
    dom.startPageSimBtn.style.display = '';
    dom.stopPageSimBtn.style.display = 'none';
  }
  if (data && data.cvdType) {
    state.cvdType = data.cvdType;
  }
});

// ==================== Image Upload ====================

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      state.hasImage = true;
      drawOriginal();
      applySim();
      updateImageInfo(file.name, img.width, img.height);
      dom.imageCvdSection.style.display = '';
      dom.previewSection.style.display = '';
      dom.originalPlaceholder.style.display = 'none';
      dom.simPlaceholder.style.display = 'none';
      dom.originalCanvas.style.display = 'block';
      dom.simulatedCanvas.style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function drawOriginal() {
  const img = state.image;
  if (!img) return;
  const maxDim = 600;
  let w = img.width, h = img.height;
  if (w > maxDim || h > maxDim) {
    const s = maxDim / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  dom.originalCanvas.width = w;
  dom.originalCanvas.height = h;
  dom.simulatedCanvas.width = w;
  dom.simulatedCanvas.height = h;
  origCtx.drawImage(img, 0, 0, w, h);
  state.imageData = origCtx.getImageData(0, 0, w, h);
}

function updateImageInfo(name, w, h) {
  dom.imageInfoText.textContent = `${name} (${w}x${h})`;
  dom.imageInfo.style.display = 'flex';
}

function removeImage() {
  state.image = null;
  state.imageData = null;
  state.hasImage = false;
  dom.imageInfo.style.display = 'none';
  dom.imageCvdSection.style.display = 'none';
  dom.previewSection.style.display = 'none';
  dom.originalPlaceholder.style.display = '';
  dom.simPlaceholder.style.display = '';
  dom.originalCanvas.style.display = 'none';
  dom.simulatedCanvas.style.display = 'none';
  dom.fileInput.value = '';
}

dom.uploadArea.addEventListener('click', () => dom.fileInput.click());
dom.fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});
dom.uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dom.uploadArea.classList.add('dragover');
});
dom.uploadArea.addEventListener('dragleave', () => dom.uploadArea.classList.remove('dragover'));
dom.uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dom.uploadArea.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
dom.removeImageBtn.addEventListener('click', removeImage);

// ==================== CVD Type Selection ====================

dom.cvdSelector.addEventListener('click', (e) => {
  const btn = e.target.closest('.cv-type-btn');
  if (!btn) return;
  dom.cvdSelector.querySelectorAll('.cv-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.cvdType = btn.dataset.type;
  applySim();
  chrome.runtime.sendMessage({ action: 'setCvdType', cvdType: state.cvdType });
  chrome.storage.local.set({ cvdType: state.cvdType });
});

function applySim() {
  if (!state.imageData) return;
  const simData = simulateImageData(state.imageData, state.cvdType);
  simCtx.putImageData(simData, 0, 0);
  dom.simTypeName.textContent = CVD_NAMES[state.cvdType];
}

// ==================== Contrast Checker ====================

function syncColor(picker, hexInput, key) {
  picker.addEventListener('input', () => {
    hexInput.value = picker.value;
    state[key] = hexToRgb(picker.value);
    updateContrast();
  });
  hexInput.addEventListener('input', () => {
    let val = hexInput.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      picker.value = val;
      state[key] = hexToRgb(val);
      updateContrast();
    }
  });
  hexInput.addEventListener('blur', () => {
    let val = hexInput.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (!/^#[0-9a-fA-F]{6}$/.test(val)) {
      hexInput.value = rgbToHex(...state[key]);
    }
  });
}

syncColor(dom.fgColorPicker, dom.fgColorHex, 'fgColor');
syncColor(dom.bgColorPicker, dom.bgColorHex, 'bgColor');

function updateBadge(el, pass) {
  el.className = 'cv-wcag-badge ' + (pass ? 'cv-pass' : 'cv-fail');
  el.innerHTML = pass ? '&#10003; 通过' : '&#10007; 未通过';
}

function updateContrast() {
  const ratio = contrastRatio(state.fgColor, state.bgColor);
  dom.contrastRatio.innerHTML = ratio.toFixed(2) + '<span>:1</span>';

  const aaN = ratio >= 4.5, aaL = ratio >= 3.0;
  const aaaN = ratio >= 7.0, aaaL = ratio >= 4.5;

  updateBadge(dom['aa-normal'], aaN);
  updateBadge(dom['aa-large'], aaL);
  updateBadge(dom['aaa-normal'], aaaN);
  updateBadge(dom['aaa-large'], aaaL);

  const fgHex = rgbToHex(...state.fgColor);
  const bgHex = rgbToHex(...state.bgColor);
  dom.textPreview.style.background = bgHex;
  dom.textPreview.style.color = fgHex;

  generateSuggestions(ratio, aaN, aaL, aaaN, aaaL);
}

function generateSuggestions(ratio, aaN, aaL, aaaN, aaaL) {
  const items = [];
  const fgL = relativeLuminance(...state.fgColor);
  const bgL = relativeLuminance(...state.bgColor);
  const fgDark = fgL < bgL;

  if (aaN && aaaN) {
    items.push({ cls: 'cv-spass', text: '&#10003; <strong>优秀！</strong>当前配色同时满足 WCAG 2.1 AA 和 AAA 级标准（对比度 ' + ratio.toFixed(2) + ':1），对所有用户具有良好的可读性。' });
  } else if (aaN) {
    items.push({ cls: 'cv-spass', text: '&#10003; 符合 WCAG AA 级标准（对比度 ' + ratio.toFixed(2) + ':1），满足多数场景的无障碍要求。' });
    if (!aaaN) {
      items.push({ cls: 'cv-swarn', text: '&#9888; <strong>未达 AAA 级</strong>（需 7:1）。建议' + (fgDark ? '加深文字颜色' : '减淡文字颜色') + '或' + (fgDark ? '减淡背景色' : '加深背景色') + '。' });
    }
  } else if (aaL) {
    items.push({ cls: 'cv-swarn', text: '&#9888; <strong>仅通过大文本 AA 级</strong>（对比度 ' + ratio.toFixed(2) + ':1）。仅适用于 18pt 以上或 14pt 加粗的大文本。' });
    items.push({ cls: 'cv-swarn', text: '&#128736; <strong>改进建议：</strong>' + (fgDark ? '将文字颜色加深或将背景色减淡，使对比度达到 4.5:1。' : '将文字颜色减淡或将背景色加深，使对比度达到 4.5:1。') });
  } else {
    items.push({ cls: 'cv-swarn', text: '&#10060; <strong>未通过 WCAG 标准</strong>（对比度仅 ' + ratio.toFixed(2) + ':1）。当前配色对色觉缺陷用户极难辨认。' });
    items.push({ cls: 'cv-swarn', text: '&#128736; <strong>紧急改进：</strong>' + (fgDark ? '显著加深文字或减淡背景，至少需要达到 4.5:1（差 ' + (4.5 - ratio).toFixed(2) + '）。' : '显著减淡文字或加深背景，至少需要达到 4.5:1（差 ' + (4.5 - ratio).toFixed(2) + '）。') });
    items.push({ cls: 'cv-swarn', text: '&#128161; <strong>替代方案：</strong>将字号增大至 18pt 或 14pt 加粗以上，此时仅需 3:1 的对比度。' });
  }
  dom.suggestions.innerHTML = items.map(s => `<div class="cv-suggestion ${s.cls}">${s.text}</div>`).join('');
}

// ==================== Init ====================

// Load saved CVD preference
chrome.storage.local.get('cvdType', (data) => {
  if (data.cvdType) {
    state.cvdType = data.cvdType;
    const btn = dom.cvdSelector.querySelector(`[data-type="${data.cvdType}"]`);
    if (btn) btn.click();
  }
});

// Handle image from context menu
chrome.storage.local.get('analyzeImageUrl', (data) => {
  if (data.analyzeImageUrl) {
    chrome.storage.local.remove('analyzeImageUrl');
    // Try to fetch and display the image
    fetch(data.analyzeImageUrl)
      .then(r => r.blob())
      .then(blob => handleFile(new File([blob], 'image.png', { type: blob.type })))
      .catch(() => {});
  }
});

updateContrast();

// Prevent drag defaults
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());
