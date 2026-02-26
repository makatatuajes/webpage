// /api/flow/success.js - Versión combinada CORREGIDA
console.log('=== SUCCESS.JS LOADED ===');

module.exports = async function handler(req, res) {
  console.log('=== SUCCESS HANDLER CALLED ===', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers
  });

  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ✅ READ TOKEN: Flow sends it via POST body on return redirect
    let token = '';

    // 1. Try POST body first (Flow sends token here on return)
    if (req.method === 'POST' && req.body) {
      token = req.body.token || '';
      console.log('🔑 Token desde POST body:', token || 'No token en body');
    }

    // 2. Try query params (fallback)
    if (!token) {
      token = req.query?.token || '';
      console.log('🔑 Token desde query params:', token || 'No token en query');
    }

    // 3. Try cookie (fallback)
    if (!token) {
      const cookies = req.headers.cookie || '';
      token = cookies.split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('payment_token='))
        ?.split('=')[1] || '';
      console.log('🔑 Token desde cookie:', token || 'No token en cookie');
    }
    
    console.log(`📨 Solicitud recibida (${req.method})`);
    console.log('🔑 Token final:', token || 'No token');

    // Verificar si viene de Flow (tiene token)
    const hasToken = !!token;
    
    if (hasToken) {
      console.log('✅ Solicitud con token detectada');
    } else {
      console.log('👤 Solicitud de usuario directo detectada');
    }
    
    // Construir URL de redirección
    const redirectUrl = hasToken 
      ? `/success.html?token=${encodeURIComponent(token)}`
      : '/success.html';
    
    console.log('🔄 Redirigiendo a:', redirectUrl);
    
    // Usar 302 Found
    return res.redirect(302, redirectUrl);

  } catch (error) {
    console.error('❌ Error:', error);
    return res.redirect(302, '/success.html');
  }
};
