/* 数据校验：node scripts/check.js
   自动更新流程最后一步会跑它，确保写进去的数据符合网站要求 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'assets', 'data.js');
const src = fs.readFileSync(file, 'utf8');

let NEWS, LESSONS;
try {
  ({ NEWS, LESSONS } = new Function(src + '; return { NEWS, LESSONS };')());
} catch (e) {
  console.error('✗ data.js 语法错误：' + e.message);
  process.exit(1);
}

const CATS = ['模型发布', '政策监管', '行业动态', '前沿研究'];
const errs = [];
const ids = new Set();

NEWS.forEach((n, i) => {
  const tag = n.id || `#${i}`;
  ['id', 'date', 'time', 'cat', 'title', 'excerpt', 'summary', 'source', 'minutes'].forEach(k => {
    if (!n[k]) errs.push(`${tag} 缺少字段 ${k}`);
  });
  if (ids.has(n.id)) errs.push(`${tag} id 重复`);
  ids.add(n.id);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date || '')) errs.push(`${tag} date 格式应为 YYYY-MM-DD`);
  if (!/^\d{2}:\d{2}$/.test(n.time || '')) errs.push(`${tag} time 格式应为 HH:MM`);
  if (!CATS.includes(n.cat)) errs.push(`${tag} cat 必须是：${CATS.join(' / ')}`);
  if ((n.summary || '').length > 100) errs.push(`${tag} summary ${n.summary.length} 字，超过 100`);
  if (!Array.isArray(n.body) || n.body.length < 2) errs.push(`${tag} body 至少 2 段`);
  else n.body.forEach((b, bi) => { if (!b.p) errs.push(`${tag} body[${bi}] 缺少 p`); });
  if (!Array.isArray(n.points) || n.points.length !== 3) errs.push(`${tag} points 必须是 3 条`);
  if (!n.why) errs.push(`${tag} 缺少 why`);
  if (n.url && !/^https?:\/\//.test(n.url)) errs.push(`${tag} url 格式不对`);
});

if (errs.length) {
  console.error('✗ 发现 ' + errs.length + ' 个问题：');
  errs.forEach(e => console.error('  - ' + e));
  process.exit(1);
}

const dates = [...new Set(NEWS.map(n => n.date))].sort().reverse();
console.log(`✓ 校验通过：${NEWS.length} 条资讯 / ${LESSONS.length} 节课`);
console.log(`  日期覆盖：${dates[0]} → ${dates[dates.length - 1]}（共 ${dates.length} 天）`);
console.log(`  摘要长度：${Math.min(...NEWS.map(n => n.summary.length))}—${Math.max(...NEWS.map(n => n.summary.length))} 字`);
