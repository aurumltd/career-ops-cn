#!/usr/bin/env node

/**
 * scan-cn.mjs — 中国大厂官网职位专用爬虫
 *
 * 专门针对中国互联网公司招聘官网优化，不依赖第三方 ATS：
 * - 字节跳动: jobs.bytedance.com/experienced
 * - 腾讯: careers.tencent.com
 * - 阿里巴巴: talent.alibaba.com/experienced
 * - 百度: talent.baidu.com/jobs/social
 * - 美团: zhaopin.meituan.com/web/home
 *
 * 特性：
 * - 自动识别并点击"社会招聘"/"社招"标签
 * - XHR/API 监听优先，DOM 解析兜底
 * - 反爬检测：验证码、人机验证自动退避
 * - 中文职位标题 + URL + 地点 提取
 * - 自动去重（对比 scan-history.tsv）
 * - 输出直接追加到 data/pipeline.md
 *
 * Usage:
 *   node scan-cn.mjs                    # 扫描所有已启用的大厂
 *   node scan-cn.mjs bytedance tencent  # 只扫描指定公司
 *   node scan-cn.mjs --list             # 列出支持的公司
 *   node scan-cn.mjs --dry-run          # 不写入文件，只打印结果
 */

import { chromium } from 'playwright';
import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const HISTORY_FILE = join(DATA_DIR, 'scan-history.tsv');
const PIPELINE_FILE = join(DATA_DIR, 'pipeline.md');

// 日期过滤：超过 MAX_DAYS 天的职位自动过滤（默认30天）
const MAX_DAYS = 30;

// ============================================================================
// 大厂 Adapter 实现（与 portals.yml 配置合并使用）
// ============================================================================

