// Versión mínima para probar
module.exports = async function handler(req, res) {
  console.log('✅ CONFIRM.JS EJECUTÁNDOSE', {
    method: req.method,
    url: req.url
  });
  
  // Aceptar SOLO POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Responder inmediatamente
  res.status(200).send('PAYMENT_CONFIRMED');
};
