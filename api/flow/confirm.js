// /api/flow/confirm.js - Versión con logs exhaustivos
const crypto = require('crypto');

console.log('=== MAKATATUAJES CONFIRM.JS LOADED ===');

module.exports = async function handler(req, res) {
  // LOG INMEDIATO - Esto siempre debería aparecer
  console.log('🔥🔥🔥 CONFIRM.JS HIT 🔥🔥🔥', {
    method: req.method,
    url: req.url,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  // Log de headers completos
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // Log del body raw (lo que sea que llegue)
  let rawBody = '';
  req.on('data', chunk => rawBody += chunk);
  req.on('end', async () => {
    console.log('Raw body:', rawBody);
    
    try {
      // Parsear como x-www-form-urlencoded
      const params = new URLSearchParams(rawBody);
      const token = params.get('token');
      const s = params.get('s');
      
      console.log('Token recibido:', token);
      console.log('Firma recibida:', s);

      // Responder INMEDIATAMENTE a Flow (código 200)
      // No importa lo que pase después, Flow necesita respuesta rápida
      res.status(200).send('OK');
      
      // AHORA procesamos el pago en segundo plano
      if (token) {
        console.log('Procesando pago en background para token:', token);
        
        // Aquí llamas a payment/getStatus
        await processPayment(token, s);
      }
      
    } catch (error) {
      console.error('Error procesando:', error);
      // Ya enviamos 200, no podemos cambiar la respuesta
    }
  });
};

async function processPayment(token, receivedSignature) {
  try {
    console.log('🔍 Procesando pago para token:', token);
    
    // Verificar firma si es necesario
    // Llamar a payment/getStatus
    // Enviar email etc.
    
    console.log('✅ Procesamiento completado');
  } catch (error) {
    console.error('❌ Error en procesamiento:', error);
  }
}
