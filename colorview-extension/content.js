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

// --- Toast Notification (法则3+5: 统一反馈) ---
let toastTimer = null;
function showToast(message, type = 'info', duration = 3000) {
  if (toastTimer) clearTimeout(toastTimer);
  let el = document.getElementById('cv-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cv-toast';
    el.style.cssText = `
      position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:2147483647;
      padding:10px 20px; border-radius:8px; font-size:13px; font-weight:500;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;
      box-shadow:0 4px 16px rgba(0,0,0,0.15); pointer-events:none;
      transition:opacity 0.3s,transform 0.3s; opacity:0; transform:translateX(-50%) translateY(-10px);
    `;
    document.body.appendChild(el);
  }
  const colors = {
    success: { bg: '#dcfce7', border: '#16a34a', color: '#15803d', icon: '\u2713' },
    error: { bg: '#fee2e2', border: '#dc2626', color: '#991b1b', icon: '\u2717' },
    warning: { bg: '#fef3c7', border: '#d97706', color: '#92400e', icon: '\u26A0' },
    info: { bg: '#e0e7ff', border: '#4f46e5', color: '#3730a3', icon: '\u2139' }
  };
  const c = colors[type] || colors.info;
  el.style.cssText += `background:${c.bg};color:${c.color};border-left:4px solid ${c.border};opacity:1;transform:translateX(-50%) translateY(0);`;
  el.textContent = `${c.icon} ${message}`;
  toastTimer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(-10px)';
  }, duration);
}

// --- Color history (法则6+8: 减少记忆负担) ---
let colorHistory = [];
const MAX_HISTORY = 5;
function addToHistory(hex) {
  colorHistory = [hex, ...colorHistory.filter(h => h !== hex)].slice(0, MAX_HISTORY);
  renderHistory();
}
function renderHistory() {
  const container = document.getElementById('cv-history-colors');
  if (!container) return;
  container.innerHTML = colorHistory.length === 0
    ? '<span style="font-size:11px;color:#94a3b8">暂无取样记录，在预览图上点击即可取样</span>'
    : colorHistory.map(h =>
        `<button class="cv-history-chip" style="background:${h};width:28px;height:28px;border-radius:50%;border:2px solid #e2e8f0;cursor:pointer;position:relative" 
          title="${h}" onclick="document.getElementById('cv-fg-picker').value='${h}';document.getElementById('cv-fg-hex').value='${h}';window._cvColors.fg=hexToRgb('${h}');updateContrast();updateSuggestions();showToast('已恢复颜色 '+h,'info',1500)">
          <span style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);font-size:9px;color:#64748b;white-space:nowrap">${h}</span>
        </button>`
      ).join('');
}