// 内置实现细节（selectors, buildUrl, apiPattern 等），通过 company name 匹配 portals.yml
const ADAPTER_IMPLEMENTATIONS = {
  '字节跳动': {
    baseUrl: 'https://jobs.bytedance.com/experienced/position',
    socialRecruitText: ['社会招聘', '社招', 'experienced'],
    apiPattern: /job_post|api.*position|api.*job|api.*search/i,
    // 触发职位列表加载的操作
    async triggerList(page) {
      await page.waitForTimeout(2000);
      // 点击搜索按钮触发搜索
      try {
        const searchBtn = await page.locator('button:has-text("搜索"), button:has-text("Search"), .search-btn, [class*="searchButton"]').first();
        if (await searchBtn.isVisible({ timeout: 2000 })) {
          await searchBtn.click();
          await page.waitForTimeout(2500);
        }
      } catch (e) {}
      // 滚动触发加载
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
    },
    buildUrl: (job) => {
      if (job.url || job.positionUrl) return job.url || job.positionUrl;
      if (job.id || job.jobId || job.positionId || job.jobPostId || job.job_post_id) {
        return `https://jobs.bytedance.com/experienced/position/${job.id || job.jobId || job.positionId || job.jobPostId || job.job_post_id}`;
      }
      return null;
    },
    selectors: {
      jobItem: 'a[href*="/position/"], div[class*="job-item"], div[class*="position-item"], div[class*="card"]',
      title: 'h3, .title, [class*="name"]',
      url: 'a[href*="/position/"]',
      location: '[class*="location"], [class*="place"], [class*="city"]'
    }
  },
  '腾讯': {
    baseUrl: 'https://careers.tencent.com/search.html',
    socialRecruitText: ['社会招聘', '社招'],
    apiPattern: /search\.html|api.*job|api.*position|tmsearch|\/post\//i,
    async triggerList(page) {
      await page.waitForTimeout(3000);
      // 滚动触发加载
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    },
    buildUrl: (job) => {
      if (job.PostURL) return job.PostURL;
      if (job.url || job.positionUrl) return job.url || job.positionUrl;
      if (job.PostId || job.id || job.jobId || job.recruitPostId || job.postId) {
        return `https://careers.tencent.com/jobdetail.html?postId=${job.PostId || job.id || job.jobId || job.recruitPostId || job.postId}`;
      }
      return null;
    },
    selectors: {
      jobItem: 'a[href*="/jobdetail"], div[class*="recruit-list"], div[class*="job-item"]',
      title: 'h4, .title, [class*="name"]',
      url: 'a[href*="/jobdetail"]',
      location: '[class*="location"], [class*="place"], [class*="city"]'
    }
  },
  '阿里巴巴': {
    baseUrl: 'https://talent.alibaba.com',
    socialRecruitText: ['社会招聘', '社招', 'experienced'],
    apiPattern: /api.*job|api.*position|api.*search/i,
    buildUrl: (job) => {
      if (job.url || job.positionUrl) return job.url || job.positionUrl;
      if (job.id || job.jobId) return `https://talent.alibaba.com/job/${job.id || job.jobId}`;
      return null;
    },
    selectors: {
      jobItem: 'a[href*="/job/"], div[class*="job-item"], div[class*="position-card"]',
      title: 'h3, .title, [class*="name"]',
      url: 'a[href*="/job/"]',
      location: '[class*="location"], [class*="place"], [class*="city"]'
    }
  },
  '百度': {
    baseUrl: 'https://talent.baidu.com/jobs/social',
    socialRecruitText: ['社会招聘', '社招', 'social'],
    apiPattern: /api.*job|api.*position|api.*search|recruit/i,
    async triggerList(page) {
      await page.waitForTimeout(4000);
      // 滚动到底部触发加载更多
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    },
    buildUrl: (job) => {
      if (job.url || job.positionUrl) return job.url || job.positionUrl;
      if (job.id || job.jobId || job.positionId) {
        return `https://talent.baidu.com/job/${job.id || job.jobId || job.positionId}`;
      }
      return null;
    },
    selectors: {
      jobItem: 'a[href*="/job/"], div[class*="job-item"], div[class*="position-card"]',
      title: 'h3, .title, [class*="name"]',
      url: 'a[href*="/job/"]',
      location: '[class*="location"], [class*="place"], [class*="city"]'
    }
  },
  '美团': {
    baseUrl: 'https://zhaopin.meituan.com',
    socialRecruitText: ['社会招聘', '社招', 'experienced'],
    apiPattern: /api.*job|api.*position|api.*search|open\/job/i,
    buildUrl: (job) => {
      if (job.url || job.positionUrl) return job.url || job.positionUrl;
      if (job.jobUnionId) return `https://zhaopin.meituan.com/web/job/${job.jobUnionId}`;
      if (job.id || job.jobId) return `https://zhaopin.meituan.com/web/job/${job.id || job.jobId}`;
      return null;
    },
    extractLocation: (job) => {
      if (Array.isArray(job.cityList) && job.cityList.length > 0) {
        return job.cityList.map(c => c.name).join(', ');
      }
      return job.location || job.city || job.workLocation || null;
    },
    selectors: {
      jobItem: 'a[href*="/job/"], div[class*="job-item"], div[class*="position-card"]',
      title: 'h3, .title, [class*="name"]',
      url: 'a[href*="/job/"]',
      location: '[class*="location"], [class*="place"], [class*="city"]'
    }
  }
};

// 默认 fallback 配置（当 portals.yml 中的公司没有内置实现时使用）
const DEFAULT_IMPLEMENTATION = {
  socialRecruitText: ['社会招聘', '社招', 'experienced'],
  apiPattern: /api.*job|api.*position|api.*search|job.*list/i,
  buildUrl: (job) => job.url || job.positionUrl || null,
  selectors: {
    jobItem: 'a[href*="job"], a[href*="position"], div[class*="job"], div[class*="position"]',
    title: 'h3, h4, .title, [class*="name"]',
    url: 'a[href*="job"], a[href*="position"]',
    location: '[class*="location"], [class*="place"], [class*="city"], [class*="address"]'
  }
};

// 全局配置变量
let ADAPTERS = {};
let TITLE_FILTER = {
  positive: [/AI|人工智能|大模型|LLM|Agent/i],
  negative: []
};

