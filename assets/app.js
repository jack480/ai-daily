/* ===========================================================
   AI 每日 — 交互逻辑
   数据持久化：localStorage（已读 / 阅读记录 / 学习进度）
   =========================================================== */

const $ = (s, root = document) => root.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const ICON = {
  list: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z"/><path d="M8.5 7.5h7M8.5 11h5"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>'
};

/* ---------------- 存储 ---------------- */
const KEY = 'aidaily.v1.';
const store = {
  get(k, d) {
    try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; }
    catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) {}
  }
};

/* ---------------- 状态 ---------------- */
const state = {
  view: 'feed',
  filter: '全部',
  q: '',
  openId: null,
  lessonId: null,
  read: new Set(store.get('read', [])),
  history: store.get('history', []),   // [{ id, at }]
  prog: store.get('prog', {})          // { lessonId: [bool, bool, bool] }
};

const CATS = ['模型发布', '政策监管', '行业动态', '前沿研究'];
const SORTED = [...NEWS].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
const LATEST = SORTED[0];

/* ---------------- 工具 ---------------- */
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const catCls = c => ({ '模型发布': 't-model', '政策监管': 't-policy', '行业动态': 't-ind', '前沿研究': 't-res' }[c] || 't-ind');
const dotCls = c => ({ '模型发布': 'd-model', '政策监管': 'd-policy', '行业动态': 'd-ind', '前沿研究': 'd-res' }[c] || 'd-ind');

function ring(size, r, stroke, p, color, bg) {
  const c = 2 * Math.PI * r, mid = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="${bg || 'rgba(23,20,15,.09)'}" stroke-width="${stroke}"/>
    <circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}"
      style="transition:stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)"/>
  </svg>`;
}

function fmtTime(ts) {
  const d = new Date(ts), now = new Date();
  const same = d.toDateString() === now.toDateString();
  return same
    ? `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------------- 学习进度 ---------------- */
const lessonDone = id => (state.prog[id] || []).filter(Boolean).length;
const totalSteps = LESSONS.reduce((s, l) => s + l.steps.length, 0);
const totalDone = LESSONS.reduce((s, l) => s + lessonDone(l.id), 0);
const overallPct = () => totalSteps ? Math.round(totalDone / totalSteps * 100) : 0;

/* ---------------- 过滤 ---------------- */
function filtered() {
  const q = state.q.trim().toLowerCase();
  return SORTED.filter(n => {
    if (state.filter !== '全部' && n.cat !== state.filter) return false;
    if (!q) return true;
    return (n.title + n.excerpt + n.summary + n.cat + n.source).toLowerCase().includes(q);
  });
}

/* ===========================================================
   渲染
   =========================================================== */
function render() {
  renderRail();
  renderTopbar();
  renderStage();
  renderPeek();
}

function renderRail() {
  const p = overallPct();
  const n = state.history.length;
  const item = (view, label, icon, badge) => `
    <button class="nav-item ${state.view === view ? 'on' : ''}" data-act="view" data-view="${view}">
      ${icon}<span>${label}</span>
      ${badge ? `<em class="nav-badge">${badge}</em>` : ''}
    </button>`;
  $('#rail').innerHTML = `
    <div class="brand">
      <div class="brand-mark">AI</div>
      <div class="brand-sub">每日</div>
    </div>
    <nav class="rail-nav">
      ${item('feed', '资讯', ICON.list)}
      ${item('learn', '学习', ICON.book)}
      ${item('history', '记录', ICON.clock, n > 99 ? '99+' : (n || ''))}
    </nav>
    <div class="rail-bottom">
      <div class="rail-ring">
        ${ring(46, 19, 3.5, p / 100, '#D8F06B', 'rgba(246,243,234,.16)')}
        <span class="rv">${p}%</span>
      </div>
      <small>学习进度</small>
    </div>`;
}

