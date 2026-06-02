// ================================================================
// ColorView Extension - Content Script (Upgraded)
// Features:
//   1. Floating ball on every page
//   2. Click → opens full side panel with Brettel screenshot simulation
//   3. Toggle between accurate (Brettel Canvas) and fast (SVG filter) modes
//   4. In-panel contrast checker with pixel picking
//   5. Keyboard shortcuts
// ================================================================

'use strict';

// --- CVD type names ---
const CVD_NAMES = {
  protanopia: '红色盲', deuteranopia: '绿色盲', tritanopia: '蓝色盲',
  protanomaly: '红色弱', deuteranomaly: '绿色弱', achromatopsia: '全色盲'
};
const CVD_TYPES = Object.keys(CVD_NAMES);

// --- State ---
let panelVisible = false;
let panelMode = 'screenshot'; // 'screenshot' for Brettel, 'filter' for SVG
let currentCvdType = 'deuteranopia';
let screenshotImg = null; // base64 screenshot data
let panelEl = null;
let floatBall = null;

// --- SVG filter matrices (fast, approximate mode) ---
const SVG_FILTERS = {
  protanopia: `<filter id="cv-protanopia"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"/></filter>`,
  deuteranopia: `<filter id="cv-deuteranopia"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/></filter>`,
  tritanopia: `<filter id="cv-tritanopia"><feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0"/></filter>`,
  protanomaly: `<filter id="cv-protanomaly"><feColorMatrix type="matrix" values="0.817 0.183 0 0 0 0.333 0.667 0 0 0 0 0.125 0.875 0 0 0 0 0 1 0"/></filter>`,
  deuteranomaly: `<filter id="cv-deuteranomaly"><feColorMatrix type="matrix" values="0.8 0.2 0 0 0 0.258 0.742 0 0 0 0 0.142 0.858 0 0 0 0 0 1 0"/></filter>`,
  achromatopsia: `<filter id="cv-achromatopsia"><feColorMatrix type="saturate" values="0"/></filter>`
};
let svgFilterEl = null;

// --- Floating Ball ---
function createFloatBall() {
  if (floatBall) return;

  floatBall = document.createElement('div');
  floatBall.id = 'cv-float-ball';
  floatBall.innerHTML = '&#128065;';
  floatBall.title = 'ColorView - 色盲模拟与对比度检查器';
  floatBall.style.cssText = `
    position: fixed; right: 16px; top: 50%; transform: translateY(-50%);
    width: 44px; height: 44px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    border-radius: 50%;
    cursor: pointer;
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 4px 16px rgba(79,70,229,0.4);
    transition: all 0.3s ease;
    user-select: none;
    animation: cvBallIn 0.4s ease;
  `;
  floatBall.addEventListener('click', togglePanel);
  document.body.appendChild(floatBall);
}

