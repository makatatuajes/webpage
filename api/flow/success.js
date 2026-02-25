// /api/flow/success.js - Versión que acepta GET y POST de Flow
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
    // PARA FLOW: Aceptar tanto GET como POST como confirmación exitosa
    // Porque en producción a veces Flow hace GET en lugar de POST
    console.log(`📨 Solicitud recibida de Flow o usuario (${req.method})`);
    
    // Verificar si viene de Flow (tiene token en query o body)
    const hasToken = req.query.token || (req.body && req.body.token);
    
    if (hasToken) {
      console.log('✅ Solicitud de Flow detectada (con token)');
    } else {
      console.log('👤 Solicitud de usuario directo detectada');
    }
    
    // Redirigir al success.html
    console.log('🔄 Redirigiendo a /success.html');
    
    // Usar 303 para POST, 307 para GET (preserva método)
    const statusCode = req.method === 'POST' ? 303 : 307;
    return res.redirect(statusCode, '/success.html');

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
