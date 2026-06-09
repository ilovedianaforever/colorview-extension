# 方向十五：Color Blind Simulator — 色盲模拟与对比度检查器 项目提案

---

## A. 背景研究（Background Research）

### 1. 客户访谈（Client Interviews）

为深入了解目标用户群体在使用色彩设计工具时的真实痛点，本研究开展了针对性的用户访谈。访谈对象共计6人，包括3名在校学生（具有PPT制作和网页设计经验，但无专业设计背景）和3名初级前端开发者。访谈以半结构化形式进行，围绕以下问题展开：（a）您在制作PPT或设计网页时，是否考虑过色盲用户的视觉体验？（b）您是否使用过任何色彩无障碍检查工具？（c）如果有一个能模拟色盲视觉并检查对比度的网页工具，您最希望它具备什么功能？

访谈分析结果表明，6名受访者中仅有1人曾主动考虑色盲用户的可访问性问题；5人表示从未使用过任何色彩无障碍检查工具的主要原因在于"不知道该用什么工具"（3人）和"现有工具过于专业、操作复杂"（2人）。当被问及期望功能时，出现频率最高的需求依次为：实时色盲模拟预览（6人）、简单直观的操作界面（5人）、对比度一键检测（4人）以及上传图片即可分析（4人）。此外，2名初级开发者特别提到希望工具能直接给出"是否通过WCAG标准"的明确判断，而非仅展示数值。

以上访谈结果表明，目标用户群体普遍存在"色彩无障碍意识薄弱"与"缺乏简单易用的检测工具"之间的双重鸿沟，这正是本项目的核心切入点。

（完整客户访谈摘要见附录A）

### 2. 问题识别（Identify the Problem）

#### 2.a 概述

在全球范围内，约8%的男性和0.5%的女性患有不同程度的色觉缺陷（Color Vision Deficiency, CVD），总人数超过3亿。最常见的红绿色盲（Protanopia和Deuteranopia）占总色觉缺陷人群的99%以上。然而，当学生或非专业设计者制作PPT演示文稿、设计网页或创建可视化内容时，他们几乎从不考虑色盲用户的感知体验——要么不知道色盲用户看到的是什么效果，要么不清楚自己的配色方案是否会导致信息不可读。

本项目的目标用户群体为**具有基础电脑操作能力、但不具备专业无障碍设计知识的学生和非专业设计者**，具体指需要经常制作课程PPT、实验报告图表、社团海报或简单网页的大学生。他们需要一种低门槛、即时可用的工具，帮助他们在设计过程中"看见"色盲用户的世界，并确保关键信息的可读性。

#### 2.b 当前界面与现有解决方案

目前市面上已存在多种色盲模拟和无障碍检查工具，可分为以下几类：

第一类为**桌面端色盲模拟软件**，代表产品包括Color Oracle（免费，支持Windows/Mac/Linux，模拟Protanopia、Deuteranopia、Tritanopia三种类型）和Chromatic Vision Simulator（移动端App，支持实时摄像头模拟）。这类工具的核心功能是对屏幕色彩进行全局滤镜处理，但需要下载安装，且无法针对单张图片进行精确分析。

第二类为**在线色盲模拟网站**，代表产品包括Coblis（Color Blindness Simulator，基于Viénot-Brettel-Mollon算法，支持上传图片进行多种CVD模拟）、DaltonLens（开源在线模拟器，支持多种模拟算法）和RGBlind（支持图像上传与实时摄像头模式）。这些工具的优势是无需安装、即开即用，但通常缺乏对比度检测功能。

第三类为**专业设计插件**，代表产品包括Stark（Figma/Sketch/Adobe XD插件，付费模式，支持实时色彩无障碍检查与CVD模拟）和Adobe Color Accessibility Tools。这类工具功能全面，但内嵌于专业设计软件中，门槛较高，且多为付费产品。

第四类为**浏览器开发者工具内置功能**，如Chrome DevTools的Rendering面板内置了Vision Deficiency模拟（支持Protanopia、Deuteranopia、Tritanopia、Achromatopsia），但仅面向网页渲染，无法上传图片或检查对比度。

第五类为**独立对比度检查工具**，如WebAIM Contrast Checker和Coolors Contrast Checker，它们专注于计算两个颜色之间的WCAG对比度比率，但不提供色盲模拟功能。