// --- Panel (like a side drawer) ---
function createPanel() {
  if (panelEl) return;

  panelEl = document.createElement('div');
  panelEl.id = 'cv-panel';
  panelEl.style.cssText = `
    position: fixed; top: 0; right: 0; bottom: 0;
    width: 480px; max-width: 95vw;
    background: #f8fafc;
    z-index: 2147483645;
    box-shadow: -4px 0 24px rgba(0,0,0,0.15);
    display: none;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 13px;
    color: #1e293b;
    animation: cvSlideRight 0.3s ease;
    overflow-y: auto;
  `;

  panelEl.innerHTML = `
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:1">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">&#128065;</span>
        <div><div style="font-weight:700;font-size:15px">ColorView</div><div style="font-size:11px;opacity:.85">色盲模拟与对比度检查器</div></div>
      </div>
      <button id="cv-panel-close" style="background:rgba(255,255,255,.15);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">&#10005;</button>
    </div>

    <!-- Mode toggle -->
    <div style="padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px">
      <span style="font-weight:600;font-size:13px">模式：</span>
      <button id="cv-mode-screenshot" class="cv-mode-btn active" style="padding:5px 12px;border-radius:6px;border:1px solid #e2e8f0;background:#4f46e5;color:white;cursor:pointer;font-size:12px;font-weight:500">&#128247; 截图模式（精准）</button>
      <button id="cv-mode-filter" class="cv-mode-btn" style="padding:5px 12px;border-radius:6px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:12px;font-weight:500">&#9889; 实时模式（快速）</button>
    </div>

    <!-- CVD Type Selector -->
    <div style="padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">&#127912; 模拟类型</div>
      <div id="cv-cvd-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px"></div>
    </div>

    <!-- Preview area -->
    <div style="padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0;flex:1;min-height:0">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">&#128269; 预览对比</div>
      <div id="cv-screenshot-section">
        <button id="cv-capture-btn" style="width:100%;padding:12px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;margin-bottom:10px">
          &#128247; 截取当前页面并分析
        </button>
        <div id="cv-preview-status" style="text-align:center;color:#64748b;font-size:12px;padding:20px">
          点击上方按钮截取可见区域，使用 Brettel 1997 算法进行像素级模拟
        </div>
        <div id="cv-preview-container" style="display:none">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <div style="font-size:11px;font-weight:600;padding:4px 8px;background:#f1f5f9;border-radius:6px 6px 0 0;text-align:center">
                <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;margin-right:4px"></span> 原始视图
              </div>
              <div style="background:repeating-conic-gradient(#f1f5f9 0% 25%,#fff 0% 50%)50%/12px 12px;border:1px solid #e2e8f0;border-radius:0 0 6px 6px;overflow:hidden">
                <canvas id="cv-original-canvas" style="width:100%;display:block"></canvas>
              </div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;padding:4px 8px;background:#f1f5f9;border-radius:6px 6px 0 0;text-align:center">
                <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f59e0b;margin-right:4px"></span> 模拟视图 - <span id="cv-sim-type-name">绿色盲</span>
              </div>
              <div style="background:repeating-conic-gradient(#f1f5f9 0% 25%,#fff 0% 50%)50%/12px 12px;border:1px solid #e2e8f0;border-radius:0 0 6px 6px;overflow:hidden">
                <canvas id="cv-simulated-canvas" style="width:100%;display:block"></canvas>
              </div>
            </div>
          </div>
          <div style="font-size:10px;color:#64748b;text-align:center;margin-top:8px;padding:6px;background:#f8fafc;border-radius:6px">
            &#9432; 基于 Brettel, Vienot & Mollon (1997) 算法，含 sRGB 伽马校正。近似模拟，实际体验因个体差异而不同。
          </div>
        </div>
      </div>
      <div id="cv-filter-section" style="display:none">
        <button id="cv-apply-filter-btn" style="width:100%;padding:12px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">
          &#9889; 实时滤镜已激活
        </button>
        <div style="font-size:11px;color:#64748b;text-align:center;margin-top:8px">
          实时模式通过SVG色彩矩阵<strong>近似</strong>模拟色盲效果，适合快速浏览。<br>
          需要精确结果请使用截图模式。
        </div>
      </div>
    </div>

    <!-- Contrast Checker -->
    <div style="padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">&#128200; 对比度检测</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:12px;font-weight:500;min-width:42px">前景色</span>
        <input type="color" id="cv-fg-picker" value="#333333" style="width:30px;height:30px;border:2px solid #e2e8f0;border-radius:6px;cursor:pointer;padding:1px">
        <input type="text" id="cv-fg-hex" value="#333333" maxlength="7" style="flex:1;padding:5px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:monospace">
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:12px;font-weight:500;min-width:42px">背景色</span>
        <input type="color" id="cv-bg-picker" value="#ffffff" style="width:30px;height:30px;border:2px solid #e2e8f0;border-radius:6px;cursor:pointer;padding:1px">
        <input type="text" id="cv-bg-hex" value="#ffffff" maxlength="7" style="flex:1;padding:5px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:monospace">
      </div>
      <div id="cv-contrast-result" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="text-align:center;padding:10px 10px 0;font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase">WCAG 对比度比率</div>
        <div style="text-align:center;font-size:32px;font-weight:800;padding:4px" id="cv-ratio-value">12.63:1</div>
        <div style="display:grid;grid-template-columns:1fr 1fr">
          <div style="padding:8px;text-align:center;border-top:1px solid #e2e8f0;border-right:1px solid #e2e8f0"><span style="font-size:10px;color:#64748b">AA 正常文本</span><br><span class="cv-badge cv-pass" id="cv-aa-normal">&#10003; 通过</span></div>
          <div style="padding:8px;text-align:center;border-top:1px solid #e2e8f0"><span style="font-size:10px;color:#64748b">AA 大文本</span><br><span class="cv-badge cv-pass" id="cv-aa-large">&#10003; 通过</span></div>
          <div style="padding:8px;text-align:center;border-top:1px solid #e2e8f0;border-right:1px solid #e2e8f0"><span style="font-size:10px;color:#64748b">AAA 正常文本</span><br><span class="cv-badge cv-pass" id="cv-aaa-normal">&#10003; 通过</span></div>
          <div style="padding:8px;text-align:center;border-top:1px solid #e2e8f0"><span style="font-size:10px;color:#64748b">AAA 大文本</span><br><span class="cv-badge cv-pass" id="cv-aaa-large">&#10003; 通过</span></div>
        </div>
      </div>
      <div id="cv-text-preview" style="margin-top:6px;padding:10px;border-radius:6px;text-align:center;border:1px solid #e2e8f0">
        <div style="font-size:15px;font-weight:700">大文本示例 (18pt Bold)</div>
        <div style="font-size:12px">正常文本示例 (14px Regular)</div>
      </div>
      <div id="cv-suggestions" style="margin-top:6px"></div>
    </div>

    <div style="padding:10px;text-align:center;font-size:10px;color:#94a3b8">
      ColorView Extension &mdash; Brettel et al. (1997) &amp; WCAG 2.1
    </div>
  `;

  document.body.appendChild(panelEl);

  // --- Bind events ---
  document.getElementById('cv-panel-close').addEventListener('click', togglePanel);
  document.getElementById('cv-capture-btn').addEventListener('click', capturePage);
  document.getElementById('cv-mode-screenshot').addEventListener('click', () => switchMode('screenshot'));
  document.getElementById('cv-mode-filter').addEventListener('click', () => switchMode('filter'));
  document.getElementById('cv-apply-filter-btn').addEventListener('click', () => switchMode('screenshot'));

  // CVD type buttons
  const grid = document.getElementById('cv-cvd-grid');
  CVD_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.textContent = CVD_NAMES[type];
    btn.dataset.type = type;
    btn.className = type === currentCvdType ? 'cv-cvd-btn active' : 'cv-cvd-btn';
    btn.addEventListener('click', () => {
      currentCvdType = type;
      updateCvdButtons();
      document.getElementById('cv-sim-type-name').textContent = CVD_NAMES[type];
      if (panelMode === 'filter') {
        applyFilter(currentCvdType);
      }
      if (panelMode === 'screenshot' && screenshotImg) {
        applyBrettelSimulation();
      }
    });
    grid.appendChild(btn);
  });

  // Color picker sync
  setupColorSync('cv-fg-picker', 'cv-fg-hex', 'fg');
  setupColorSync('cv-bg-picker', 'cv-bg-hex', 'bg');

  // Click on original canvas to sample colors
  document.getElementById('cv-original-canvas').addEventListener('click', (e) => {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    // Use a sample counter to alternate fg/bg
    if (!window._cvSampleCount) window._cvSampleCount = 0;
    window._cvSampleCount++;
    if (window._cvSampleCount % 2 === 1) {
      document.getElementById('cv-fg-picker').value = hex;
      document.getElementById('cv-fg-hex').value = hex;
    } else {
      document.getElementById('cv-bg-picker').value = hex;
      document.getElementById('cv-bg-hex').value = hex;
    }
    window._cvColors = window._cvColors || {};
    if (window._cvSampleCount % 2 === 1) {
      window._cvColors.fg = [pixel[0], pixel[1], pixel[2]];
    } else {
      window._cvColors.bg = [pixel[0], pixel[1], pixel[2]];
    }
    updateContrast();
  });

  // Initial contrast
  window._cvColors = { fg: [51, 51, 51], bg: [255, 255, 255] };
  updateContrast();
  updateSuggestions();
}