// 从 portals.yml 加载配置，与内置实现合并
async function loadPortalsConfig() {
  const portalsPath = join(__dirname, 'portals.yml');
  if (!existsSync(portalsPath)) {
    console.warn('⚠️  未找到 portals.yml，使用默认配置');
    return;
  }

  const content = await readFile(portalsPath, 'utf-8');
  const config = yaml.load(content);

  // 加载标题过滤关键词
  if (config.title_filter && config.title_filter.positive) {
    const positivePatterns = Array.isArray(config.title_filter.positive)
      ? config.title_filter.positive
      : Object.values(config.title_filter.positive).flat();

    TITLE_FILTER.positive = positivePatterns.map(p => {
      if (p instanceof RegExp) return p;
      // 将字符串转换为大小写不敏感的正则
      return new RegExp(String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    });
  }

  if (config.title_filter && config.title_filter.negative) {
    const negativePatterns = Array.isArray(config.title_filter.negative)
      ? config.title_filter.negative
      : Object.values(config.title_filter.negative).flat();

    TITLE_FILTER.negative = negativePatterns.map(p => {
      if (p instanceof RegExp) return p;
      return new RegExp(String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    });
  }

  if (!config.tracked_companies || !Array.isArray(config.tracked_companies)) {
    console.warn('⚠️  portals.yml 中未找到 tracked_companies 配置');
    return;
  }

  // 筛选中国市场、官网直连、已启用的公司
  const cnCompanies = config.tracked_companies.filter(
    c => c.enabled && c.market === 'cn' && c.source_type === 'official' && c.careers_url
  );

  for (const company of cnCompanies) {
    // 通过公司名匹配内置实现
    const nameKey = Object.keys(ADAPTER_IMPLEMENTATIONS).find(k =>
      company.name.includes(k) || k.includes(company.name.split(' ')[0])
    );
    const impl = nameKey ? ADAPTER_IMPLEMENTATIONS[nameKey] : DEFAULT_IMPLEMENTATION;

    // 生成 key：公司名转小写、去空格、去特殊字符
    const key = company.name.toLowerCase().replace(/[^a-z0-9]/g, '') ||
                company.name.toLowerCase().replace(/\s+/g, '_');

    ADAPTERS[key] = {
      name: company.name,
      url: company.careers_url,
      keywords: company.keywords,
      ...impl
    };
    // 内置实现的 URL 优先于 portals.yml
    if (impl.baseUrl) {
      ADAPTERS[key].url = impl.baseUrl;
    }
  }

  console.log(`📦 从 portals.yml 加载了 ${Object.keys(ADAPTERS).length} 个中国市场公司配置`);
  console.log(`🔍 标题过滤关键词: ${TITLE_FILTER.positive.length} 个正向, ${TITLE_FILTER.negative.length} 个负向`);
}

// ============================================================================
// 反爬检测 & 中文关键词
// ============================================================================

const CAPTCHA_PATTERNS = [
  /请完成.*验证|需要验证/i,
  /滑动验证|滑块验证/i,
  /access denied|403 forbidden/i
];

const EXPIRED_PATTERNS_CN = [
  /职位已过期|招聘已截止|职位已结束/i,
  /页面不存在|404|Not Found/i
];

const AI_KEYWORDS = [
  /AI|人工智能|大模型|LLM|Agent/i,
  /算法|算法工程师|机器学习|深度学习/i,
  /产品经理|PM|产品/i,
  /NLP|推荐|搜索|CV|视觉/i
];

// ============================================================================
// 岗位去重功能
// ============================================================================

// 来源优先级：官网 > 大平台 > 猎头
const SOURCE_PRIORITY = {
  'official': 100,
  'tencent': 95,
  'bytedance': 95,
  'alibaba': 95,
  'baidu': 95,
  'meituan': 95,
  'liepin': 50,
  'zhipin': 40,
  'lagou': 40,
  '51job': 35,
  'zhaopin': 35,
  'maimai': 20,
  'search_only': 10
};

/**
 * 计算字符串相似度（Levenshtein编辑距离）
 */
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / longerLength;
}

/**
 * 解析发布日期字符串（支持中文格式）
 */
function parsePublishDate(dateStr) {
  if (!dateStr) return null;

  try {
    // 格式: "2024-01-15", "2024/01/15"
    if (dateStr.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
      return new Date(dateStr.replace(/\//g, '-'));
    }

    // 格式: "1天前", "3小时前", "昨天", "今天"
    const daysMatch = dateStr.match(/(\d+)天前/);
    if (daysMatch) {
      const d = new Date();
      d.setDate(d.getDate() - parseInt(daysMatch[1]));
      return d;
    }

    const hoursMatch = dateStr.match(/(\d+)小时前/);
    if (hoursMatch) {
      const d = new Date();
      d.setHours(d.getHours() - parseInt(hoursMatch[1]));
      return d;
    }

    if (dateStr.includes('昨天')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    }

    if (dateStr.includes('今天')) {
      return new Date();
    }

    // 格式: "01-15" (当年)
    const monthDay = dateStr.match(/(\d{1,2})-(\d{1,2})/);
    if (monthDay) {
      const d = new Date();
      d.setMonth(parseInt(monthDay[1]) - 1, parseInt(monthDay[2]));
      return d;
    }
  } catch (e) {
    return null;
  }

  return null;
}

/**
 * 过滤过期职位
 */
function filterExpiredJobs(jobs) {
  const now = new Date();
  const freshJobs = [];
  const expiredJobs = [];

  for (const job of jobs) {
    const publishDate = parsePublishDate(job.publishDate);

    if (publishDate) {
      const daysDiff = (now - publishDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > MAX_DAYS) {
        expiredJobs.push(job);
        continue;
      }
    }

    // 没有日期信息的职位暂时保留
    freshJobs.push(job);
  }

  if (expiredJobs.length > 0) {
    console.log(`   🕒 日期过滤了 ${expiredJobs.length} 个超过 ${MAX_DAYS} 天的职位`);
    expiredJobs.slice(0, 5).forEach(j => {
      console.log(`      - 过期: ${j.title} @ ${j.company} (${j.publishDate})`);
    });
    if (expiredJobs.length > 5) {
      console.log(`      ... 还有 ${expiredJobs.length - 5} 个`);
    }
  }

  return freshJobs;
}

/**
 * 提取岗位特征向量
 */
function extractFeatures(job) {
  return {
    titleClean: job.title
      .replace(/【|】|\[|\]/g, '')
      .replace(/(高级|资深|专家|初级|实习|校招|社招)/g, '')
      .trim()
      .toLowerCase(),
    company: job.company?.toLowerCase() || '',
    location: job.location?.toLowerCase() || '',
    salary: job.salary || '',
    source: job.source || 'unknown',
    publishDate: job.publishDate || ''
  };
}

/**
 * 判断两个岗位是否为同一岗位
 * 阈值：标题相似度 > 0.7 且 公司相同 且 地点相同
 */
function isSameJob(jobA, jobB) {
  const fA = extractFeatures(jobA);
  const fB = extractFeatures(jobB);

  // 标题相似度阈值
  const titleSimilarity = similarity(fA.titleClean, fB.titleClean);
  if (titleSimilarity < 0.7) return false;

  // 公司名称匹配（允许部分匹配，比如"字节跳动"和"字节"）
  const companySimilarity = similarity(fA.company, fB.company);
  if (companySimilarity < 0.5 &&
      !fA.company.includes(fB.company) &&
      !fB.company.includes(fA.company)) {
    return false;
  }

  // 地点匹配（至少城市级匹配）
  if (fA.location && fB.location) {
    const cityMatch = fA.location.slice(0, 2) === fB.location.slice(0, 2); // 取前两个字，如"北京"、"上海"
    if (!cityMatch) return false;
  }

  return true;
}

/**
 * 岗位去重
 * 保留来源优先级最高的岗位
 */
function deduplicateJobs(jobs) {
  if (jobs.length <= 1) return jobs;

  const uniqueJobs = [];
  const duplicates = [];

  for (const job of jobs) {
    let isDuplicate = false;
    let duplicateIndex = -1;

    // 检查是否与已保留的岗位重复
    for (let i = 0; i < uniqueJobs.length; i++) {
      if (isSameJob(job, uniqueJobs[i])) {
        isDuplicate = true;
        duplicateIndex = i;
        break;
      }
    }

    if (isDuplicate) {
      // 比较来源优先级，保留优先级更高的
      const existingPriority = SOURCE_PRIORITY[uniqueJobs[duplicateIndex].source] || 0;
      const newPriority = SOURCE_PRIORITY[job.source] || 0;

      if (newPriority > existingPriority) {
        duplicates.push(uniqueJobs[duplicateIndex]);
        uniqueJobs[duplicateIndex] = job;
      } else {
        duplicates.push(job);
      }
    } else {
      uniqueJobs.push(job);
    }
  }

  if (duplicates.length > 0) {
    console.log(`   🧹 去重过滤了 ${duplicates.length} 个重复岗位`);
    duplicates.forEach(d => {
      console.log(`      - 重复: ${d.title} @ ${d.company} (${d.source})`);
    });
  }

  return uniqueJobs;
}

// ============================================================================
// 历史记录管理
// ============================================================================

async function loadHistory() {
  if (!existsSync(HISTORY_FILE)) return new Set();
  const content = await readFile(HISTORY_FILE, 'utf-8');
  const urls = new Set();
  content.split('\n').forEach(line => {
    const parts = line.split('\t');
    if (parts[0]) urls.add(parts[0]);
  });
  return urls;
}

async function appendToHistory(job, source) {
  const line = `${job.url}\t${new Date().toISOString().split('T')[0]}\t${source}\t${job.title}\t${job.company}\tadded\n`;
  await appendFile(HISTORY_FILE, line);
}

// ============================================================================
// 职位过滤
// ============================================================================

function isRelevantJob(title) {
  // 至少匹配一个正向关键词
  const hasPositive = TITLE_FILTER.positive.some(pattern => pattern.test(title));
  if (!hasPositive) return false;

  // 不能匹配任何负向关键词
  const hasNegative = TITLE_FILTER.negative.some(pattern => pattern.test(title));
  if (hasNegative) return false;

  return true;
}

function isExpiredPage(bodyText) {
  return EXPIRED_PATTERNS_CN.some(pattern => pattern.test(bodyText));
}

function hasCaptcha(bodyText) {
  return CAPTCHA_PATTERNS.some(pattern => pattern.test(bodyText));
}

// ============================================================================
// 通用爬虫逻辑
// ============================================================================

async function scanCompany(page, adapterKey, options = {}) {
  const adapter = ADAPTERS[adapterKey];
  if (!adapter) throw new Error(`Unknown adapter: ${adapterKey}`);

  // 判断是否为 fallback adapter
  const isFallback = !Object.keys(ADAPTER_IMPLEMENTATIONS).some(k =>
    adapter.name.includes(k) || k.includes(adapter.name.split(' ')[0])
  );
  const adapterType = isFallback ? '（通用适配，可能结果不稳定）' : '（已优化）';

  console.log(`\n🔍 扫描 ${adapter.name} ${adapterType}...`);

  const debug = options.debug || false;
  const apiJobs = [];
  const capturedUrls = new Set();

  // 监听 XHR/API 请求（调试模式下记录所有请求）
  const responseHandler = async response => {
    const url = response.url();
    capturedUrls.add(url);

    if (adapter.apiPattern.test(url)) {
      try {
        const body = await response.body();
        const data = JSON.parse(body.toString());

        if (debug) {
          console.log(`   📡 命中 API: ${url}`);
          console.log(`      顶层字段: ${Object.keys(data).join(', ')}`);
          // 打印 data 的前两级结构
          for (const key of Object.keys(data)) {
            const val = data[key];
            if (Array.isArray(val)) {
              console.log(`      ${key}: Array[${val.length}]`);
              if (val.length > 0 && typeof val[0] === 'object') {
                console.log(`        首项字段: ${Object.keys(val[0]).join(', ')}`);
              }
            } else if (val && typeof val === 'object') {
              console.log(`      ${key}: Object {${Object.keys(val).join(', ')}}`);
            } else {
              console.log(`      ${key}: ${typeof val === 'string' ? val.substring(0, 50) : val}`);
            }
          }
        }

        // 尝试从不同的 API 返回格式中提取职位
        let jobList = [];
        if (data?.data?.jobs) jobList = data.data.jobs;
        else if (data?.Data?.Posts) jobList = data.Data.Posts; // 腾讯
        else if (data?.jobs) jobList = data.jobs;
        else if (data?.list) jobList = data.list;
        else if (data?.positions) jobList = data.positions;
        else if (data?.data?.list) jobList = data.data.list;
        else if (data?.data?.positions) jobList = data.data.positions;
        else if (data?.data?.job_post_list) jobList = data.data.job_post_list;
        else if (data?.result?.jobs) jobList = data.result.jobs;
        else if (data?.content?.jobs) jobList = data.content.jobs;
        // 深度查找 jobs 数组
        else {
          const findJobs = (obj, depth = 0) => {
            if (depth > 5 || !obj || typeof obj !== 'object') return null;
            if (Array.isArray(obj.jobs)) return obj.jobs;
            if (Array.isArray(obj.Posts)) return obj.Posts; // 腾讯
            if (Array.isArray(obj.list)) return obj.list;
            if (Array.isArray(obj.positions)) return obj.positions;
            if (Array.isArray(obj.job_post_list)) return obj.job_post_list;
            for (const key of Object.keys(obj)) {
              const found = findJobs(obj[key], depth + 1);
              if (found) return found;
            }
            return null;
          };
          jobList = findJobs(data) || [];
        }

        if (Array.isArray(jobList) && jobList.length > 0) {
          if (debug) {
            console.log(`      找到 ${jobList.length} 个职位`);
            console.log(`      第一个职位所有字段: ${Object.keys(jobList[0]).join(', ')}`);
            const jobPreview = JSON.stringify(jobList[0], null, 2);
            console.log(`      示例值: ${jobPreview.substring(0, 800)}`);
            if (jobPreview.length > 800) console.log(`      ... (截断)`);
          }
          jobList.forEach(job => {
            const location = adapter.extractLocation
              ? adapter.extractLocation(job)
              : (job.location || job.LocationName || job.city || job.workLocation || null);
            apiJobs.push({
              title: job.name || job.RecruitPostName || job.title || job.positionName || job.postName,
              url: adapter.buildUrl ? adapter.buildUrl(job) : (job.PostURL || job.url || job.positionUrl || null),
              location,
              company: adapter.name,
              source: adapterKey
            });
          });
        }
      } catch (e) {
        // 非 JSON 响应，忽略
      }
    }
  };

  page.on('response', responseHandler);

  try {
    await page.goto(adapter.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 尝试点击社招标签
    for (const text of adapter.socialRecruitText) {
      try {
        const element = await page.locator(`text=${text}`).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForTimeout(2000);
          console.log(`   ✅ 已切换到社招页面`);
          break;
        }
      } catch (e) {
        // 找不到就继续
      }
    }

    // 触发职位列表加载（如果 adapter 有配置）
    if (adapter.triggerList) {
      await adapter.triggerList(page);
    }

    // 等待职位列表加载
    await page.waitForTimeout(3000);

    // 获取页面内容（用于调试和检测用）
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');

    // 检查反爬（仅在 API 没抓到数据时才检查）
    if (apiJobs.length === 0) {
      if (hasCaptcha(bodyText)) {
        console.log(`   ⚠️ 检测到验证码，跳过 ${adapter.name}`);
        return { jobs: [], skipped: 'captcha' };
      }
      if (isExpiredPage(bodyText)) {
        console.log(`   ⚠️ 页面已过期，跳过 ${adapter.name}`);
        return { jobs: [], skipped: 'expired' };
      }
    }

    // 调试：输出所有捕获的 URL
    if (debug) {
      console.log(`   📡 共捕获 ${capturedUrls.size} 个请求 URL`);
      const sortedUrls = Array.from(capturedUrls).sort((a, b) => a.length - b.length);
      sortedUrls.slice(0, 10).forEach(url => {
        console.log(`      - ${url.substring(0, 100)}`);
      });
      if (sortedUrls.length > 10) {
        console.log(`      ... 还有 ${sortedUrls.length - 10} 个 URL`);
      }
    }

    // 如果 API 监听有结果，检查是否有有效 URL
    if (apiJobs.length > 0) {
      // 过滤掉无 URL 的职位
      const validApiJobs = apiJobs.filter(job => job.url && job.title);
      console.log(`   ✅ 通过 API 捕获到 ${apiJobs.length} 个职位，其中 ${validApiJobs.length} 个有有效 URL`);

      // 如果 API 返回的职位都有 URL，优先使用
      if (validApiJobs.length > 0) {
        const relevant = validApiJobs.filter(job => isRelevantJob(job.title));
        console.log(`   🎯 其中 ${relevant.length} 个为 AI/算法/产品 相关职位`);
        return { jobs: relevant, count: validApiJobs.length, source: 'api' };
      }
      console.log(`   ⚠️ API 职位均无有效 URL，回退到 DOM 解析`);
    }

    // API 没抓到或无有效 URL，回退到 DOM 解析
    const domJobs = await page.evaluate((sel) => {
      const items = Array.from(document.querySelectorAll(sel.jobItem));
      return items.map(item => {
        const titleEl = item.querySelector(sel.title) || item;
        const urlEl = item.querySelector(sel.url) || item.closest('a');
        const locEl = item.querySelector(sel.location);
        return {
          title: titleEl?.innerText?.trim() || null,
          url: urlEl?.href || null,
          location: locEl?.innerText?.trim() || null,
          company: null
        };
      }).filter(j => j.title && j.url);
    }, adapter.selectors);

    if (domJobs.length === 0) {
      console.log(`   ⚠️ DOM 解析未找到职位，可能需要更新 selector`);
      if (debug) {
        // 调试：打印页面内容和 a 标签
        console.log(`   📄 页面 body 前 1000 字:`);
        const bodyPreview = bodyText.substring(0, 1000).replace(/\s+/g, ' ');
        console.log(`      ${bodyPreview}`);
        console.log();
        // 打印前 20 个 a 标签
        const allLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a')).slice(0, 20).map(a => ({
            text: a.innerText?.trim()?.substring(0, 50),
            href: a.href?.substring(0, 100)
          })).filter(l => l.text || l.href);
        });
        if (allLinks.length > 0) {
          console.log(`   🔗 页面前 ${allLinks.length} 个链接:`);
          allLinks.forEach(l => {
            if (l.href && (l.href.includes('job') || l.href.includes('position') || l.href.includes('recruit'))) {
              console.log(`      ✅ [${l.text}] -> ${l.href}`);
            } else if (l.href) {
              console.log(`         [${l.text}] -> ${l.href}`);
            }
          });
        }
      }
      return { jobs: [], skipped: 'no_selector_match' };
    }

    console.log(`   ✅ 通过 DOM 解析到 ${domJobs.length} 个职位`);
    const relevant = domJobs.filter(job => isRelevantJob(job.title));
    console.log(`   🎯 其中 ${relevant.length} 个为 AI/算法/产品 相关职位`);

    return {
      jobs: relevant.map(j => ({ ...j, company: adapter.name })),
      count: domJobs.length,
      source: 'dom'
    };

  } catch (err) {
    console.log(`   ❌ 扫描失败: ${err.message.split('\n')[0]}`);
    return { jobs: [], skipped: 'error', error: err.message };
  } finally {
    // 移除监听器，防止累积
    page.off('response', responseHandler);
  }
}