#### 2.c 当前界面的问题

现有解决方案存在以下四个核心问题：

**第一，功能割裂。** 色盲模拟工具和对比度检查工具是分离的。设计者若想同时完成"查看色盲用户看到的画面"和"验证对比度是否符合WCAG标准"两项任务，需要在多个工具之间反复切换，操作流程繁琐，增加了认知负担与时间成本。

**第二，使用门槛高。** 以Stark为代表的设计插件功能强大，但需要安装特定的设计软件（Figma、Sketch等），且为付费订阅模式。对于只需偶尔制作PPT的学生群体而言，学习成本和金钱成本均过高。Color Oracle虽免费，但需要下载安装桌面应用程序，且仅提供全屏滤镜效果，无法针对单个图片元素进行精细分析。

**第三，缺乏教育引导。** 现有工具大多只展示结果（如模拟效果或对比度数值），不解释"这意味着什么"或"应该如何改进"。非专业用户看到模拟画面后可能感到困惑，不知道自己的设计是否存在问题、问题有多严重、应该如何修正。

**第四，中文生态缺失。** 市面上主流工具以英文界面为主，缺乏面向中文用户的优化体验。在中文教育场景下（如制作中文PPT、中文网页），学生难以找到匹配其使用习惯和语言的工具。

上述问题的直接后果是：即使存在技术解决方案，绝大多数非专业设计者仍然不会主动检查其作品的无障碍性，导致大量包含重要信息的内容——课堂PPT中的图表数据、海报上的关键文字、实验报告的统计图——对色觉缺陷者不可读。

#### 2.d 拟应用的HCI准则与设计原则

本项目将以下HCI概念和设计原则作为核心理论基础：

**可访问性设计（Accessibility Design）**：这是本项目最核心的HCI概念。可访问性不仅是技术标准（WCAG 2.1），更是一种设计哲学——确保产品和服务对不同能力的用户都是可用的。本项目将WCAG 2.1 Success Criterion 1.4.3（Contrast Minimum, Level AA）和1.4.6（Contrast Enhanced, Level AAA）直接嵌入工具的反馈机制中，使设计者在创作过程中即可获得可访问性指导。

**实时预览与直接操作（Real-time Preview & Direct Manipulation）**：依据Shneiderman界面设计八大黄金法则中的"提供信息反馈"和"允许轻松 reversal of actions"原则，实时预览让用户立即看到操作结果，形成有效的"操作→观察→调整"反馈环路，大幅降低试错成本。这与Shneiderman关于"减少短期记忆负担"的法则高度一致——用户无需在脑海中想象色盲视角，而是直接看到。

**减少设计者的认知盲点（Reducing Designer Blind Spots）**：这一概念借鉴了情境感知（Situation Awareness）理论。设计者通常只从自身感官经验出发进行创作，无法"想象"色觉差异用户的体验。通过提供多类型CVD模拟，系统将设计者的"未知的未知"转化为"已知的已知"，扩展其设计视角。

**降低认知负担（Reducing Cognitive Load）**：基于认知负荷理论（Cognitive Load Theory），本工具将双功能（模拟+检查）集成于单一界面，避免用户在多工具间切换带来的外在认知负荷。对比度计算结果使用颜色编码（红/黄/绿）直观呈现是否达标，减少用户解读数值的心智消耗。

### 3. 佐证性科学文献（Scientific Literature Review）

本节选取三篇来自SIGCHI会议论文集及高影响力期刊的研究论文，分别从色觉缺陷模拟算法、无障碍工具的用户需求、以及色彩无障碍实践三个维度为本项目提供理论支撑。

---

**论文一**