// --- Mode switching ---
function switchMode(mode) {
  panelMode = mode;
  document.getElementById('cv-mode-screenshot').className = mode === 'screenshot' ? 'cv-mode-btn active' : 'cv-mode-btn';
  document.getElementById('cv-mode-filter').className = mode === 'filter' ? 'cv-mode-btn active' : 'cv-mode-btn';
  document.getElementById('cv-screenshot-section').style.display = mode === 'screenshot' ? '' : 'none';
  document.getElementById('cv-filter-section').style.display = mode === 'filter' ? '' : 'none';

  if (mode === 'filter') {
    applyFilter(currentCvdType);
  } else {
    removeFilter();
    if (!screenshotImg) {
      document.getElementById('cv-preview-status').style.display = '';
      document.getElementById('cv-preview-container').style.display = 'none';
    }
  }
}

// --- Screenshot + Brettel simulation ---
function capturePage() {
  chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, (dataUrl) => {
    if (!dataUrl) {
      document.getElementById('cv-preview-status').textContent = '截图失败，请重试';
      return;
    }
    screenshotImg = dataUrl;
    const img = new Image();
    img.onload = () => {
      document.getElementById('cv-preview-status').style.display = 'none';
      document.getElementById('cv-preview-container').style.display = '';
      document.getElementById('cv-sim-type-name').textContent = CVD_NAMES[currentCvdType];
      // Draw original
      const origCanvas = document.getElementById('cv-original-canvas');
      const simCanvas = document.getElementById('cv-simulated-canvas');
      const maxW = origCanvas.parentElement.clientWidth - 4;
      const scale = maxW / img.width;
      const w = maxW;
      const h = Math.round(img.height * scale);
      origCanvas.width = w; origCanvas.height = h;
      simCanvas.width = w; simCanvas.height = h;
      const origCtx = origCanvas.getContext('2d');
      origCtx.drawImage(img, 0, 0, w, h);
      applyBrettelSimulation();
    };
    img.src = dataUrl;
  });
}

