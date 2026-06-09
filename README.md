# ColorView — 色盲模拟与对比度检查器

《人机交互技术》期末项目

## 项目简介

[![GitHub](https://img.shields.io/badge/GitHub-ilovedianaforever%2Fcolorview--extension-4f46e5?logo=github)](https://github.com/ilovedianaforever/colorview-extension)

ColorView 是一款面向非专业设计者的色盲模拟与 WCAG 对比度检查工具，帮助 PPT 制作者、学生和前端开发者在设计过程中"看见"色觉缺陷用户的真实视觉体验。全球约 8% 男性和 0.5% 女性患有不同程度的色觉缺陷，但大多数设计者在制作内容时从未考虑过色盲可访问性问题——本工具正是为弥补这一鸿沟而生。

## 小组成员与分工

| 成员 | 分工 |
|------|------|
| 王韩 | 提案撰写、项目实际部署应用（Firefox 扩展上架） |
| 韩宇 | demo 编程、功能实现（网页版核心算法） |
| 赵文鹏 | 设计报告、项目展示/总结工作 |

## 项目交付

本项目交付两份产品形态：

| 产品 | 技术栈 | 代码量 | 实现者 |
|------|--------|--------|--------|
| **ColorView Web**（index.html） | HTML5 + CSS3 + JavaScript，Canvas 像素级处理 | 约 1380 行 | 韩宇 |
| **ColorView Extension**（colorview-extension/） | Firefox MV3，含 Background/Content Script/Popup | 约 820 行 | 王韩 |

**总代码量约 2200 行**，超额完成三星级工作量预估。

## 项目文件结构

```
人机交互技术期末项目/
│
├── index.html                              # 网页版（单文件，浏览器打开即用）
│
├── colorview-extension/                    # Firefox 浏览器扩展
│   ├── manifest.json                       # 扩展配置（Manifest V3）
│   ├── background.js                       # 后台事件页
│   ├── content.js                          # 内容脚本（悬浮球+侧栏面板 UI）
│   ├── content.css                         # 侧栏面板样式
│   ├── simulation-core.js                  # Brettel 1997 色盲模拟核心算法
│   ├── popup.html / popup.js / popup.css   # 点击扩展图标的弹窗
│   ├── icons/                              # 扩展图标（16/48/128 px）
│   └── README.md                           # 扩展上架指南
│
├── ColorBlindSimulator_提案_v3.docx/.pdf    # 项目提案（最终版）
├── 演示视频_纯html.mp4                      # 网页版演示视频
├── Firefox 附加组件演示.mp4                 # 扩展版演示视频
└── README.md                                # 本文件
```

## 核心功能

1. **色盲模拟预览** — 支持 6 种 CVD 类型：红色盲、绿色盲、蓝色盲、红色弱、绿色弱、全色盲
2. **双模式架构** — 截图模式（Brettel 1997 像素级精准模拟）+ 实时模式（SVG 滤镜快速预览）
3. **WCAG 2.1 对比度检测** — AA/AAA × 正常文本/大文本 = 四项判定，即时显示
4. **智能改进建议** — 未达标时自动计算对比度差距和调整方向
5. **悬浮球入口** — 在任意网页右侧显示紫色悬浮球，一键打开侧栏面板
6. **键盘快捷键** — 按 1–6 快速切换六种 CVD 模拟类型
7. **五步流程引导** — 上传/截图 → 选择类型 → 查看模拟 → 检测对比度 → 获取建议，步骤进度一目了然
8. **颜色取样历史** — 最近 5 次像素取样记录，点击色块即可快速恢复，减少重复操作
9. **一键检测报告** — 自动生成格式化文字报告（包含前景色、背景色、对比度、WCAG判定），一键复制
10. **错误处理与反馈** — HEX 输入格式校验 + 红框提示、截图失败原因说明、操作 Toast 即时反馈

## 技术实现

- **核心算法**：Brettel, Viénot & Mollon (1997) 色盲模拟，完整实现 sRGB 伽马校正 → 线性 RGB → 矩阵变换 → sRGB 逆变换的像素处理管道
- **对比度公式**：严格实现 WCAG 2.1 相对亮度公式 L = 0.2126R + 0.7152G + 0.0722B
- **隐私安全**：100% 纯前端处理，不收集、不传输任何用户数据，无需网络连接

## 快速开始

### 网页版

直接用浏览器打开 `index.html`，上传图片或拾取颜色即可使用。

### 浏览器扩展（本地测试）

1. Firefox 地址栏输入 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件…」
3. 选择 `colorview-extension/manifest.json`
4. 加载完成后，在任意网页右侧会出现紫色悬浮球

### 浏览器扩展（正式安装）

扩展已提交至 **Firefox Add-ons 商店**，审核通过后可搜索 "ColorView" 直接安装。

### 项目源码

GitHub 仓库：[https://github.com/ilovedianaforever/colorview-extension](https://github.com/ilovedianaforever/colorview-extension)

## 参考文献

1. Brettel, H., Viénot, F., & Mollon, J. D. (1997). Computerized simulation of color appearance for dichromats. *Journal of the Optical Society of America A*, 14(10), 2647–2655.
2. Machado, G. M., Oliveira, M. M., & Fernandes, L. A. F. (2009). A Physiologically-based Model for Simulation of Color Vision Deficiency. *IEEE TVCG*, 15(6), 1291–1298.
3. Angerbauer, K., et al. (2022). Accessibility for Color Vision Deficiencies. *CHI '22*.
4. Flatla, D. R., & Gutwin, C. (2012). SSMRecolor: Improving Recoloring Tools. *CHI '12*.
5. W3C. (2018). Web Content Accessibility Guidelines (WCAG) 2.1.

## v1.1 升级日志（2026年6月9号）

基于 Shneiderman 八项黄金法则的系统性升级：

| 法则 | 改进项 | 影响范围 |
|------|--------|---------|
| 法则1（一致性） | 统一双产品颜色编码与术语 | 全局 |
| 法则2（快捷方式） | 快捷键速查面板（按 ? 弹出）、键盘快捷提示文字、新增 Esc/R 快捷键 | content.js, popup.html |
| 法则3（信息反馈） | Toast 通知组件、截图 Loading 动画、取样即时反馈 | content.js, popup.js |
| 法则4（闭合感） | 五步流程进度指示器、一键复制检测报告 | content.js |
| 法则5（错误处理） | HEX 格式校验+红框提示、截图失败原因说明、文件格式校验 | content.js, popup.js |
| 法则6（撤销操作） | 颜色取样历史面板（5次记录可恢复）、移除图片确认对话框 | content.js, popup.js |
| 法则7（控制点） | 悬浮球拖拽（Y轴）、设置面板接口预留 | content.js |
| 法则8（记忆负担） | CVD 按钮微型色条预览、历史颜色可视化 | content.js |

> 所有改进始终遵循纯前端、零依赖、零数据传输的隐私原则。
