// /api/flow/success.js
// Flow POSTs to urlReturn with token in the body (application/x-www-form-urlencoded)
// This function receives that POST, extracts the token, and returns the success HTML directly

const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  console.log('=== SUCCESS HANDLER ===', req.method);

  // Allow all methods - Flow sends POST, users may send GET
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract token from wherever Flow puts it
    let token = '';

    // POST body (application/x-www-form-urlencoded) — primary source
    if (req.body) {
      if (typeof req.body === 'object') {
        token = req.body.token || '';
      } else if (typeof req.body === 'string') {
        const params = new URLSearchParams(req.body);
        token = params.get('token') || '';
      }
    }

    // Query string fallback
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    console.log('Token received:', token || 'none');

    // Read success.html from the project root and serve it directly
    // This avoids needing a redirect entirely
    const htmlPath = path.join(process.cwd(), 'success.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Inject the token into the HTML so the page script can use it
    if (token) {
      html = html.replace(
        '</head>',
        `<script>window.__FLOW_TOKEN__ = "${token}";</script>\n</head>`
      );
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error in success handler:', error);
    // Fallback redirect
    return res.redirect(302, '/success.html');
  }
};