function applyBrettelSimulation() {
  if (!screenshotImg) return;
  const origCanvas = document.getElementById('cv-original-canvas');
  const simCanvas = document.getElementById('cv-simulated-canvas');
  const origCtx = origCanvas.getContext('2d');
  const simCtx = simCanvas.getContext('2d', { willReadFrequently: true });
  const imageData = origCtx.getImageData(0, 0, origCanvas.width, origCanvas.height);
  const matrix = getCvdMatrix(currentCvdType);
  const dst = simCtx.createImageData(origCanvas.width, origCanvas.height);
  const src = imageData.data, dstData = dst.data;
  for (let i = 0; i < src.length; i += 4) {
    const [sr, sg, sb] = simulatePixel(matrix, src[i], src[i+1], src[i+2]);
    dstData[i]=sr; dstData[i+1]=sg; dstData[i+2]=sb; dstData[i+3]=src[i+3];
  }
  simCtx.putImageData(dst, 0, 0);
}

// --- SVG filter mode ---
function applyFilter(type) {
  removeFilter();
  svgFilterEl = document.createElement('div');
  svgFilterEl.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;z-index:-1';
  const filterId = `cv-${type}`;
  svgFilterEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${SVG_FILTERS[type]}</svg>`;
  document.body.appendChild(svgFilterEl);
  document.documentElement.style.filter = `url(#${filterId})`;
  document.body.style.filter = `url(#${filterId})`;
  document.getElementById('cv-apply-filter-btn').textContent = `\u26A1 ${CVD_NAMES[type]} 滤镜已激活（点击切换到截图模式）`;
  document.getElementById('cv-apply-filter-btn').style.background = '#10b981';
  document.getElementById('cv-sim-type-name').textContent = CVD_NAMES[type];
}

function removeFilter() {
  if (svgFilterEl) { svgFilterEl.remove(); svgFilterEl = null; }
  document.documentElement.style.filter = '';
  document.body.style.filter = '';
}

// --- Panel toggle ---
function togglePanel() {
  panelVisible = !panelVisible;
  if (!panelEl) createPanel();
  panelEl.style.display = panelVisible ? 'flex' : 'none';
  floatBall.style.opacity = panelVisible ? '0.4' : '1';
  if (panelVisible && panelMode === 'screenshot' && !screenshotImg) {
    document.getElementById('cv-preview-status').style.display = '';
    document.getElementById('cv-preview-container').style.display = 'none';
  }
}

// --- CVD button update ---
function updateCvdButtons() {
  document.querySelectorAll('#cv-cvd-grid .cv-cvd-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === currentCvdType);
  });
}

