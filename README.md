# career-ops 中国版

> 基于 Claude Code 的 AI 驱动求职自动化工作流 — 评估offer、生成简历、自动扫岗、追踪申请，专为中国求职市场本地化定制。

[中国本地化版](README.md) | [English original](README.en.md) | [原版简中翻译](README.cn.md)

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-000?style=flat&logo=anthropic&logoColor=white)](https://claude.ai/code)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

<p align="center">
  <img src="docs/demo.gif" alt="Career-Ops Demo" width="800">
</p>

## 这是什么

career-ops 将 Claude Code 变成你的全职求职指挥中心。不用手动在 spreadsheet 跟踪申请，AI 驱动的求职流水线：

- **智能评估 offer** — 结构化 A-F 评分体系（10个加权维度）
- **生成 ATS 友好 PDF 简历** — 根据职位描述定制简历，关键词优化
- **自动扫描招聘门户** — 直接访问公司招聘页，提取职位
- **批量处理** — 并行评估多个职位
- **统一追踪** — 完整性检查，去重，状态归一化

> **重要提示：** 这**不是**海投工具。career-ops 是一个过滤器——帮你从数百个职位中找到值得你花时间的少数几个。系统强烈不建议申请评分低于 4.0/5 的职位。你的时间宝贵，猎头的时间也宝贵。投递前务必自己审核。

career-ops 是 Agentic 的：Claude Code 使用 Playwright 导航招聘页面，根据你的简历和职位描述评估匹配度，自适应调整简历。

## 功能特性

| 功能 | 描述 |
|---------|-------------|
| **自动流水线** | 粘贴 URL，获得完整评估 + PDF + 追踪记录 |
| **六模块评估** | 职位摘要、CV 匹配、职级策略、薪酬调研、文化信号、面试准备（STAR+R）|
| **面试故事银行** | 积累 STAR+反思故事，5-10 个核心故事回答任何行为面试问题 |
| **谈判脚本** | 薪资谈判框架，地域溢价反驳，offer 竞争杠杆利用 |
| **ATS PDF 生成** | 注入关键词，专业排版设计 |
| **门户扫描器** | 预配置 **60+ 中国头部科技公司 + 15 家游戏公司**，支持主流招聘网站搜索 |
| **批量处理** | 使用子代理并行评估 |
| **中文本地化** | 完整中文界面，适配中国求职市场生态 |
| **人机协作** | AI 评估推荐，最终决策由你掌控。系统从不自动提交申请 |
| **流水线完整性** | 自动合并、去重、状态归一化、健康检查 |

## 快速开始

```bash
# 1. 克隆并安装依赖
git clone https://github.com/aurumltd/career-ops-cn.git
cd career-ops-cn && npm install
npx playwright install chromium   # PDF 生成和网页扫描需要

# 2. 检查安装
npm run doctor                     # 验证所有前置条件

# 3. 配置
cp config/profile.example-zh.yml config/profile.yml   # 编辑填入你的个人信息
cp templates/portals.cn.example.yml portals.yml        # 中国市场招聘门户模板

# 4. 添加你的简历
# 在项目根目录创建 cv.md，用 markdown 格式写你的简历

# 5. 在 Claude Code 中开始使用
claude   # 在当前目录打开 Claude Code

# 然后让 Claude 帮你完成初始化：
# "帮我完成 career-ops-cn 初始化"

# 6. 使用
# 直接粘贴职位 URL 或者 /career-ops-cn
```

> **系统设计就是让 Claude 自己自定义。** 模式、原型、评分权重、谈判脚本——你只需要让 Claude 改，它能读懂自己用的文件，知道该怎么改。

详见 [docs/SETUP-zh.md](docs/SETUP-zh.md) 完整安装指南。

## 使用方式

career-ops-cn 是一个斜杠命令，支持多种模式：

```
/career-ops-cn                → 显示所有可用命令
/career-ops-cn {粘贴JD/URL}   → 完整自动流水线（评估 + PDF + 追踪）
/career-ops-cn scan           → 扫描招聘门户发现新职位
/career-ops-cn pdf            → 生成 ATS 优化 PDF 简历
/career-ops-cn batch          → 批量并行评估多个职位
/career-ops-cn tracker        → 查看申请状态
/career-ops-cn apply          → 实时填写申请表单 AI 助手
/career-ops-cn pipeline       → 处理待处理 URL 收件箱
/career-ops-cn contacto       → LinkedIn 拓展私信草稿
/career-ops-cn deep           → 深度公司调研
/career-ops-cn training       → 评估课程/证书
/career-ops-cn project        → 评估作品集项目
```

或者直接粘贴职位 URL 或描述——career-ops 自动检测，运行完整流水线。

## 预配置：同时支持中国本地求职 + 全球远程工作

本项目**保留原版所有欧美公司配置**，同时添加完整中国市场本地化支持，你可以同时搜索：

### 🇨🇳 中国市场 — 已添加 70+ 中国头部科技公司

**互联网巨头：** 字节跳动、阿里巴巴、腾讯、百度、美团、拼多多、京东、网易、哔哩哔哩、小红书、快手

**AI 与大模型创业：** 智谱 AI、深度求索 DeepSeek、通义千问、文心一言、豆包、MiniMax、商汤科技、云从科技、旷视科技、摩尔线程、沐曦、聆心智能

**云计算与芯片：** 华为（昇腾 AI）、小米、OPPO、Vivo、寒武纪、阿里云、腾讯云、百度智能云

**自动驾驶与新能源：** 小鹏汽车、理想汽车、蔚来、比亚迪、特斯拉中国、小马智行、文远知行

**游戏公司：** 腾讯游戏、网易游戏、米哈游、莉莉丝游戏、叠纸游戏、鹰角网络、巨人网络、完美世界、心动网络（TapTap）、灵犀互娱、库洛游戏、散爆网络、中手游、FunPlus 趣加、朝夕光年

**金融科技：** 蚂蚁集团、微信支付、陆金所

### 已添加的中国主流招聘网站搜索

- **前程无忧 51job** — 全品类技术岗、算法、前后端开发、产品经理
- **智联招聘** — 大厂社招、中高端技术岗
- **BOSS 直聘** — 互联网大厂直聊、创业团队
- **拉勾网** — 互联网垂直招聘、北上广深杭精选
- **猎聘** — 资深专家、技术管理、总监岗
- **牛客网** — 校招/秋招/春招、应届生求职
- **脉脉** — 职场人脉、内推机会

### 🌍 全球远程

**本项目保留原版项目所有欧美科技公司配置**：Anthropic, OpenAI, Mistral, Cohere, ElevenLabs, Retool, n8n 等 100+ 公司，可以同时搜索远程工作机会。

## 工作原理

```
你粘贴职位 URL 或描述
        │
        ▼
┌──────────────┐
│   原型检测   │  分类：LLMOps / Agentic / 产品 / 架构 / 现场工程师 / 转型
└────────┬─────┘
         │
         ▼
┌──────────────┐
│  A-F 评分评估 │  匹配度、目标对齐、薪酬、文化信号、风险预警
│  (读取 cv.md) │
└────────┬─────┘
         │
     ┌────┼────┐
     ▼    ▼    ▼
  报告   PDF  追踪
  .md   .pdf  .tsv
```

## 项目结构

```
career-ops-cn/
├── CLAUDE.md                    # Agent 指令
├── cv.md                        # 你的简历（在这里创建）
├── article-digest.md            # 你的项目案例摘要（可选）
├── portals.yml                  # 扫描配置（已预配置中国公司）
├── config/
│   └── profile.example.yml      # 个人配置模板
├── modes/                       # 英文原版模式
│   └── zh/                      # 👋 中文本地化模式
│       ├── README.md
│       ├── _shared.md           # 系统上下文
│       ├── 评估.md              # 单个职位评估
│       ├── 申请.md              # 实时申请助手
│       ├── 流水线.md            # 待处理 URL 处理
│       └── 扫描.md              # 门户扫描
├── templates/
│   ├── cv-template.html         # ATS 简历 HTML 模板
│   ├── portals.example.yml      # 扫描配置模板
│   └── states.yml               # 标准状态定义
├── batch/
│   ├── batch-prompt.md          # 批量处理子代理提示
│   └── batch-runner.sh          # 编排脚本
├── dashboard/                   # Go TUI 流水线查看器
├── data/                        # 你的追踪数据（gitignore）
├── reports/                     # 评估报告（gitignore）
├── output/                      # 生成 PDF（gitignore）
└── fonts/                       # 字体文件
```

## 启用中文模式

在 `config/profile.yml` 中添加：

```yaml
language:
  modes_dir: modes/zh
```

之后所有输出都会使用中文，适配中国求职市场。

## 技术栈

- **Agent**: Claude Code 技能 + 子代理并行
- **PDF 生成**: Playwright + HTML 模板
- **扫描器**: Playwright 直接抓取 + 站点搜索
- **仪表盘**: Go + Bubble Tea + Lipgloss（Catppuccin Mocha 主题）
- **数据**: Markdown 表格 + YAML 配置 + TSV 批量文件

## 中国大厂官网爬虫 `scan-cn.mjs`

专为中国招聘市场优化的独立爬虫脚本，绕过第三方 ATS 直接访问大厂官网。

已预配置 20 家中国头部科技公司招聘官网，通过 API 或 DOM 抓取职位信息。

### 爬虫脚本使用

```bash
# 单公司扫描
npm run scan:cn -- bytedance
npm run scan:cn -- tencent
npm run scan:cn -- meituan

# 多公司扫描（已修复竞态问题，可并行）
npm run scan:cn -- bytedance tencent meituan

# dry-run 模式（不写入文件，只打印结果）
npm run scan:cn -- bytedance --dry-run

# 调试模式（headless 浏览器 + 打印 API 响应结构 + 页面内容）
npm run scan:cn -- bytedance --debug

# 列出支持的所有公司
node scan-cn.mjs --list
```

### 调试指南

如果抓不到职位，先用 `--debug` 模式定位问题：

```bash
npm run scan:cn -- bytedance --debug
```

调试模式会输出：
- 📡 所有捕获的 XHR/API 请求 URL
- 🔍 命中 `apiPattern` 的请求详细结构（顶层字段、数组长度、首项字段）
- 📄 页面 body 前 1000 字（判断是否真的加载了职位列表）
- 🔗 页面前 20 个链接（含 job/position/recruit 的链接）

常见问题定位：
1. **没抓到 API 请求** → 检查 `apiPattern` 正则是否匹配真实 URL
2. **API 有请求但没提取到职位** → 检查数据路径是否匹配（如腾讯用 `data?.Data?.Posts`）
3. **API 没数据但 DOM 有职位** → 检查 `selectors.jobItem` 是否匹配页面真实结构
4. **需要可视化调试** → 可以用 `--headed` 参数启动可见浏览器

### 扩展新公司

1. 在 `portals.yml` 的 `tracked_companies` 添加公司配置：
   ```yaml
   - name: 你的公司
     enabled: true
     careers_url: https://careers.yourcompany.com
     market: cn
     source_type: official
   ```

2. （可选）在 `scan-cn.mjs` 的 `ADAPTER_IMPLEMENTATIONS` 添加适配：
   - `apiPattern`: API URL 正则
   - `selectors`: DOM 选择器
   - `buildUrl(job)`: 根据 job 对象构建详情页 URL
   - `triggerList(page)`: 触发列表加载的操作

3. 用 `--debug` 模式验证抓取效果

## 自定义

- **添加公司**：在 `portals.yml` 的 `tracked_companies` 添加
- **调整关键词**：修改 `title_filter.positive`/`negative` 过滤职位
- **改评分权重**：修改 `modes/zh/_shared.md`
- **改个人偏好**：在 `modes/_profile.md` 添加你的职业原型

## ⚠️ 使用原则 — 设计理念

**本工具不是海投工具，而是你的「职位过滤器」** —— 帮你从数百个职位中筛选出少数真正值得投递的机会，节约你和招聘方双方的时间。

系统遵循以下设计原则：

- ✋ **AI 绝不自动提交申请** —— AI 可以帮你评估职位、定制简历、填写申请表单草稿，但「是否投递」的最终决定权**永远在你手中**。点击提交前一定会停止，由你审核后手动操作。
- 🎯 **只推荐高匹配度职位** —— 如果综合评分低于 **4.0/5**，系统会明确建议你不要申请。你的时间宝贵，猎头的时间也宝贵。
- 💯 **质量优先于数量** —— 精准投递 5 家匹配度高的公司，胜过泛泛海投 50 家不匹配的职位。系统会引导你聚焦少数优质机会。
- 🤝 **尊重猎头的时间** —— 只推荐真正匹配你背景的职位，不发送垃圾申请浪费他人精力。

## 许可证

MIT License — 详见 [LICENSE](LICENSE)

## 致谢

基于 [santifer/career-ops](https://github.com/santifer/career-ops) 项目，针对中国求职市场进行了本地化改造，添加了完整中文支持和中国科技公司预配置。

原作者 Santiago 用这个系统评估了 740+ 职位，生成了 100+ 定制简历，最终拿到了 Head of Applied AI 职位。感谢原作者的优秀工作！
