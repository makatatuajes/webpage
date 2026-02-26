// /api/flow/success.js - Versión combinada
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
    // Obtener token de body o query params
    const token = req.body?.token || req.query?.token || '';
    
    console.log('🔑 Flow return token:', token || 'No token');
    console.log(`📨 Solicitud recibida de Flow o usuario (${req.method})`);
    
    // Verificar si viene de Flow (tiene token)
    const hasToken = !!token;
    
    if (hasToken) {
      console.log('✅ Solicitud de Flow detectada con token:', token);
    } else {
      console.log('👤 Solicitud de usuario directo detectada');
    }
    
    // Construir URL de redirección
    const redirectUrl = hasToken 
      ? `/success.html?token=${encodeURIComponent(token)}`
      : '/success.html';
    
    console.log('🔄 Redirigiendo a:', redirectUrl);
    
    // Usar 302 (Found) que es universal y funciona bien para ambos casos
    return res.redirect(302, redirectUrl);

  } catch (error) {
    console.error('❌ Error:', error);
    // En caso de error, redirigir a success.html sin token
    return res.redirect(302, '/success.html');
  }
};