// --- Color sync ---
function setupColorSync(pickerId, hexId, key) {
  const picker = document.getElementById(pickerId);
  const hex = document.getElementById(hexId);
  if (!picker || !hex) return;
  picker.addEventListener('input', () => {
    hex.value = picker.value;
    window._cvColors[key] = hexToRgb(picker.value);
    updateContrast();
    updateSuggestions();
  });
  hex.addEventListener('input', () => {
    let v = hex.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      picker.value = v;
      window._cvColors[key] = hexToRgb(v);
      updateContrast();
      updateSuggestions();
    }
  });
}

// --- Contrast ---
function updateContrast() {
  const fg = window._cvColors.fg || [51, 51, 51];
  const bg = window._cvColors.bg || [255, 255, 255];
  const ratio = contrastRatio(fg, bg);

  document.getElementById('cv-ratio-value').textContent = ratio.toFixed(2) + ':1';

  const aaN = ratio >= 4.5, aaL = ratio >= 3.0;
  const aaaN = ratio >= 7.0, aaaL = ratio >= 4.5;

  const updateBadge = (id, pass) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'cv-badge ' + (pass ? 'cv-pass' : 'cv-fail');
    el.innerHTML = pass ? '&#10003; 通过' : '&#10007; 未通过';
  };
  updateBadge('cv-aa-normal', aaN);
  updateBadge('cv-aa-large', aaL);
  updateBadge('cv-aaa-normal', aaaN);
  updateBadge('cv-aaa-large', aaaL);

  const tp = document.getElementById('cv-text-preview');
  if (tp) {
    tp.style.background = rgbToHex(...bg);
    tp.style.color = rgbToHex(...fg);
  }
}

function updateSuggestions() {
  const fg = window._cvColors.fg || [51, 51, 51];
  const bg = window._cvColors.bg || [255, 255, 255];
  const ratio = contrastRatio(fg, bg);
  const fgL = relativeLuminance(...fg);
  const bgL = relativeLuminance(...bg);
  const fgDark = fgL < bgL;
  const aaN = ratio >= 4.5, aaL = ratio >= 3.0, aaaN = ratio >= 7.0;

  let html = '';
  if (aaN && aaaN) {
    html = '<div style="padding:6px 8px;background:#dcfce7;color:#15803d;border-radius:6px;font-size:11px;border-left:3px solid #16a34a">&#10003; 优秀！同时满足 WCAG AA 和 AAA 标准（对比度 ' + ratio.toFixed(2) + ':1）。</div>';
  } else if (aaN) {
    html = '<div style="padding:6px 8px;background:#dcfce7;color:#15803d;border-radius:6px;font-size:11px;border-left:3px solid #16a34a">&#10003; 符合 WCAG AA 标准。</div>';
    if (!aaaN) {
      html += '<div style="padding:6px 8px;background:#fef3c7;color:#92400e;border-radius:6px;font-size:11px;border-left:3px solid #d97706;margin-top:4px">&#9888; 未达 AAA（需 7:1）。建议' + (fgDark ? '加深文字或减淡背景。' : '减淡文字或加深背景。') + '</div>';
    }
  } else if (aaL) {
    html = '<div style="padding:6px 8px;background:#fef3c7;color:#92400e;border-radius:6px;font-size:11px;border-left:3px solid #d97706">&#9888; 仅通过大文本 AA。仅适用于 18pt 以上大文字。建议' + (fgDark ? '加深文字或减淡背景' : '减淡文字或加深背景') + '达到 4.5:1（差 ' + (4.5-ratio).toFixed(2) + '）。</div>';
  } else {
    html = '<div style="padding:6px 8px;background:#fee2e2;color:#991b1b;border-radius:6px;font-size:11px;border-left:3px solid #dc2626">&#10060; 未通过 WCAG 标准（对比度仅 ' + ratio.toFixed(2) + ':1）。建议显著' + (fgDark ? '加深文字或减淡背景' : '减淡文字或加深背景') + '至少达到 4.5:1（差 ' + (4.5-ratio).toFixed(2) + '）。或增大字号至 18pt。</div>';
  }
  document.getElementById('cv-suggestions').innerHTML = html;
}

