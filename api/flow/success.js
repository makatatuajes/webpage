// /api/success.js - Versión CommonJS
console.log('=== SUCCESS.JS LOADED ===');

module.exports = async function handler(req, res) {
  console.log('=== SUCCESS HANDLER CALLED ===', {
    method: req.method,
    url: req.url,
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
    // Si es POST de Flow
    if (req.method === 'POST') {
      console.log('📨 POST recibido de Flow');
      console.log('Body:', req.body);
      
      // Redirigir al success.html
      console.log('🔄 Redirigiendo a /success.html');
      return res.redirect(303, '/success.html');
    }
    
    // Si es GET del usuario
    if (req.method === 'GET') {
      console.log('👤 GET recibido de usuario');
      return res.redirect(307, '/success.html');
    }

    // Si es otro método
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).send('Método no permitido');

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
