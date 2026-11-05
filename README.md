# AI 每日 · 每天 5 分钟，跟上 AI

一个面向 AI 初学者的每日资讯 + 学习网站：每天更新模型发布、政策监管、行业动态与前沿研究，右侧速览栏用 100 字抓住每条的核心；8 节从零开始的学习课程带进度条，阅读记录可查可删。

纯静态网页，无任何依赖，数据保存在浏览器 localStorage。

## 在线访问

GitHub Pages：`https://<你的用户名>.github.io/ai-daily/`

## 每日更新资讯

所有资讯在 `assets/data.js` 的 `NEWS` 数组里，按日期分组、最新在前：

```js
{
  id: '20261105-hy4',          // 唯一 ID：日期 + 英文标识
  date: '2026-11-05',          // YYYY-MM-DD
  time: '09:20',               // HH:MM
  cat: '模型发布',              // 模型发布 / 政策监管 / 行业动态 / 前沿研究
  title: '...',
  excerpt: '...',              // 列表卡片摘要
  summary: '...',              // 右侧速览栏核心内容，≤ 100 字
  source: '媒体名',
  url: 'https://...',          // 没有确切链接就留空字符串
  minutes: 3,                  // 预计阅读时长
  body: [ { h: '小标题', p: '正文段落' } ],
  points: ['要点1', '要点2', '要点3'],
  why: '为什么值得注意'
}
```

写完跑一下校验：

```bash
node scripts/check.js
```

## 目录结构

```
index.html          入口
assets/style.css    样式
assets/data.js      资讯与课程数据（每日更新这个文件）
assets/app.js       渲染与交互逻辑
scripts/check.js    数据校验脚本
```
