import { corsHeaders, jsonResponse, handleOptions } from './cors';
import STATS_HTML from './html';

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/' || path === '/stats') {
        return new Response(STATS_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      if (path === '/api/record' && request.method === 'POST') {
        return await handleRecord(request, env);
      }
      if (path === '/api/stats' && request.method === 'GET') {
        return await handleStats(request, env);
      }
      if (path === '/api/details' && request.method === 'GET') {
        return await handleDetails(request, env);
      }
      return jsonResponse({ error: 'Not Found' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

async function handleRecord(request, env) {
  const body = await request.json();
  const { tags } = body;

  if (!Array.isArray(tags) || tags.length !== 5) {
    return jsonResponse({ error: '需要恰好5个词条' }, 400);
  }

  const tagsStr = JSON.stringify(tags);
  const tagsSorted = [...tags].sort();
  const tagsSortedStr = JSON.stringify(tagsSorted);

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  await env.DB.prepare(
    'INSERT INTO tag_records (tags, tags_original, created_at) VALUES (?, ?, ?)'
  ).bind(tagsSortedStr, tagsStr, now).run();

  return jsonResponse({ success: true });
}

async function handleStats(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const stmt = env.DB.prepare(
    `SELECT tags, COUNT(*) as freq, MAX(created_at) as last_seen
     FROM tag_records
     GROUP BY tags
     ORDER BY freq DESC, last_seen DESC
     LIMIT ? OFFSET ?`
  ).bind(pageSize, offset);

  const countStmt = env.DB.prepare(
    'SELECT COUNT(DISTINCT tags) as total FROM tag_records'
  );

  const [result, countResult] = await Promise.all([
    stmt.all(),
    countStmt.first()
  ]);

  return jsonResponse({
    data: result.results,
    total: countResult.total,
    page,
    pageSize
  });
}

async function handleDetails(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = 100;
  const offset = (page - 1) * pageSize;
  const tagFilter = url.searchParams.get('tags');

  let stmt;
  let countStmt;

  if (tagFilter) {
    const tagsArr = JSON.parse(tagFilter);
    const tagsStr = JSON.stringify(tagsArr.sort());
    stmt = env.DB.prepare(
      `SELECT id, tags, tags_original, created_at
       FROM tag_records
       WHERE tags = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(tagsStr, pageSize, offset);
    countStmt = env.DB.prepare(
      'SELECT COUNT(*) as total FROM tag_records WHERE tags = ?'
    ).bind(tagsStr);
  } else {
    stmt = env.DB.prepare(
      `SELECT id, tags, tags_original, created_at
       FROM tag_records
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(pageSize, offset);
    countStmt = env.DB.prepare(
      'SELECT COUNT(*) as total FROM tag_records'
    );
  }

  const [result, countResult] = await Promise.all([
    stmt.all(),
    countStmt.first()
  ]);

  return jsonResponse({
    data: result.results,
    total: countResult.total,
    page,
    pageSize
  });
}