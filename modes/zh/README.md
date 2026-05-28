# career-ops 中国求职市场本地化版

## 概述

此目录包含 **career-ops** 针对中国求职市场的本地化版本：

- 完整中文界面和术语
- 适配中国互联网招聘生态
- 包含中国主流科技公司和招聘网站预配置

## 使用方法

### 启用中文模式

在 `config/profile.yml` 中设置：

```yaml
language:
  modes_dir: modes/zh
```

之后所有输出都会使用中文。

### 中国求职市场预配置内容

#### 推荐通过 `templates/portals.cn.example.yml` 启用的中国头部科技公司：

**互联网巨头：**
- 字节跳动 ByteDance（豆包大模型）
- 阿里巴巴 Alibaba
- 腾讯 Tencent（混元大模型）
- 百度 Baidu（文心一言）
- 美团 Meituan
- 拼多多 Pinduoduo
- 京东 JD.com
- 网易 NetEase
- 哔哩哔哩 Bilibili
- 小红书 Xiaohongshu
- 快手 Kuaishou

**AI 与大模型创业公司：**
- 智谱 AI Zhipu AI（GLM）
- 深度求索 DeepSeek
- 通义千问（阿里）
- 文心一言（百度）
- 豆包（字节）
- MiniMax
- 商汤科技 SenseTime
- 云从科技 CloudWalk
- 旷视科技 Megvii

**云计算与芯片：**
- 华为 Huawei（昇腾 AI）
- 小米 Xiaomi
- OPPO
- Vivo
- 寒武纪 Cambricon

**自动驾驶与新能源：**
- 小鹏汽车 Xpeng
- 理想汽车 Li Auto
- 蔚来 Nio
- 比亚迪 BYD
- 特斯拉中国 Tesla China
- 小马智行 Pony.ai
- 文远知行 WeRide

**金融科技：**
- 蚂蚁集团 Ant Group
- 微信支付 WeChat Pay

#### 已添加的中国主流招聘网站搜索：

- **前程无忧 51job** — AI 产品经理、算法工程师、前后端开发
- **智联招聘 Zhaopin** — 各类技术职位搜索
- **BOSS 直聘** — 互联网大厂、AI 相关岗位
- **拉勾 Lagou** — 互联网岗位，北上广深杭精选
- **猎聘 Liepin** — 中高端职位、资深专家岗
- **牛客网 Nowcoder** — 校招秋招春招
- **脉脉 Maimai** — 内推机会

## 文件说明

| 文件 | 功能 |
|------|------|
| `_shared.md` | 系统上下文、评分规则、原型定义（中文） |
| `评估.md` | 单个职位完整 A-F 评估 |
| `申请.md` | 实时申请表单填写助手 |
| `流水线.md` | 处理待处理 URL 收件箱 |
| `扫描.md` | 多门户扫描发现新职位 |

## 适配中国市场的调整

1. **薪酬调研** — 使用看准网、BOSS 直聘替代 Levels.fyi/Glassdoor
2. **求职网站** — 支持国内主流招聘平台
3. **语言本地化** — 所有输出使用地道中文
4. **公司分类** — 按中国科技行业分类整理头部公司

## 自定义

- 在 `config/profile.yml` 中设置你的目标职位、薪资预期、工作地点偏好
- 在 `modes/_profile.md` 中添加你的职业原型、谈判脚本自定义
- 从 `templates/portals.cn.example.yml` 复制到 `portals.yml` 后，再添加你关注的特定公司

## 工作流

```
/career-ops-cn scan     → 扫描所有预配置公司和招聘网站发现新职位
/career-ops-cn pipeline → 处理发现的新职位，逐个评估
/career-ops-cn         → 粘贴 JD 或 URL 直接评估
/career-ops-cn pdf     → 生成 ATS 优化的 PDF 简历
/career-ops-cn tracker → 查看申请追踪
```

## 注意事项

- 原项目的道德使用条款仍然适用：质量优先于数量，不建议海投
- 系统仅做评估和生成内容，**不自动提交申请**，最终始终由用户审核
- 中文模式仅提供语言和市场本地化，核心功能与原版保持一致
