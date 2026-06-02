# ColorView - 色盲模拟与对比度检查器 浏览器扩展

## 文件结构

```
colorview-extension/
├── manifest.json           # 浏览器扩展配置（兼容 Firefox / Edge / Chrome）
├── background.js           # 后台事件页（右键菜单、消息路由、截图捕获）
├── content.js              # 内容脚本（悬浮球入口 + 480px 侧栏面板 + Brettel 模拟）
├── content.css             # 工具栏浮动样式
├── simulation-core.js      # 核心模拟算法（Brettel/Viénot/Mollon 1997）
├── popup.html              # 弹窗界面（图片上传 + 对比度检测）
├── popup.js                # 弹窗交互逻辑
├── popup.css               # 弹窗样式
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

注意：项目根目录的 `index.html` 是独立网页版原型，扩展是独立产品。

---

## 扩展功能

### Popup 弹窗（点击扩展图标打开）

| 功能 | 说明 |
|------|------|
| **页面实时模拟** | 打开侧栏面板，截取当前页面用 Brettel 算法像素级模拟 |
| **图片上传分析** | 拖拽图片到弹窗，支持 PNG/JPG/WebP |
| **6 种 CVD 类型** | 红色盲、绿色盲、蓝色盲、红色弱、绿色弱、全色盲 |
| **左右对比预览** | 原图 vs 模拟图并排显示 |
| **WCAG 对比度检测** | AA/AAA × 正常文本/大文本 = 4 项判定 |
| **智能建议** | 未通过时自动给出改进方向和目标差距 |

### 网页注入（内容脚本自动运行）

| 功能 | 说明 |
|------|------|
| **悬浮球入口** | 页面右侧紫色圆形按钮，点击打开侧栏面板 |
| **截图模式**（精准） | 截取可见区域，Brettel 1997 像素级算法模拟 |
| **实时模式**（快速） | SVG feColorMatrix 滤镜实现全页色彩近似模拟 |
| **面板内对比度检测** | 在原图 Canvas 上点击拾取颜色，WCAG 即时判定 |
| **右键菜单** | 在图片上右键 → "使用 ColorView 分析此图片" |
| **右键菜单** | 在页面上右键 → "在此页面上开启色盲模拟" |

---

## 一、本地加载测试（适用于所有浏览器）

### Firefox
1. 打开 **Firefox**，地址栏输入 `about:debugging#/runtime/this-firefox`
2. 点击 **"临时载入附加组件…"**
3. 选择 `colorview-extension` 文件夹中的任意文件（如 `manifest.json`）
4. 扩展安装完成！工具栏会出现 ColorView 图标

### Edge / Chrome
1. 打开浏览器，地址栏输入 `edge://extensions/` 或 `chrome://extensions/`
2. 打开 **"开发人员模式"** 开关
3. 点击 **"加载解压缩的扩展"**
4. 选择 `colorview-extension` 文件夹

---

## 二、Firefox Add-ons 商店上架流程（完全免费）

### 第 1 步：注册 Firefox 开发者账号

