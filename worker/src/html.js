const STATS_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>词条统计面板</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, 'Microsoft YaHei', sans-serif; background: #f5f5f5; color: #333; padding: 20px; }
h1 { font-size: 24px; margin-bottom: 10px; }
h1 small { font-size: 14px; color: #999; font-weight: normal; }
.summary { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
.summary-item { background: white; padding: 15px 25px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
.summary-item .num { font-size: 28px; font-weight: bold; color: #065279; }
.summary-item .label { font-size: 13px; color: #999; margin-top: 5px; }
.tabs { margin-bottom: 15px; }
.tabs button { padding: 8px 20px; border: 1px solid #065279; background: white; color: #065279; cursor: pointer; font-size: 14px; }
.tabs button.active { background: #065279; color: white; }
.tabs button:first-child { border-radius: 5px 0 0 5px; }
.tabs button:last-child { border-radius: 0 5px 5px 0; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
th { background: #065279; color: white; padding: 12px 15px; text-align: left; font-size: 14px; }
td { padding: 10px 15px; border-bottom: 1px solid #eee; font-size: 13px; }
tr:hover td { background: #f0f7ff; }
.tag-cell { max-width: 400px; }
.tag { display: inline-block; background: #e8f0fe; color: #065279; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin: 1px; }
.freq-badge { display: inline-block; background: #ff6b6b; color: white; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.pagination { margin-top: 15px; display: flex; justify-content: center; gap: 10px; align-items: center; }
.pagination button { padding: 5px 15px; border: 1px solid #065279; background: white; color: #065279; border-radius: 5px; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination span { font-size: 13px; color: #999; }
.loading { text-align: center; padding: 40px; color: #999; font-size: 16px; }
#details-table .time-cell { color: #999; font-size: 12px; }
.search-box { margin-bottom: 15px; }
.search-box input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; width: 300px; max-width: 100%; }
</style>
</head>
<body>
<h1>词条组合频率统计 <small id="total-info"></small></h1>
<div class="summary">
  <div class="summary-item"><div class="num" id="total-records">-</div><div class="label">总记录数</div></div>
  <div class="summary-item"><div class="num" id="unique-combos">-</div><div class="label">不同组合数</div></div>
  <div class="summary-item"><div class="num" id="today-records">-</div><div class="label">今日记录</div></div>
</div>
<div class="tabs">
  <button class="active" onclick="switchTab('stats')">频率排名</button>
  <button onclick="switchTab('details')">详细记录</button>
</div>
<div class="search-box" id="search-box" style="display:none">
  <input type="text" id="search-input" placeholder="输入词条筛选（如: 攻击者,火属性）" oninput="onSearch()">
</div>
<div id="stats-view">
  <table>
    <thead><tr><th>排名</th><th>词条组合</th><th>次数</th><th>最近选择</th><th>操作</th></tr></thead>
    <tbody id="stats-body"></tbody>
  </table>
  <div class="pagination" id="stats-pagination"></div>
</div>
<div id="details-view" style="display:none">
  <table>
    <thead><tr><th>ID</th><th>词条组合</th><th>记录时间</th></tr></thead>
    <tbody id="details-body"></tbody>
  </table>
  <div class="pagination" id="details-pagination"></div>
</div>

<script>
const API = '';
let currentTab = 'stats';
let statsPage = 1, detailsPage = 1;

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function renderTags(tagsStr) {
  try {
    const tags = JSON.parse(tagsStr);
    return tags.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('');
  } catch { return escapeHtml(tagsStr); }
}

function escapeHtml(s) { return (''+s).replace(/[&<>"]/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]; }); }

async function loadStats() {
  const data = await fetchJSON('/api/stats?page=' + statsPage);
  const tbody = document.getElementById('stats-body');
  tbody.innerHTML = '';
  data.data.forEach((item, i) => {
    const rank = (statsPage - 1) * data.pageSize + i + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + rank + '</td><td class="tag-cell">' + renderTags(item.tags) + '</td><td><span class="freq-badge">' + item.freq + '</span></td><td>' + (item.last_seen || '-') + '</td><td><button onclick="showDetails(\'' + encodeURIComponent(item.tags) + '\')">查看详情</button></td>';
    tbody.appendChild(tr);
  });
  renderPagination('stats-pagination', data.total, data.page, data.pageSize, function(p) { statsPage = p; loadStats(); });
}

async function loadDetails() {
  const searchVal = document.getElementById('search-input').value.trim();
  let url = '/api/details?page=' + detailsPage;
  if (searchVal) {
    const tags = searchVal.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    if (tags.length) url += '&tags=' + encodeURIComponent(JSON.stringify(tags));
  }
  const data = await fetchJSON(url);
  const tbody = document.getElementById('details-body');
  tbody.innerHTML = '';
  data.data.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + item.id + '</td><td class="tag-cell">' + renderTags(item.tags_original || item.tags) + '</td><td class="time-cell">' + item.created_at + '</td>';
    tbody.appendChild(tr);
  });
  renderPagination('details-pagination', data.total, data.page, data.pageSize, function(p) { detailsPage = p; loadDetails(); });
}

function renderPagination(id, total, page, pageSize, onChange) {
  const el = document.getElementById(id);
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = '<button onclick="changePage(\'' + id + '\', ' + (page-1) + ')" ' + (page<=1?'disabled':'') + '>上一页</button><span>第 ' + page + ' / ' + totalPages + ' 页（共 ' + total + ' 条）</span><button onclick="changePage(\'' + id + '\', ' + (page+1) + ')" ' + (page>=totalPages?'disabled':'') + '>下一页</button>';
  window._pageCallbacks = window._pageCallbacks || {};
  window._pageCallbacks[id] = onChange;
}
function changePage(id, p) { if (window._pageCallbacks[id]) window._pageCallbacks[id](p); }

async function loadSummary() {
  const data = await fetchJSON('/api/stats?page=1&pageSize=1');
  const totalRes = await fetchJSON('/api/details?page=1&pageSize=1');
  document.getElementById('total-records').textContent = totalRes.total;
  document.getElementById('unique-combos').textContent = data.total;
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.querySelector('.tabs button:nth-child(' + (tab==='stats'?1:2) + ')').classList.add('active');
  document.getElementById('stats-view').style.display = tab === 'stats' ? '' : 'none';
  document.getElementById('details-view').style.display = tab === 'details' ? '' : 'none';
  document.getElementById('search-box').style.display = tab === 'details' ? '' : 'none';
  if (tab === 'details') loadDetails();
}

function showDetails(tagsStr) {
  document.getElementById('search-input').value = decodeURIComponent(tagsStr);
  switchTab('details');
}

function onSearch() {
  detailsPage = 1;
  loadDetails();
}

loadSummary();
loadStats();
</script>
</body>
</html>`;
export default STATS_HTML;