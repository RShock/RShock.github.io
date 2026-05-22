const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function corsHeaders() {
  return { ...CORS_HEADERS };
}

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}