// ============================================================================
// Pipeline 输出
// ============================================================================

async function writeToPipeline(jobs, dryRun = false) {
  if (jobs.length === 0) return;

  const lines = jobs.map(job => {
    const loc = job.location ? ` [${job.location}]` : '';
    const sourceTag = job.source ? ` [来源:${job.source}]` : '';
    const isOfficial = SOURCE_PRIORITY[job.source] >= 90 || job.source === 'official';
    const verifiedTag = isOfficial ? ' ✅官网直连' : ' ⚠️第三方来源';
    return `- [ ] ${job.url} | ${job.company} | ${job.title}${loc}${sourceTag}${verifiedTag}`;
  });

  const disclaimer = `
> ⚠️ **来源说明**
> - ✅ 官网直连: 职位直接从公司招聘官网提取，信息实时可靠
> - ⚠️ 第三方来源: 职位来自搜索引擎或招聘平台，可能存在过期、重复、虚假或信息不全
> - 所有职位请点击链接核实详情后再投递，本工具不对信息准确性承担责任
`;

  const dateStr = new Date().toISOString().split('T')[0];
  const content = `\n\n## 待处理 - ${dateStr} 中国大厂扫描\n\n${lines.join('\n')}\n${disclaimer}\n`;

  if (dryRun) {
    console.log('\n📋 扫描结果 (dry-run):');
    console.log(content);
    return;
  }

  // 确保目录存在
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }

  // 读取现有文件并插入到待处理部分
  let existingContent = '# Pipeline\n\n## 待处理\n\n';
  if (existsSync(PIPELINE_FILE)) {
    existingContent = await readFile(PIPELINE_FILE, 'utf-8');
    // 如果有"## 待处理"部分，插入到那下面
    if (existingContent.includes('## 待处理')) {
      existingContent = existingContent.replace(
        /(## 待处理.*?)(?=\n## |$)/s,
        `$1\n${content.replace(/^## 待处理 - .*?\n\n/, '')}`
      );
    } else {
      // 否则添加到开头
      existingContent = '# Pipeline\n\n' + content + '\n\n' + existingContent;
    }
  } else {
    existingContent = '# Pipeline\n\n' + content;
  }

  await writeFile(PIPELINE_FILE, existingContent);

  // 写入历史
  for (const job of jobs) {
    await appendToHistory(job, 'scan-cn');
  }

  console.log(`\n✅ 已追加 ${jobs.length} 个职位到 pipeline.md`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  // 先加载 portals.yml 配置
  await loadPortalsConfig();

  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('scan-cn.mjs — 中国大厂官网职位爬虫\n');
    console.log('Usage:');
    console.log('  node scan-cn.mjs                    # 扫描所有已启用的大厂');
    console.log('  node scan-cn.mjs bytedance tencent  # 只扫描指定公司');
    console.log('  node scan-cn.mjs --list             # 列出支持的公司');
    console.log('  node scan-cn.mjs --dry-run          # 只打印结果，不写入文件');
    console.log('  node scan-cn.mjs --debug            # 调试模式：打印 API 响应、页面结构');
    console.log('  node scan-cn.mjs --headed           # 显示浏览器窗口（可视化调试）');
    console.log('\n支持的公司:');
    Object.keys(ADAPTERS).forEach(k => console.log(`  ${k.padEnd(12)} ${ADAPTERS[k].name}`));
    process.exit(0);
  }

  if (args.includes('--list')) {
    console.log('支持的公司:');
    Object.keys(ADAPTERS).forEach(k => console.log(`  ${k.padEnd(12)} ${ADAPTERS[k].name}`));
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const debug = args.includes('--debug');
  const headed = args.includes('--headed');
  const targets = args.filter(a => !a.startsWith('--'));

  const companies = targets.length > 0
    ? targets.filter(k => Object.keys(ADAPTERS).includes(k))
    : Object.keys(ADAPTERS);

  if (companies.length === 0) {
    console.error('❌ 没有有效的公司代码，请用 --list 查看支持的列表');
    process.exit(1);
  }

  console.log(`=== 🇨🇳 中国大厂职位扫描器 ===`);
  console.log(`目标公司: ${companies.map(c => ADAPTERS[c].name).join(', ')}`);
  console.log(`模式: ${dryRun ? 'dry-run' : '正常写入'}`);
  if (debug) console.log(`调试: 已开启`);
  console.log();

  // 加载历史记录去重
  const history = await loadHistory();
  console.log(`📦 已有历史记录: ${history.size} 个URL`);

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const allJobs = [];
  const stats = { total: 0, relevant: 0, skipped: 0, duplicates: 0 };

  for (const company of companies) {
    // 每个公司使用独立的 page，避免页面跳转互相干扰
    const page = await context.newPage();
    const result = await scanCompany(page, company, { debug });
    await page.close().catch(() => {}); // 关闭页面，忽略错误
    stats.total += result.count || 0;

    if (result.jobs) {
      // 标记来源，用于去重优先级
      const jobsWithSource = result.jobs.map(j => ({
        ...j,
        source: company
      }));

      // URL 级去重
      const newJobs = jobsWithSource.filter(j => j.url && !history.has(j.url));
      allJobs.push(...newJobs);
      stats.relevant += newJobs.length;

      if (newJobs.length < result.jobs.length) {
        console.log(`   🧹 URL去重过滤 ${result.jobs.length - newJobs.length} 个职位`);
      }
    }
    if (result.skipped) stats.skipped++;
  }

  // 日期过滤：过滤超过30天的过期职位
  console.log(`\n🕒 发布日期过滤（超过${MAX_DAYS}天自动过滤）...`);
  const beforeDateFilter = allJobs.length;
  const freshJobs = filterExpiredJobs(allJobs);
  stats.expired = beforeDateFilter - freshJobs.length;

  // 智能去重：内容相似性去重（处理猎头重复发布）
  console.log(`\n🔍 智能去重检测...`);
  const beforeDedup = freshJobs.length;
  const uniqueJobs = deduplicateJobs(freshJobs);
  stats.duplicates = beforeDedup - uniqueJobs.length;

  await browser.close();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`扫描统计: ${stats.total} 总职位, ${stats.relevant} 相关职位, ${stats.expired || 0} 过期职位, ${stats.duplicates} 重复岗位, ${stats.skipped} 公司被跳过`);

  if (uniqueJobs.length > 0) {
    await writeToPipeline(uniqueJobs, dryRun);
  } else {
    console.log('⚠️  没有新增的职位');
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