// --- Core algorithm (inlined for content script independence) ---
function srgbToLinear(c) { return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
function linearToSrgb(c) { c = Math.max(0,Math.min(1,c)); return c <= 0.0031308 ? c*12.92 : 1.055*Math.pow(c,1/2.4)-0.055; }

const CVD_MATRIX = {
  protanopia: [[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
  deuteranopia: [[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,-0.084030,1.095850]],
  tritanopia: [[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]]
};
const ID = [[1,0,0],[0,1,0],[0,0,1]];

function matMul(m, r, g, b) { return [m[0][0]*r+m[0][1]*g+m[0][2]*b, m[1][0]*r+m[1][1]*g+m[1][2]*b, m[2][0]*r+m[2][1]*g+m[2][2]*b]; }
function lerpMat(a, b, t) { return [ [a[0][0]*(1-t)+b[0][0]*t, a[0][1]*(1-t)+b[0][1]*t, a[0][2]*(1-t)+b[0][2]*t], [a[1][0]*(1-t)+b[1][0]*t, a[1][1]*(1-t)+b[1][1]*t, a[1][2]*(1-t)+b[1][2]*t], [a[2][0]*(1-t)+b[2][0]*t, a[2][1]*(1-t)+b[2][1]*t, a[2][2]*(1-t)+b[2][2]*t] ]; }

function getCvdMatrix(type) {
  if (type === 'achromatopsia') return [[0.2126,0.7152,0.0722],[0.2126,0.7152,0.0722],[0.2126,0.7152,0.0722]];
  if (CVD_MATRIX[type]) return CVD_MATRIX[type];
  return lerpMat(ID, CVD_MATRIX[type.replace('omaly','opia')] || CVD_MATRIX['deuteranopia'], 0.6);
}

function simulatePixel(m, r, g, b) {
  const [lr, lg, lb] = matMul(m, srgbToLinear(r/255), srgbToLinear(g/255), srgbToLinear(b/255));
  return [Math.round(linearToSrgb(lr)*255), Math.round(linearToSrgb(lg)*255), Math.round(linearToSrgb(lb)*255)];
}

function hexToRgb(hex) { hex=hex.replace('#',''); const n=parseInt(hex,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function rgbToHex(r,g,b) { return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join(''); }
function relativeLuminance(r,g,b) { return 0.2126*srgbToLinear(r/255)+0.7152*srgbToLinear(g/255)+0.0722*srgbToLinear(b/255); }
function contrastRatio(rgb1,rgb2) { const l1=relativeLuminance(...rgb1),l2=relativeLuminance(...rgb2); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); }

// --- Background listener ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      sendResponse(dataUrl);
    });
    return true;
  }
  if (msg.action === 'toggleSimulation') {
    if (msg.enabled) {
      currentCvdType = msg.cvdType || 'deuteranopia';
      createFloatBall();
      panelVisible = true;
      if (!panelEl) createPanel();
      panelEl.style.display = 'flex';
      floatBall.style.opacity = '0.4';
    } else {
      panelVisible = false;
      if (panelEl) panelEl.style.display = 'none';
      if (floatBall) floatBall.style.opacity = '1';
      removeFilter();
    }
    sendResponse({ success: true });
  }
});

// --- Init ---
createFloatBall();

// Add styles
const styleEl = document.createElement('style');
styleEl.textContent = `
.cv-mode-btn { font-family: inherit; }
.cv-mode-btn.active { background: #4f46e5 !important; color:white !important; }
.cv-cvd-btn { padding:8px 4px; border:2px solid #e2e8f0; border-radius:8px; background:white; cursor:pointer; font-size:12px; font-weight:500; font-family:inherit; color:#1e293b; transition:all .2s; }
.cv-cvd-btn:hover { border-color:#4f46e5; color:#4f46e5; }
.cv-cvd-btn.active { border-color:#4f46e5; background:#4f46e5; color:white; }
.cv-badge { display:inline-block; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:600; }
.cv-badge.cv-pass { background:#dcfce7; color:#16a34a; }
.cv-badge.cv-fail { background:#fee2e2; color:#dc2626; }
#cv-original-canvas { cursor:crosshair; }
/* Anomalous trichromacy filter approx */
`;
document.head.appendChild(styleEl);
console.log('[ColorView] Side panel + float ball ready. Right-click any image or click the floating ball to start.');
