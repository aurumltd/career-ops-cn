# 安装指南

## 前置要求

- 已安装配置 [Claude Code](https://claude.ai/code)
- Node.js 18+（用于 PDF 生成和工具脚本）
- （可选）Go 1.21+（用于终端仪表盘）

## 快速开始（5 步）

### 1. 克隆并安装

```bash
git clone https://github.com/aurumltd/career-ops-cn.git
cd career-ops-cn
npm install
npx playwright install chromium   # PDF 生成和网页扫描需要
```

### 2. 配置个人信息

中文用户推荐使用中文示例配置：

```bash
cp config/profile.example-zh.yml config/profile.yml
```

编辑 `config/profile.yml` 填入你的个人信息：姓名、手机号码、邮箱、目标职位、个人描述、关键项目案例。

**（已经在示例中配置好）启用中文模式：**

```yaml
language:
  modes_dir: modes/zh
```

之后所有输出都会使用中文。

### 3. 添加你的简历

在项目根目录创建 `cv.md`，用 markdown 格式写完整简历。这是所有评估和 PDF 的信息来源。

（可选）创建 `article-digest.md` 存放你的作品集项目/文章的证明要点。

### 4. 配置招聘门户

中国市场建议直接使用中国模板：

```bash
cp templates/portals.cn.example.yml portals.yml
```

如果你需要自定义，编辑 `portals.yml`：
- 更新 `title_filter.positive` 添加你目标职位的关键词
- 在 `tracked_companies` 添加你想跟踪的公司
- 自定义 `search_queries` 适配你偏好的招聘网站

### 5. 开始使用

在当前目录打开 Claude Code：

```bash
claude
```

然后粘贴职位 URL 或描述。career-ops 会自动评估，生成报告，创建定制 PDF，并追踪。

## 可用命令

| 操作 | 方式 |
|--------|-----|
| 评估职位 | 直接粘贴 URL 或 JD 文本 |
| 搜索新职位 | `/career-ops-cn scan` |
| 处理待处理 URL | `/career-ops-cn pipeline` |
| 生成 PDF 简历 | `/career-ops-cn pdf` |
| 批量评估 | `/career-ops-cn batch` |
| 查看追踪状态 | `/career-ops-cn tracker` |
| 填写申请表单 | `/career-ops-cn apply` |

## 验证安装

```bash
npm run doctor      # 检查所有前置条件
node cv-sync-check.mjs      # 检查配置同步
node verify-pipeline.mjs     # 检查流水线完整性
```

## 编译仪表盘（可选）

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard            # 打开 TUI 流水线查看器
```

## 中国市场使用提示

- `templates/portals.cn.example.yml` 已包含一组中国头部科技公司和主流招聘站点查询
- 扫描结果自动去重，过期链接自动过滤
- 评分标准适配国内薪酬水平，使用看准网/BOSS 直聘进行薪酬调研
- 所有输出都是中文，符合国内使用习惯