// --- Shortcut help panel (法则2: 快捷键) ---
function toggleShortcutHelp() {
  let el = document.getElementById('cv-shortcut-help');
  if (el) { el.remove(); return; }
  el = document.createElement('div');
  el.id = 'cv-shortcut-help';
  el.innerHTML = `
    <div style="background:white;border-radius:12px;padding:20px;min-width:260px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">
      <div style="font-weight:700;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        \u2328 快捷键速查
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:#94a3b8">&times;</button>
      </div>
      <div style="display:grid;gap:8px;font-size:12px">
        <div><kbd style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-weight:600">1-6</kbd> 切换六种CVD类型</div>
        <div><kbd style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-weight:600">?</kbd> 显示/隐藏此面板</div>
        <div><kbd style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-weight:600">Esc</kbd> 关闭侧栏面板</div>
        <div><kbd style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-weight:600">R</kbd> 重置截图（截图模式）</div>
      </div>
    </div>`;
  el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;';
  document.body.appendChild(el);
  el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
}

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
      <button id="cv-shortcut-btn" title="快捷键速查 (?)" style="background:rgba(255,255,255,.15);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;margin-right:4px;font-weight:700">?</button>
      <button id="cv-panel-close" style="background:rgba(255,255,255,.15);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">&#10005;</button>
    </div>

    <!-- Steps flow indicator (法则4: 设计对话以产生闭合感) -->
    <div id="cv-steps" style="padding:8px 16px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#64748b;overflow-x:auto;gap:4px">
      <div class="cv-step"><span class="cv-step-num cv-step-done">&#10003;</span> 上传/截图</div>
      <div style="color:#cbd5e1">&#9654;</div>
      <div class="cv-step"><span class="cv-step-num cv-step-done">&#10003;</span> 选择类型</div>
      <div style="color:#cbd5e1">&#9654;</div>
      <div class="cv-step"><span class="cv-step-num">3</span> 查看模拟</div>
      <div style="color:#cbd5e1">&#9654;</div>
      <div class="cv-step"><span class="cv-step-num">4</span> 检测对比度</div>
      <div style="color:#cbd5e1">&#9654;</div>
      <div class="cv-step"><span class="cv-step-num">5</span> 获取建议</div>
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
      <div style="font-size:10px;color:#94a3b8;text-align:center;margin-top:6px">键盘快捷键 <kbd style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-family:monospace">1</kbd>–<kbd style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-family:monospace">6</kbd> 快速切换 · 按 <kbd style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-family:monospace">?</kbd> 查看所有快捷键</div>
    </div>

    <!-- Preview area -->
    <div style="padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0;flex:1;min-height:0">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">&#128269; 预览对比</div>
      <div id="cv-screenshot-section">
        <button id="cv-capture-btn" style="width:100%;padding:12px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;margin-bottom:10px;transition:all 0.2s">
          <span id="cv-capture-btn-text">&#128247; 截取当前页面并分析</span>
          <span id="cv-capture-btn-loading" style="display:none"><span class="cv-spinner"></span> 正在截取…</span>
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
      <!-- Copy report button (法则4: 闭合感) -->
      <button id="cv-copy-report" style="margin-top:6px;width:100%;padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:11px;color:#4f46e5;font-weight:500;transition:all 0.2s">&#128203; 复制检测报告</button>
    </div>

    <!-- Color history panel (法则6+8: 减少记忆负担 + 撤销) -->
    <div style="padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">&#128337; 颜色取样记录（最近5次）</div>
      <div id="cv-history-colors" style="display:flex;gap:8px;flex-wrap:wrap;padding-bottom:18px;min-height:40px;align-items:flex-start">
        <span style="font-size:11px;color:#94a3b8">暂无取样记录，在预览图上点击即可取样</span>
      </div>
    </div>

    <div style="padding:10px;text-align:center;font-size:10px;color:#94a3b8">
      ColorView Extension &mdash; Brettel et al. (1997) &amp; WCAG 2.1
    </div>
  `;

  document.body.appendChild(panelEl);

  // --- Bind events ---
  document.getElementById('cv-panel-close').addEventListener('click', togglePanel);
  document.getElementById('cv-shortcut-btn').addEventListener('click', toggleShortcutHelp);
  document.getElementById('cv-capture-btn').addEventListener('click', capturePage);
  document.getElementById('cv-mode-screenshot').addEventListener('click', () => switchMode('screenshot'));
  document.getElementById('cv-mode-filter').addEventListener('click', () => switchMode('filter'));
  document.getElementById('cv-apply-filter-btn').addEventListener('click', () => switchMode('screenshot'));
  document.getElementById('cv-copy-report').addEventListener('click', copyContrastReport);


  // CVD type buttons with mini color bar preview (法则8: 减少记忆负担)
  const grid = document.getElementById('cv-cvd-grid');
  // Mini color bars for preview: [red, green, blue, yellow]
  const CVD_PREVIEW_COLORS = {
    protanopia: ['#8B7355','#A0A050','#4169E1','#C8B820'],
    deuteranopia: ['#937050','#A09048','#5090D0','#C8B840'],
    tritanopia: ['#D04040','#40B0A0','#205080','#E06060'],
    protanomaly: ['#C07060','#60A050','#4060C0','#D0A030'],
    deuteranomaly: ['#C07060','#60A050','#4060C0','#D0A030'],
    achromatopsia: ['#808080','#909090','#707070','#A0A0A0']
  };
  CVD_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.dataset.type = type;
    btn.className = type === currentCvdType ? 'cv-cvd-btn active' : 'cv-cvd-btn';
    const bars = (CVD_PREVIEW_COLORS[type]||['#ccc','#ccc','#ccc','#ccc'])
      .map(c => `<span style="display:inline-block;width:12px;height:4px;background:${c};border-radius:1px"></span>`).join('');
    btn.innerHTML = `<div style="font-size:12px;font-weight:500">${CVD_NAMES[type]}</div><div style="margin-top:3px;display:flex;gap:2px;justify-content:center">${bars}</div>`;
    btn.addEventListener('click', () => {
      currentCvdType = type;
      updateCvdButtons();
      document.getElementById('cv-sim-type-name').textContent = CVD_NAMES[type];
      // Update step 2 indicator
      markStepDone(2);
      showToast(`已切换至 ${CVD_NAMES[type]} 模拟`, 'info', 1500);
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
      addToHistory(hex);
      showToast(`已取样前景色 ${hex}（再次点击取样背景色）`, 'info', 2000);
    } else {
      document.getElementById('cv-bg-picker').value = hex;
      document.getElementById('cv-bg-hex').value = hex;
      addToHistory(hex);
      showToast(`已取样背景色 ${hex}`, 'success', 2000);
    }
    window._cvColors = window._cvColors || {};
    if (window._cvSampleCount % 2 === 1) {
      window._cvColors.fg = [pixel[0], pixel[1], pixel[2]];
    } else {
      window._cvColors.bg = [pixel[0], pixel[1], pixel[2]];
      markStepDone(4); // Step 4: contrast detection done after both colors sampled
    }
    updateContrast();
    updateSuggestions();
    markStepDone(3); // Step 3: preview viewed
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
  const btnText = document.getElementById('cv-capture-btn-text');
  const btnLoading = document.getElementById('cv-capture-btn-loading');
  const btn = document.getElementById('cv-capture-btn');
  if (btn) { btnText.style.display = 'none'; btnLoading.style.display = 'inline'; btn.disabled = true; btn.style.opacity = '0.7'; }
  chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, (dataUrl) => {
    if (btn) { btnText.style.display = 'inline'; btnLoading.style.display = 'none'; btn.disabled = false; btn.style.opacity = '1'; }
    if (!dataUrl) {
      document.getElementById('cv-preview-status').textContent = '\u2717 截图失败：请切换到普通网页后重试（无法截取系统页面或扩展页面）';
      document.getElementById('cv-preview-status').style.color = '#dc2626';
      showToast('截图失败：请切换到普通网页后重试', 'error', 3000);
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
      markStepDone(1); // Step 1: screenshot done
      showToast(`\u2713 截图完成（${img.width}\u00D7${img.height}），Brettel 1997 像素级模拟已应用`, 'success', 2500);
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

// --- Step flow indicator (法则4) ---
const stepDone = {};
function markStepDone(stepNum) {
  if (stepDone[stepNum]) return;
  stepDone[stepNum] = true;
  const steps = document.querySelectorAll('#cv-steps .cv-step-num');
  steps.forEach((el, i) => {
    if (i + 1 <= stepNum) {
      el.classList.add('cv-step-done');
      el.textContent = '\u2713';
    }
  });
  if (stepNum >= 5) {
    showToast('\u2713 完整流程已完成！所有检测步骤均已执行', 'success', 3000);
  }
}

// --- Copy contrast report (法则4) ---
function copyContrastReport() {
  const fg = window._cvColors.fg || [51, 51, 51];
  const bg = window._cvColors.bg || [255, 255, 255];
  const ratio = contrastRatio(fg, bg);
  const aaN = ratio >= 4.5, aaL = ratio >= 3.0;
  const aaaN = ratio >= 7.0, aaaL = ratio >= 4.5;
  const fgHex = rgbToHex(...fg), bgHex = rgbToHex(...bg);
  let verdict = '';
  if (aaN && aaaN) verdict = '通过 WCAG 2.1 AA 和 AAA 全部四项检测';
  else if (aaN) verdict = '通过 WCAG 2.1 AA 级检测（AAA 未完全通过）';
  else if (aaL) verdict = '仅通过 AA 大文本检测，不满足 AA 正常文本标准';
  else verdict = '未通过 WCAG 2.1 任何级别检测';
  const report = `ColorView 检测报告\n================\n前景色: ${fgHex}\n背景色: ${bgHex}\n对比度: ${ratio.toFixed(2)}:1\n判定: ${verdict}\nCVD 模拟类型: ${CVD_NAMES[currentCvdType]}\n检测时间: ${new Date().toLocaleString()}`;
  navigator.clipboard.writeText(report).then(() => {
    showToast('\u2713 检测报告已复制到剪贴板', 'success', 2000);
    const btn = document.getElementById('cv-copy-report');
    if (btn) { btn.textContent = '\u2713 已复制！'; setTimeout(() => { btn.textContent = '\uD83D\uDCCB 复制检测报告'; }, 1500); }
  }).catch(() => {
    showToast('复制失败，请手动复制', 'error', 2000);
  });
  markStepDone(5);
}

// --- Color sync (with validation feedback per 法则5) ---
function setupColorSync(pickerId, hexId, key) {
  const picker = document.getElementById(pickerId);
  const hex = document.getElementById(hexId);
  if (!picker || !hex) return;
  picker.addEventListener('input', () => {
    hex.value = picker.value;
    hex.style.borderColor = '#e2e8f0';
    window._cvColors[key] = hexToRgb(picker.value);
    updateContrast();
    updateSuggestions();
  });
  hex.addEventListener('input', () => {
    let v = hex.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      picker.value = v;
      hex.style.borderColor = '#16a34a';
      window._cvColors[key] = hexToRgb(v);
      updateContrast();
      updateSuggestions();
    } else if (v.length >= 3) {
      hex.style.borderColor = '#dc2626';
      hex.style.animation = 'cvShake 0.4s ease';
      setTimeout(() => { hex.style.animation = ''; }, 400);
    }
  });
  hex.addEventListener('blur', () => {
    let v = hex.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) {
      hex.style.borderColor = '#dc2626';
      hex.value = rgbToHex(...(window._cvColors[key]||[51,51,51]));
      showToast('请输入有效的6位十六进制色值（如 #FF5500）', 'error', 2500);
      setTimeout(() => { hex.style.borderColor = '#e2e8f0'; }, 2500);
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

// --- Global keyboard shortcuts (法则2) ---
document.addEventListener('keydown', (e) => {
  // Don't intercept when user is typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  
  const key = e.key;
  // CVD type switching (1-6)
  if (key >= '1' && key <= '6') {
    const idx = parseInt(key) - 1;
    if (idx < CVD_TYPES.length) {
      currentCvdType = CVD_TYPES[idx];
      updateCvdButtons();
      const nameEl = document.getElementById('cv-sim-type-name');
      if (nameEl) nameEl.textContent = CVD_NAMES[currentCvdType];
      if (panelMode === 'filter') applyFilter(currentCvdType);
      if (panelMode === 'screenshot' && screenshotImg) applyBrettelSimulation();
      markStepDone(2);
      showToast(`已切换至 ${CVD_NAMES[currentCvdType]} [${key}]`, 'info', 1200);
    }
    return;
  }
  // Shortcut help
  if (key === '?') {
    e.preventDefault();
    toggleShortcutHelp();
    return;
  }
  // Close panel
  if (key === 'Escape') {
    if (panelVisible) {
      togglePanel();
      showToast('侧栏面板已关闭', 'info', 1000);
    }
    const help = document.getElementById('cv-shortcut-help');
    if (help) help.remove();
    return;
  }
  // Reset screenshot (R)
  if (key === 'r' || key === 'R') {
    if (panelVisible && panelMode === 'screenshot' && screenshotImg) {
      screenshotImg = null;
      document.getElementById('cv-preview-status').style.display = '';
      document.getElementById('cv-preview-container').style.display = 'none';
      window._cvSampleCount = 0;
      showToast('截图已重置，可重新截取', 'info', 1500);
    }
  }
});

// Add styles
const styleEl = document.createElement('style');
styleEl.textContent = `
.cv-mode-btn { font-family: inherit; }
.cv-mode-btn.active { background: #4f46e5 !important; color:white !important; }
.cv-cvd-btn { padding:8px 4px; border:2px solid #e2e8f0; border-radius:8px; background:white; cursor:pointer; font-size:12px; font-weight:500; font-family:inherit; color:#1e293b; transition:all .2s; }
.cv-cvd-btn:hover { border-color:#4f46e5; color:#4f46e5; }
.cv-cvd-btn.active { border-color:#4f46e5; background:#4f46e5; color:white; }
.cv-cvd-btn.active div { color:white; }
.cv-badge { display:inline-block; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:600; }
.cv-badge.cv-pass { background:#dcfce7; color:#16a34a; }
.cv-badge.cv-fail { background:#fee2e2; color:#dc2626; }
#cv-original-canvas { cursor:crosshair; }
/* Step indicator (法则4) */
.cv-step { display:flex; align-items:center; gap:3px; white-space:nowrap; }
.cv-step-num { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#e2e8f0; color:#64748b; font-size:9px; font-weight:700; align-items:center; justify-content:center; transition:all 0.3s; }
.cv-step-num.cv-step-done { background:#16a34a; color:white; }
/* Spinner (法则3) */
.cv-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:cvSpin 0.6s linear infinite; vertical-align:middle; margin-right:4px; }
@keyframes cvSpin { to { transform:rotate(360deg); } }
/* Shake animation (法则5) */
@keyframes cvShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 50%{transform:translateX(4px)} 75%{transform:translateX(-2px)} }
/* History chip (法则6+8) */
.cv-history-chip { transition:transform 0.2s; }
.cv-history-chip:hover { transform:scale(1.15); border-color:#4f46e5 !important; }
/* Copy button hover (法则4) */
#cv-copy-report:hover { background:#e0e7ff !important; border-color:#4f46e5 !important; }
`;
document.head.appendChild(styleEl);
console.log('[ColorView] Side panel + float ball ready. Right-click any image or click the floating ball to start.');