Angerbauer, K., Rodrigues, N., Cakmak, S., Oey, H., Pflüger, H., Merz, A., Weiskopf, D., & Sedlmair, M. (2022). Accessibility for Color Vision Deficiencies: Challenges and Findings of a Large Scale Study on Paper Figures. *Proceedings of the 2022 CHI Conference on Human Factors in Computing Systems (CHI '22)*, Article 135, 1–14. ACM. https://doi.org/10.1145/3491102.3502133

**论文概述：** Angerbauer等人对来自学术出版物（Vis30K数据集）的1,710张图像进行了大规模色觉缺陷可访问性研究，覆盖Protanopia、Deuteranopia、Tritanopia和Achromatopsia四种CVD类型。研究发现，相当比例的学术图表在被CVD观察者查看时存在严重的可读性问题：颜色区分度不足导致数据系列无法分辨，关键信息因色彩选择不当而丧失。研究指出，即使在高水平的学术出版物中，色彩无障碍设计仍然普遍被忽视，作者建议在内容创作流程中嵌入自动化CVD可访问性检查工具。

**对设计的影响：** 该论文直接为本项目提供了用户需求的有力证据——即便是受过高等教育的学术研究者在发布内容时也未能充分兼顾CVD无障碍性，普通学生和非专业设计者的认知缺口只会更大。论文的发现强化了本项目的核心价值主张：将CVD模拟嵌入日常设计工具链（而非仅面向专业设计师）是缩小这一缺口的有效途径。此外，论文中使用的大规模图像分析方法启发我们在开发完成后可采用类似方法对工具的有效性进行系统化评估。

---

**论文二**

Flatla, D. R., & Gutwin, C. (2012). SSMRecolor: Improving Recoloring Tools with Situation-Specific Models of Color Differentiation. *Proceedings of the SIGCHI Conference on Human Factors in Computing Systems (CHI '12)*, 2297–2306. ACM. https://doi.org/10.1145/2207676.2208388

**论文概述：** Flatla与Gutwin指出，现有CVD色彩重着色工具基于通用色盲模拟模型，但这些标准模型仅覆盖了色觉差异全部表现形态中的一小部分——实际CVD用户的色彩辨别能力存在显著个体差异。研究提出了"情境特定建模"（Situation-Specific Modelling, SSM）方法，通过让用户在特定任务环境中完成简短的色彩辨别测试来构建个性化色彩区分模型，进而驱动更精准的重着色方案。实验表明，SSMRecolor在色彩区分度改善方面显著优于基于通用模型的工具。

**对设计的影响：** 该论文对本项目的核心启示在于：虽然本工具采用通用CVD模拟模型（Brettel-Viénot-Mollon算法），但我们必须清醒意识到模拟结果的"近似性"——它呈现的是一种典型化的CVD体验，而非每个色觉缺陷个体的真实感知。因此，本工具在设计上应将模拟结果标注为"近似模拟"并提供简要说明，避免用户误认为这是绝对精确的呈现。同时，论文提出的"情境特定"思想启发我们在对比度检查模块中不仅给出WCAG通用标准判断，还可根据用户选择的CVD类型给出针对性的配色改进建议。

---

**论文三**

Machado, G. M., Oliveira, M. M., & Fernandes, L. A. F. (2009). A Physiologically-based Model for Simulation of Color Vision Deficiency. *IEEE Transactions on Visualization and Computer Graphics*, 15(6), 1291–1298. IEEE. https://doi.org/10.1109/TVCG.2009.113

**论文概述：** 该论文提出了文献中首个能够一致性地处理正常色觉与色觉缺陷（覆盖99.96%的CVD案例）的生理学模拟模型。模型基于人类色彩视觉的阶段理论（Stage Theory），其参数直接来源于电生理学实验数据。该模型能够模拟Protanopia、Deuteranopia和Tritanopia三种双色视类型，并具有参数可调的优势——通过调整参数即可控制模拟的严重程度，从轻度异常三色视（Anomalous Trichromacy）到完全双色视（Dichromacy）。

**对设计的影响：** Machado等人的模型为本项目的技术实现提供了直接的理论依据和算法参考。相比CSS滤镜方案（仅能进行粗略的色彩映射），基于该模型的Canvas像素处理方案可以实现更精确的CVD模拟。模型的可参数化特性使得本工具可以面向不同程度和类型的CVD提供分级模拟——这对于教育场景尤为重要：用户可以直观地理解"轻度红绿色弱"与"完全红绿色盲"之间的视觉差异。同时，基于该论文的研究，我们确定工具将支持至少六种模拟类型：Protanopia、Deuteranopia、Tritanopia、Protanomaly、Deuteranomaly和Achromatopsia。

---

## B. 界面设计方案（Proposed Interface Design）

### 4. 设计方案描述

#### 4.1 设计理念与总体架构

本项目提出开发一款名为 "ColorView" 的网页工具，将色盲模拟与WCAG对比度检查双功能集成于单一界面，以"所见即所得"的实时预览为核心交互范式。设计遵循三个基本原则：第一，"零门槛"——无需安装、注册或付费，打开浏览器即可使用；第二，"一屏完成"——所有功能集成在同一页面内，无需页面跳转或工具切换；第三，"即时反馈"——所有操作立即产生可视化结果，形成紧凑的操作-反馈循环。

以上三条原则直接呼应了Shneiderman八大黄金法则中的"减少短期记忆负担"（通过将所有选项可见化，避免用户记忆操作路径）、"提供信息反馈"（每个操作即时响应）和"设计对话框以产生闭合感"（完成检查后给出明确的通过/不通过判断）。在项目迭代升级中（v1.1），系统进一步按照全部八项法则进行了系统性改进：统一了双产品（网页版与扩展版）的术语与颜色编码（法则1）；为高级用户增加了键盘快捷键可视提示面板（法则2）；为所有关键操作添加了Toast即时反馈和加载状态动画（法则3）；设计了五步流程引导指示器和一键复制检测报告功能以提供完成仪式感（法则4）；完善了HEX色值输入的格式校验与错误提示、截图失败原因说明（法则5）；添加了移除图片确认对话框和颜色取样历史记录面板以支持撤销操作（法则6）；预留了设置面板接口使用户可以自定义悬浮球位置和面板宽度等偏好（法则7）；为CVD类型按钮增加了微型色条预览以降低认知记忆负担（法则8）。

#### 4.2 功能模块设计

**模块一：色彩输入区（Color Input Panel）**

用户可以两种方式输入需要分析的色彩内容：上传一张PNG/JPG/WebP格式的图片（支持拖拽上传），或直接使用拾色器选择/输入一个十六进制颜色值。上传图片后，原图在预览区显示，用户可点击图片任意位置采样颜色进行对比度分析。该设计参考了客户访谈中"上传图片即可分析"的高频需求。

**模块二：色盲模拟预览区（CVD Simulation Preview）**

这是本工具的核心视觉区域。采用左侧原图/色块与右侧模拟图的并排（side-by-side）布局。用户通过顶部类型选择器切换模拟类型，支持六种CVD类型：Protanopia（红色盲）、Deuteranopia（绿色盲）、Tritanopia（蓝色盲）、Protanomaly（红色弱）、Deuteranomaly（绿色弱）和Achromatopsia（全色盲）。模拟效果通过Canvas像素处理实现，底层基于Machado等人（2009）的生理学模拟模型的JavaScript实现。技术上，使用HTML5 Canvas的getImageData/putImageData API逐像素应用色彩转换矩阵，确保模拟的准确性。

所有模拟结果旁标注"近似模拟 - 实际体验因人而异"的提示文字，呼应Flatla与Gutwin研究中关于个体差异的发现。

**模块三：对比度检测区（Contrast Checker Panel）**

用户可从图片中采样两个颜色（前景色与背景色），或手动输入/选择两个颜色值。系统即时计算并展示以下信息：两个颜色的可视化对比预览（背景上显示文字的实际效果）、WCAG对比度比率数值（精确到小数点后两位）、WCAG AA和AAA级别的通过/不通过状态（分别针对正常文本与大文本），以及各状态使用颜色编码直观呈现（绿色=通过，黄色=仅通过AA或大文本，红色=未通过任何级别）。

对比度计算公式实现WCAG 2.1标准的相对亮度（Relative Luminance）公式：L = 0.2126 × R + 0.7152 × G + 0.0722 × B（其中RGB值需先进行sRGB伽马校正），对比度比率 = (L1 + 0.05) / (L2 + 0.05)，L1为较亮颜色的相对亮度，L2为较暗颜色的相对亮度。

**模块四：结果与建议区（Results & Suggestions Panel）**

该模块提供简洁明了的文字反馈。当对比度未通过WCAG标准时，系统自动生成改进建议（如"建议将文字颜色加深"或"建议增大字号至18pt以上以满足大文本要求"）。建议内容基于WCAG标准的阈值反向计算得出，帮助非专业用户快速定位改进方向。这一功能直接响应了Angerbauer等人（2022）研究中"在内容创作流程中嵌入自动化可访问性检查"的建议。

#### 4.3 界面布局与交互流程

整体界面采用三栏式响应式布局（桌面端三栏并排，移动端纵向堆叠）。左侧为输入区，中部为预览区，右侧为对比度检测及建议区。界面使用中性灰白色调，避免干扰用户对色彩的判断。

关键交互流程如下：用户通过上传图片或选择颜色开始 → 中部预览区立即显示原图和默认CVD模拟（Deuteranopia，最常见的CVD类型）→ 用户切换模拟类型，预览实时更新 → 用户在图片上点击采样两个颜色（或手动输入）→ 右侧面板即时显示对比度结果和WCAG达标状态 → 若未达标，建议区自动给出改进方向。

#### 4.4 技术可行性

本项目的技术栈为纯前端实现：HTML5 + CSS3 + JavaScript（ES6+）。核心功能不依赖后端服务，所有图像处理在客户端完成（Canvas API），保障用户隐私并实现零延迟响应。项目组成员已具备HTML/CSS/JS基础开发能力，能够独立完成"Hello World"级别的网页应用开发。色盲模拟算法的核心是线性代数矩阵变换，相关开源库（如@cantoo/color-blindness，基于Brettel-Viénot-Mollon算法的TypeScript库）可供参考。WCAG对比度计算公式为确定性数学运算，实现难度低。整体技术方案可行性强，风险可控。

#### 4.5 与客户访谈和文献的整合

本设计方案中的"图片上传+采样"交互模式直接来源于客户访谈中4名受访者提出的"上传图片即可分析"的需求；界面的一体化设计响应了访谈中"简单直观"和"一键检测"的高频需求。文献方面，Angerbauer等人的研究验证了工具的必要性和应用场景；Flatla与Gutwin关于个体差异的研究促使我们在模拟结果旁加入免责说明；Machado等人的模型为模拟算法提供了科学依据。

#### 4.6 招募用户测试计划

计划招募8至10名目标用户进行可用性测试，招募渠道为校内社交媒体群组和课程QQ/微信群。入选标准为：在校本科生或研究生，有PPT制作经验，无专业设计背景，无色盲/色弱（确保能评价模拟画面的逼真度）。另计划邀请1至2名色觉缺陷者参与测试，以获取真实用户对模拟准确性的反馈。

#### 4.7 测试任务设计

测试将采用"出声思考法"（Think-Aloud Protocol），安排每位参与者完成以下五项任务：任务一，上传一张自己制作的PPT截图并查看Deuteranopia模拟效果，口头描述与原图的差异；任务二，切换至三种不同的CVD模拟类型，比较它们之间的视觉差异；任务三，使用颜色拾取器从图片中选取文字颜色和背景颜色，查看对比度检测结果；任务四，判断该对比度是否通过WCAG AA标准；任务五，根据系统建议，尝试调整颜色直至对比度通过AA标准。每项任务完成后记录任务完成时间和成功率，测试后通过SUS量表（System Usability Scale）采集主观满意度评分。

#### 4.8 编程开发工作

项目涉及的编程开发工作包括：HTML页面结构搭建与CSS响应式布局；图片上传与拖拽交互的JavaScript实现；基于Canvas的图像像素处理管道（含sRGB伽马校正、线性RGB转换、CVD模拟矩阵运算、sRGB逆变换）；WCAG相对亮度与对比度比率计算函数；多类型CVD模拟切换控制逻辑；颜色拾取（图片像素采样）交互实现；对比度达标状态的判定与颜色编码UI渲染；改进建议的自动生成逻辑；localStorage存储用户偏好设置（默认模拟类型等）；移动端适配与跨浏览器兼容性测试（Chrome/Firefox/Edge）。项目整体预估代码量约1500至2000行，技术难度适中，匹配三星级工作量评级。

v1.1版本新增功能包括：统一Toast通知组件（支持success/error/warning/info四种类型）；截图按钮加载状态动画（旋转spinner + 成功√反馈）；HEX色值输入格式校验与错误提示（红框闪烁 + 抖动动画）；键盘快捷键可视面板（按?键弹出速查表）；移除图片确认对话框；颜色取样历史记录面板（最近5次采样，可点击恢复）；CVD类型按钮微型色条预览（四色条展示模拟效果）；五步流程引导指示器；一键复制检测报告功能；全局键盘事件监听（Esc关闭面板、R重置截图）。实际总代码量约2200行，由两位开发者协作完成（韩宇负责网页版约1380行，王韩负责扩展版约820行）。

---

## 附录A：客户访谈摘要

本附录提供客户访谈的核心发现摘要（不计入正文篇幅），完整逐字稿可应要求提供。

**受访者概况：**
- 受访者A：大二学生，计算机专业，每周制作2至3次PPT
- 受访者B：大三学生，设计专业，有Figma使用经验
- 受访者C：研一学生，工科专业，每周制作实验报告图表
- 受访者D：初级前端开发者，1年工作经验
- 受访者E：初级UI设计师，半年工作经验
- 受访者F：大四学生，经常制作社团海报和网页

**关键发现摘要：**

1. 色彩无障碍意识普遍薄弱：6名受访者中仅受访者E（初级UI设计师）曾主动考虑色盲用户的可访问性问题，其余5人均表示"从未想过这个问题"或"不知道怎么做"。

2. 现有工具使用率极低：5人从未使用过任何色彩无障碍检测工具，原因集中于"不知道该用什么工具"（3人）和"现有工具太专业"（2人）。受访者E使用过Stark插件但表示"学习成本高，日常不会特意打开"。

3. 用户期望功能排名：实时色盲模拟预览（6/6人提到）、简单直观的操作界面（5/6）、上传图片分析（4/6）、对比度一键检测（4/6）、中文界面（5/6）。

4. 受访者B特别提到："我做PPT就是赶时间完成的，如果有一个网站上传截图就能看效果、还能告诉我颜色合不合格，我肯定会用。"受访者D表示："希望结果通俗易懂，不要给我一堆数值让我自己判断。"

5. 受访者A和F提到，如果有这样一个工具，他们愿意在上课前做PPT时花3至5分钟检查关键页面的可读性。

---

## 参考文献

1. Angerbauer, K., Rodrigues, N., Cakmak, S., Oey, H., Pflüger, H., Merz, A., Weiskopf, D., & Sedlmair, M. (2022). Accessibility for Color Vision Deficiencies: Challenges and Findings of a Large Scale Study on Paper Figures. *Proceedings of the 2022 CHI Conference on Human Factors in Computing Systems (CHI '22)*, Article 135, 1–14. https://doi.org/10.1145/3491102.3502133

2. Flatla, D. R., & Gutwin, C. (2012). SSMRecolor: Improving Recoloring Tools with Situation-Specific Models of Color Differentiation. *Proceedings of the SIGCHI Conference on Human Factors in Computing Systems (CHI '12)*, 2297–2306. https://doi.org/10.1145/2207676.2208388

3. Machado, G. M., Oliveira, M. M., & Fernandes, L. A. F. (2009). A Physiologically-based Model for Simulation of Color Vision Deficiency. *IEEE Transactions on Visualization and Computer Graphics*, 15(6), 1291–1298. https://doi.org/10.1109/TVCG.2009.113

4. Shneiderman, B., Plaisant, C., Cohen, M., Jacobs, S., Elmqvist, N., & Diakopoulos, N. (2016). *Designing the User Interface: Strategies for Effective Human-Computer Interaction* (6th ed.). Pearson.

5. W3C. (2018). Web Content Accessibility Guidelines (WCAG) 2.1. https://www.w3.org/TR/WCAG21/

6. Viénot, F., Brettel, H., & Mollon, J. D. (1999). Digital Video Colourmaps for Checking the Legibility of Displays by Dichromats. *Color Research & Application*, 24(4), 243–252. https://doi.org/10.1002/(SICI)1520-6378(199908)24:4<243::AID-COL5>3.0.CO;2-3

7. Coblis — Color Blindness Simulator. https://www.color-blindness.com/coblis-color-blindness-simulator/

8. Color Oracle. https://colororacle.org/

9. DaltonLens — Online Color Blindness Simulator. https://daltonlens.org/colorblindness-simulator

10. WebAIM Contrast Checker. https://webaim.org/resources/contrastchecker/

---

*提案撰写日期：2026年5月28日*
*小组成员：[姓名1]、[姓名2]、[姓名3]*
*负责人（提案撰写）：[你的姓名]*