function renderTopbar() {
  const d = parseDate(LATEST.date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const status = isToday
    ? `${WEEK[d.getDay()]} · ${LATEST.time} 更新`
    : `${WEEK[now.getDay()]} · 最新 ${pad(d.getMonth() + 1)}/${pad(d.getDate())}，今日待更新`;
  $('#topbar').innerHTML = `
    <div class="tb-left">
      <div class="tb-date"><b>${d.getFullYear()}</b> / ${pad(d.getMonth() + 1)} / ${pad(d.getDate())}</div>
      <div class="tb-sub"><span class="live ${isToday ? 'on' : ''}"></span>${status}</div>
    </div>
    <div class="search">
      ${ICON.search}
      <input id="q" type="search" placeholder="搜索标题 / 关键词" value="${state.q.replace(/"/g, '&quot;')}" autocomplete="off">
    </div>`;
}

function renderStage() {
  const el = $('#stage');
  if (state.view === 'feed') {
    const art = state.openId && NEWS.find(n => n.id === state.openId);
    el.innerHTML = art ? readerHTML(art) : feedHTML();
  } else if (state.view === 'learn') {
    const les = state.lessonId && LESSONS.find(l => l.id === state.lessonId);
    el.innerHTML = les ? lessonHTML(les) : learnHTML();
  } else {
    el.innerHTML = historyHTML();
  }
  $('#footMeta').textContent = `${NEWS.length} 条资讯 · ${LESSONS.length} 节课`;
}

/* ---------------- 资讯列表 ---------------- */
function feedHTML() {
  const items = filtered();
  const d = parseDate(LATEST.date);

  const chips = ['全部', ...CATS].map(c => {
    const n = c === '全部' ? NEWS.length : NEWS.filter(x => x.cat === c).length;
    return `<button class="chip ${state.filter === c ? 'on' : ''}" data-act="filter" data-cat="${c}">${c}<span class="n">${n}</span></button>`;
  }).join('');

  const hero = `
    <div class="hero">
      <div>
        <p class="kicker"><span class="dot"></span>DAILY BRIEF — ${LATEST.date.replace(/-/g, '.')}</p>
        <h1>今天的 AI<br><span class="hl">发生了什么</span></h1>
        <p class="lede">${NEWS.length} 条精选，来自公开报道。模型发布、政策监管、行业动向与前沿研究 —— 一条 3 分钟读完，右侧是每条的 100 字核心。</p>
      </div>
      <div class="hero-date">
        <em>${pad(d.getDate())}</em>
        <div class="hd-side"><b>${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]}</b><span>${d.getFullYear()}</span></div>
      </div>
    </div>`;

  if (!items.length) {
    return `<section class="view">${hero}
      <div class="toolbar"><div class="chips">${chips}</div><div class="count">0 条</div></div>
      <div class="empty"><b>没有匹配的内容</b>换个关键词，或切回「全部」看看。</div>
    </section>`;
  }

  const groups = [];
  items.forEach(it => {
    const g = groups.find(x => x.date === it.date);
    g ? g.items.push(it) : groups.push({ date: it.date, items: [it] });
  });

  let first = true, idx = 0;
  const body = groups.map(g => {
    const gd = parseDate(g.date);
    let h = `<div class="date-sep">
      <div class="ds-day">${gd.getMonth() + 1} 月 ${gd.getDate()} 日</div>
      <div class="ds-week">${WEEK[gd.getDay()]}</div>
      <div class="ds-rule"></div>
      ${g.date === LATEST.date ? '<span class="ds-tag">TODAY</span>' : ''}
    </div><div class="feed">`;
    g.items.forEach(it => {
      h += cardHTML(it, first, idx++);
      first = false;
    });
    return h + '</div>';
  }).join('');

  return `<section class="view">
    ${hero}
    <div class="toolbar">
      <div class="chips">${chips}</div>
      <div class="count">${items.length} 条${state.q ? ' · 搜索「' + state.q + '」' : ''}</div>
    </div>
    ${body}
  </section>`;
}

function cardHTML(n, feature, i) {
  const read = state.read.has(n.id);
  const delay = `style="--d:${Math.min(i, 8) * 45}ms"`;
  if (feature) {
    return `<button class="card feature ${read ? 'is-read' : ''}" data-act="open" data-id="${n.id}" ${delay}>
      <div class="card-top">
        <span class="tag">${n.cat}</span>
        <span class="card-time">${n.time} · ${n.minutes} 分钟</span>
      </div>
      <h3>${n.title}</h3>
      <p class="card-ex">${n.excerpt}</p>
      <div class="card-foot">
        <span class="src">来源 · ${n.source}</span>
        <span class="${read ? 'flag-read' : 'ft-mark'}">${read ? '已读' : 'LEAD STORY'}</span>
      </div>
    </button>`;
  }
  return `<button class="card ${read ? 'is-read' : ''}" data-act="open" data-id="${n.id}" ${delay}>
    <div class="card-top">
      <span class="tag ${catCls(n.cat)}">${n.cat}</span>
      <span class="card-time">${n.time} · ${n.minutes} 分钟</span>
    </div>
    <h3>${n.title}</h3>
    <p class="card-ex">${n.excerpt}</p>
    <div class="card-foot">
      <span class="src">${n.source}</span>
      ${read ? '<span class="flag-read">已读</span>' : ''}
    </div>
  </button>`;
}

/* ---------------- 详情阅读 ---------------- */
function readerHTML(n) {
  const d = parseDate(n.date);
  const body = n.body.map(b => `
    <div class="body-block">
      ${b.h ? `<h3>${b.h}</h3>` : ''}
      <p>${b.p}</p>
    </div>`).join('');

  return `<section class="view reader">
    <button class="back" data-act="back">← 返回列表</button>
    <div class="reader-meta">
      <span class="tag ${catCls(n.cat)}">${n.cat}</span>
      <span>${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${n.time}</span>
      <span class="sep"></span>
      <span>约 ${n.minutes} 分钟</span>
      <span class="sep"></span>
      <span>${n.source}</span>
    </div>
    <h1>${n.title}</h1>
    <p class="reader-lede">${n.excerpt}</p>

    <div class="core-box">
      <div class="cb-label"><i></i>CORE · 100 字速览</div>
      <p>${n.summary}</p>
    </div>

    ${body}

    <div class="points-box">
      <h4>三个要点</h4>
      <ol>${n.points.map(p => `<li>${p}</li>`).join('')}</ol>
    </div>

    <div class="why-box">
      <h4>为什么值得注意</h4>
      <p>${n.why}</p>
    </div>

    <div class="reader-src">
      <span>${n.url ? `原文：<a href="${n.url}" target="_blank" rel="noopener">${n.source} ↗</a>` : `来源：${n.source}`}</span>
      <span>已加入阅读记录</span>
    </div>
  </section>`;
}

/* ---------------- 学习 ---------------- */
function learnHTML() {
  const p = overallPct();
  const cards = LESSONS.map((l, i) => {
    const done = lessonDone(l.id), tot = l.steps.length;
    const lp = Math.round(done / tot * 100);
    return `<button class="lesson ${lp === 100 ? 'is-done' : ''}" data-act="lesson" data-id="${l.id}" style="--d:${i * 45}ms">
      <div class="lesson-no">${pad(i + 1)}</div>
      <div>
        <div class="lesson-top">
          <h3>${l.title}</h3>
          <span class="lvl ${l.level === '进阶' ? 'adv' : ''}">${l.level}</span>
        </div>
        <p>${l.intro}</p>
        <div class="bar"><i class="${lp === 100 ? 'done' : ''}" style="width:${lp}%"></i></div>
        <div class="lesson-foot">
          <span class="${lp === 100 ? 'ok' : ''}">${lp === 100 ? '已完成' : `${done} / ${tot} 知识点`}</span>
          <span>${l.minutes} 分钟</span>
        </div>
      </div>
    </button>`;
  }).join('');

  return `<section class="view">
    <div class="learn-head">
      <div>
        <p class="kicker"><span class="dot"></span>LEARNING PATH</p>
        <h1>从 0 到 1，把 AI 弄懂</h1>
        <p class="lede">${LESSONS.length} 节课，约 70 分钟。每节 3 个知识点，勾完即算完成 —— 进度会自动保存，随时接着学。</p>
      </div>
      <div class="ring-wrap">
        ${ring(118, 50, 9, p / 100, '#17140F', '#E8E2D2')}
        <div class="ring-center">
          <b>${p}<i>%</i></b>
          <span>TOTAL</span>
        </div>
      </div>
    </div>
    <div class="progress-strip">
      <span class="ps-label">已完成 ${totalDone} / ${totalSteps} 个知识点</span>
      <div class="bar"><i class="${p === 100 ? 'done' : ''}" style="width:${p}%"></i></div>
    </div>
    <div class="lessons">${cards}</div>
  </section>`;
}

function lessonHTML(l) {
  const i = LESSONS.findIndex(x => x.id === l.id);
  const done = state.prog[l.id] || [];
  const dn = done.filter(Boolean).length, lp = Math.round(dn / l.steps.length * 100);

  const steps = l.steps.map((s, si) => `
    <button class="step ${done[si] ? 'done' : ''}" data-act="step" data-id="${l.id}" data-i="${si}">
      <span class="box">${ICON.check}</span>
      <div>
        <h4>${s.t}</h4>
        <p>${s.p}</p>
      </div>
    </button>`).join('');

  const terms = l.terms.map(([k, v]) => `<div class="term-row"><b>${k}</b><span>${v}</span></div>`).join('');

  return `<section class="view reader lesson-reader">
    <button class="back" data-act="backLearn">← 返回课程列表</button>
    <div class="lr-top">
      <span class="tag ${l.level === '进阶' ? 't-res' : 't-ind'}">${l.level}</span>
      <span>LESSON ${pad(i + 1)} / ${pad(LESSONS.length)}</span>
      <span>·</span>
      <span>${l.minutes} 分钟</span>
    </div>
    <h1>${l.title}</h1>
    <p class="reader-lede">${l.intro}</p>

    <div class="progress-strip" style="padding-top:0">
      <span class="ps-label">${dn} / ${l.steps.length} 知识点</span>
      <div class="bar"><i class="${lp === 100 ? 'done' : ''}" style="width:${lp}%"></i></div>
    </div>

    <div class="steps">${steps}</div>

    <div class="analogy-box"><p>${l.analogy}</p></div>

    <div class="terms">
      <h4>关键词</h4>
      ${terms}
    </div>

    <div class="lr-actions">
      <button class="btn lime" data-act="stepAll" data-id="${l.id}">${lp === 100 ? '取消完成标记' : '标记本节完成'}</button>
      ${i < LESSONS.length - 1
        ? `<button class="btn ghost" data-act="lesson" data-id="${LESSONS[i + 1].id}">下一节 →</button>`
        : `<button class="btn ghost" data-act="backLearn">回到课程列表</button>`}
    </div>
  </section>`;
}

/* ---------------- 阅读记录 ---------------- */
function historyHTML() {
  const list = state.history
    .map(h => ({ h, n: NEWS.find(x => x.id === h.id) }))
    .filter(x => x.n);

  const rows = list.map(({ h, n }, i) => `
    <div class="hist-item" style="--d:${Math.min(i, 10) * 35}ms">
      <button class="hist-main" data-act="open" data-id="${n.id}">
        <span class="tag ${catCls(n.cat)} hi-cat">${n.cat}</span>
        <h4>${n.title}</h4>
      </button>
      <div class="hist-side">
        <span class="hist-time">${fmtTime(h.at)}</span>
        <button class="del" data-act="del" data-id="${n.id}" title="删除这条记录">${ICON.trash}</button>
      </div>
    </div>`).join('');

  return `<section class="view">
    <div class="hist-head">
      <div>
        <p class="kicker"><span class="dot"></span>READING LOG</p>
        <h1>阅读记录</h1>
        <p>${list.length ? `共 ${list.length} 条，按最近阅读排序。记录只存在这台设备上。` : '还没有记录 —— 打开任意一条资讯就会自动留下痕迹。'}</p>
      </div>
      ${list.length ? '<button class="btn ghost" data-act="clear">清空记录</button>' : ''}
    </div>
    ${list.length
      ? `<div class="hist-list">${rows}</div>`
      : `<div class="empty" style="margin-top:24px"><b>暂无阅读记录</b>去「资讯」挑一条开始吧。</div>`}
  </section>`;
}

/* ---------------- 右侧速览 ---------------- */
function renderPeek() {
  const el = $('#peek');

  /* 阅读详情：本篇速览 + 相关 */
  if (state.view === 'feed' && state.openId) {
    const n = NEWS.find(x => x.id === state.openId);
    if (n) {
      const rel = SORTED.filter(x => x.cat === n.cat && x.id !== n.id).slice(0, 3);
      el.innerHTML = `
        <div class="peek-head">
          <div class="ph-title"><h2>本篇速览<em>CORE</em></h2></div>
          <p>${n.cat} · ${n.minutes} 分钟读完</p>
        </div>
        <div class="peek-body">
          <div style="padding:4px 10px 18px;border-bottom:1px solid var(--line)">
            <p style="margin:0 0 12px;font-size:13px;line-height:1.85;color:var(--ink)">${n.summary}</p>
            <div class="peek-foot"><span class="peek-dot ${dotCls(n.cat)}"></span>${n.source}</div>
          </div>
          <div class="peek-section">
            <h3>三个要点</h3>
            ${n.points.map((p, i) => `<div style="display:flex;gap:9px;padding:6px 2px 8px">
              <span style="font-family:var(--serif);font-size:11px;color:var(--accent);padding-top:1px">0${i + 1}</span>
              <span style="font-size:12px;line-height:1.65;color:var(--ink-soft)">${p}</span>
            </div>`).join('')}
          </div>
          ${rel.length ? `<div class="peek-section">
            <h3>同栏目 · 继续读</h3>
            ${rel.map(r => `<button class="peek-item" data-act="open" data-id="${r.id}" style="grid-template-columns:1fr">
              <div><h4>${r.title}</h4>
              <div class="peek-foot"><span class="peek-dot ${dotCls(r.cat)}"></span>${r.date.slice(5).replace('-', '/')} · ${r.minutes} 分钟</div></div>
            </button>`).join('')}
          </div>` : ''}
        </div>`;
      return;
    }
  }

  /* 课程详情：目录 */
  if (state.view === 'learn' && state.lessonId) {
    el.innerHTML = `
      <div class="peek-head">
        <div class="ph-title"><h2>课程目录<em>${overallPct()}%</em></h2></div>
        <p>共 ${LESSONS.length} 节 · 已完成 ${LESSONS.filter(l => lessonDone(l.id) === l.steps.length).length} 节</p>
      </div>
      <div class="peek-body">
        ${LESSONS.map((l, i) => `<button class="toc-item ${l.id === state.lessonId ? 'on' : ''}" data-act="lesson" data-id="${l.id}">
          <span class="tn">${pad(i + 1)}</span>
          <span class="tt">${l.title}</span>
          <span class="tb ${lessonDone(l.id) === l.steps.length ? 'ok' : ''}"></span>
        </button>`).join('')}
      </div>`;
    return;
  }

  /* 默认：内容速览 */
  const items = state.view === 'history'
    ? state.history.map(h => NEWS.find(x => x.id === h.id)).filter(Boolean).slice(0, 12)
    : filtered();

  const title = state.view === 'history' ? '最近读过' : '内容速览';
  const sub = state.view === 'history'
    ? '按阅读时间倒序'
    : `${state.filter === '全部' ? '全部栏目' : state.filter} · 每条 100 字以内`;

  el.innerHTML = `
    <div class="peek-head">
      <div class="ph-title"><h2>${title}<em>${state.view === 'history' ? 'LOG' : '100字'}</em></h2></div>
      <p>${sub}</p>
    </div>
    <div class="peek-body">
      ${items.length ? items.map((n, i) => `
        <button class="peek-item" data-act="open" data-id="${n.id}">
          <span class="peek-num">${pad(i + 1)}</span>
          <div>
            <h4>${n.title}</h4>
            <p>${n.summary}</p>
            <div class="peek-foot">
              <span class="peek-dot ${dotCls(n.cat)}"></span>${n.cat}
              <span>·</span>${n.date.slice(5).replace('-', '/')}
              ${state.read.has(n.id) ? '<span>·</span>已读' : ''}
            </div>
          </div>
        </button>`).join('')
        : '<div style="padding:34px 12px;text-align:center;font-size:12px;color:var(--ink-faint)">暂无内容</div>'}
    </div>`;
}

/* ===========================================================
   交互
   =========================================================== */
function openArticle(id) {
  state.view = 'feed';
  state.openId = id;

  if (!state.read.has(id)) {
    state.read.add(id);
    store.set('read', [...state.read]);
  }
  const now = Date.now();
  state.history = [{ id, at: now }, ...state.history.filter(h => h.id !== id)].slice(0, 120);
  store.set('history', state.history);

  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function toggleStep(lessonId, i) {
  const l = LESSONS.find(x => x.id === lessonId);
  const arr = state.prog[lessonId] ? [...state.prog[lessonId]] : l.steps.map(() => false);
  arr[i] = !arr[i];
  state.prog[lessonId] = arr;
  store.set('prog', state.prog);

  if (arr.every(Boolean)) toast('本节完成 🎉');
  else if (arr.filter(Boolean).length) toast('进度已保存');

  render();
}

function toast(msg) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `<i></i>${msg}`;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2100);
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act } = el.dataset;

  switch (act) {
    case 'view':
      state.view = el.dataset.view;
      state.openId = null;
      state.lessonId = null;
      render();
      window.scrollTo({ top: 0, behavior: 'auto' });
      break;

    case 'open':
      openArticle(el.dataset.id);
      break;

    case 'back':
      state.openId = null;
      render();
      window.scrollTo({ top: 0, behavior: 'auto' });
      break;

    case 'filter':
      state.filter = el.dataset.cat;
      render();
      break;

    case 'lesson':
      state.view = 'learn';
      state.lessonId = el.dataset.id;
      render();
      window.scrollTo({ top: 0, behavior: 'auto' });
      break;

    case 'backLearn':
      state.lessonId = null;
      render();
      window.scrollTo({ top: 0, behavior: 'auto' });
      break;

    case 'step':
      toggleStep(el.dataset.id, Number(el.dataset.i));
      break;

    case 'stepAll': {
      const l = LESSONS.find(x => x.id === el.dataset.id);
      const dn = lessonDone(l.id);
      state.prog[l.id] = l.steps.map(() => dn < l.steps.length);
      store.set('prog', state.prog);
      toast(dn < l.steps.length ? '本节已标记完成 🎉' : '已取消完成标记');
      render();
      break;
    }

    case 'del': {
      const id = el.dataset.id;
      state.history = state.history.filter(h => h.id !== id);
      store.set('history', state.history);
      toast('记录已删除');
      render();
      break;
    }

    case 'clear':
      if (!state.history.length) break;
      if (confirm('确定清空全部阅读记录？此操作不可撤销。')) {
        state.history = [];
        store.set('history', []);
        toast('阅读记录已清空');
        render();
      }
      break;
  }
});

document.addEventListener('input', e => {
  if (e.target.id !== 'q') return;
  state.q = e.target.value;
  if (state.openId) state.openId = null;
  renderStage();
  renderPeek();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (state.openId) { state.openId = null; render(); }
    else if (state.lessonId) { state.lessonId = null; render(); }
  }
});

/* 启动 */
render();