1. 访问 https://addons.mozilla.org/developers/
2. 使用 **Firefox 账号**（免费注册，现有邮箱即可）登录
3. 进入 [开发者中心](https://addons.mozilla.org/zh-CN/developers/)
4. **无需任何费用** — Firefox 扩展上架完全免费

### 第 2 步：修改 manifest.json 中的 ID（上架前必做）

`manifest.json` 中 `browser_specific_settings.gecko.id` 需要改为你自己的唯一 ID：

```json
"browser_specific_settings": {
  "gecko": {
    "id": "colorview@your-email.com",
    "strict_min_version": "115.0"
  }
}
```

格式必须是邮件格式（如 `xxx@xxx.xxx`），**发布后不可更改**。临时本地测试无需修改。

### 第 3 步：打包扩展

```bash
cd "c:/Users/16278/Desktop/人机交互技术/人机交互技术期末项目"

# PowerShell 打包为 zip
powershell Compress-Archive -Path colorview-extension/* -DestinationPath colorview-firefox.zip
```

注意：如果使用上面的命令，zip 文件解压后直接在根目录就要有 `manifest.json`，不能有嵌套文件夹。

**正确做法**：先进入 `colorview-extension` 文件夹，选中所有文件，右键 → 压缩为 .zip。或者用命令行：

```bash
cd colorview-extension
powershell "Compress-Archive -Path * -DestinationPath ../colorview-firefox.zip"
```

### 第 4 步：准备商店资料

| 项目 | 内容 |
|------|------|
| **扩展名称** | ColorView - 色盲模拟与对比度检查器 |
| **简短摘要** | 实时模拟 6 种色盲类型视觉效果，检查 WCAG 2.1 色彩对比度，让网页对色觉缺陷用户更友好 |
| **类别** | 辅助功能（Accessibility） |
| **截图** | 至少 1 张，建议准备弹窗界面、截图模式、对比度检测 3 张截图 |
| **许可证** | MIT License 或其他开源协议（建议选 MIT） |

**详情描述模板：**

```
ColorView 是一款专业的色盲模拟与 WCAG 对比度检查工具，专为网页设计者、PPT 制作者和非专业设计者打造。

核心功能：
• 6 种色盲类型实时模拟（红色盲、绿色盲、蓝色盲、红色弱、绿色弱、全色盲）
• 任意网页一键截取当前页面，使用 Brettel 1997 算法进行像素级精准模拟
• 双模式架构：截图模式（Brettel Canvas 精确模拟）+ 实时模式（SVG 滤镜快速预览）
• WCAG 2.1 对比度检测（AA/AAA × 正常文本/大文本 = 4 项判定）
• 面板内点击截图直接取色，即时检测对比度
• 智能改进建议（自动计算对比度差距和调整方向）
• 键盘快捷键 1-6 快速切换模拟类型
• 完全免费 · 纯前端处理 · 零隐私数据收集
• 中文界面，简单直观

技术基础：
基于 Brettel, Viénot & Mollon (1997) 色盲模拟算法，实现 sRGB 伽马校正 → 线性 RGB → 矩阵变换 → sRGB 逆变换的完整像素处理管道。对比度计算严格符合 WCAG 2.1 相对亮度公式。

适用场景：
• 网页设计师检查页面色彩无障碍性
• 学生制作 PPT 时检查配色可读性
• 前端开发者调试 WCAG 合规
• 教育场景中演示不同色盲类型视觉差异
```

### 第 5 步：提交审核

1. 登录 https://addons.mozilla.org/zh-CN/developers/
2. 点击 **"提交新附加组件"**
3. 上传 `colorview-firefox.zip`
4. 填写名称、摘要、类别、描述等信息
5. 上传截图（至少 1 张）
6. 如果扩展不收集数据，在隐私部分选择"不收集任何数据"
7. 点击 **"提交"**

### 第 6 步：审核与发布

- Firefox 审核分 **自动审核 + 人工审核** 两阶段
- 自动审核通常 **几分钟内**完成，扩展会立即变为"已发布"状态
- 人工审核可能持续 **1-7 天**，期间扩展仍处于发布状态
- 审核通过后，用户可在 [Firefox Add-ons](https://addons.mozilla.org/) 搜索 "ColorView" 安装

---

## 三、本地测试 vs 上架 的区别

| | 本地临时载入 | 正式上架 |
|------|------|------|
| **费用** | 免费 | 免费 |
| **每次打开是否自动加载** | 关闭 Firefox 后需重新载入 | 持久化安装 |
| **browser_specific_settings.id** | 可不填或用临时 ID | 必须用唯一的邮件格式 ID |
| **审核** | 无需审核 | 需要 AMO 审核 |
| **用户安装方式** | 开发者模式手动加载 | 直接从商店一键安装 |

---

## 四、Firefox 与 Edge/Chrome 的 manifest.json 差异说明

当前 `manifest.json` 已兼容 Firefox。与 Edge/Chrome 原版的主要差异：

| 字段 | Firefox | Edge/Chrome |
|------|---------|-------------|
| `browser_specific_settings` | 必须（定义扩展 ID） | 不需要（自动生成） |
| `background` | `scripts`（事件页） | `service_worker`（Service Worker） |
| `minimum_edge_version` | 不存在，已移除 | Chrome/Edge 专用 |

JS 代码无需修改，Firefox 完全支持 `chrome.*` API 命名空间。

---

## 五、常见问题

**Q: 扩展能在 Chrome/Edge 上同时使用吗？**
A: 可以。如果需要同时发布到 Chrome Web Store，只需把 `background.scripts` 改回 `background.service_worker`，移除 `browser_specific_settings`，加上 `minimum_edge_version`。其他代码完全相同。

**Q: 需要单独维护 Firefox 和 Chrome 两个版本吗？**
A: 不需要。核心代码（content.js、popup.js、background.js、simulation-core.js）完全共享。唯一不同是 manifest.json 中 3 个字段，可以通过构建脚本自动切换。

**Q: 原 index.html 受影响吗？**
A: 不受任何影响。扩展文件完全独立。
