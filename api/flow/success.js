// /api/flow/success.js
console.log('=== SUCCESS.JS LOADED ===');

module.exports = async function handler(req, res) {
  console.log('=== SUCCESS HANDLER CALLED ===', {
    method: req.method,
    url: req.url,
    query: req.query
  });

  // Allow ALL methods - never return 405
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let token = '';

    // 1. Query string: ?token=XXX  (Flow GET redirect)
    if (req.query && req.query.token) {
      token = req.query.token;
      console.log('🔑 Token from query string:', token);
    }

    // 2. POST body - application/x-www-form-urlencoded or JSON
    if (!token && req.body) {
      if (typeof req.body === 'object') {
        token = req.body.token || '';
      } else if (typeof req.body === 'string') {
        const params = new URLSearchParams(req.body);
        token = params.get('token') || '';
      }
      if (token) console.log('🔑 Token from POST body:', token);
    }

    // 3. Cookie fallback
    if (!token) {
      const cookies = req.headers.cookie || '';
      const match = cookies.split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('payment_token='));
      if (match) {
        token = match.split('=')[1] || '';
        console.log('🔑 Token from cookie:', token);
      }
    }

    console.log('🔑 Final token:', token || 'none');

    const redirectUrl = token
      ? `/success.html?token=${encodeURIComponent(token)}`
      : '/success.html';

    console.log('🔄 Redirecting to:', redirectUrl);
    return res.redirect(302, redirectUrl);

  } catch (error) {
    console.error('❌ Error in success handler:', error);
    return res.redirect(302, '/success.html');
  }
};
