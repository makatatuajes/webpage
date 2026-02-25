// /api/flow/confirm.js - Versión Corregida
const crypto = require('crypto');

// --- Configuración (asegúrate que tus variables de entorno estén bien) ---
const FLOW_CONFIG = {
  // Es importante que esta URL sea la de producción cuando estés en vivo
  API_URL: process.env.FLOW_API_URL || 'https://www.flow.cl/api', // Cambia a producción si es necesario
  API_KEY: process.env.FLOW_API_KEY,
  SECRET_KEY: process.env.FLOW_SECRET_KEY
};

// --- Función para generar firma (igual, pero la usaremos bien) ---
function generateFlowSignature(params, secretKey) {
  // 1. Ordenar las claves alfabéticamente
  const sortedKeys = Object.keys(params).sort();
  // 2. Crear el string de la forma "key1valor1key2valor2..."
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
  // 3. Generar HMAC-SHA256
  return crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
}

module.exports = async function handler(req, res) {
  // Flow siempre enviará POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 1. Obtener los parámetros que Flow envía en el BODY de la petición
    const { token, s } = req.body; // 's' es la firma que envía Flow

    if (!token || !s) {
      console.error('❌ Token o firma no recibidos:', { token, s });
      return res.status(400).send('ERROR: Faltan parámetros');
    }

    // 2. ¡IMPORTANTE! La firma que recibes en 's' fue generada por Flow
    //    USANDO EL MISMO TOKEN. Para verificarla, debes reconstruirla.
    const paramsForVerification = {
      apiKey: FLOW_CONFIG.API_KEY,
      token: token
    };

    // 3. Recalcular la firma que DEBERÍA haber enviado Flow
    const expectedSignature = generateFlowSignature(paramsForVerification, FLOW_CONFIG.SECRET_KEY);

    // 4. Comparar la firma que recibiste (s) con la que acabas de calcular (expectedSignature)
    if (s !== expectedSignature) {
      console.error('❌ Firma inválida');
      console.error('  Recibida (s):', s);
      console.error('  Calculada    :', expectedSignature);
      // Respondemos con error 401 (No autorizado) que es justo lo que viste
      return res.status(401).send('ERROR: Firma inválida');
    }

    console.log('✅ Firma verificada correctamente. Token:', token);

    // 5. (Opcional pero recomendado) Consultar el estado real del pago a Flow
    //    para tener la información actualizada, aunque con la firma ya es seguro.
    const statusParams = {
      apiKey: FLOW_CONFIG.API_KEY,
      token: token
    };
    const statusSignature = generateFlowSignature(statusParams, FLOW_CONFIG.SECRET_KEY);
    
    const formData = new URLSearchParams();
    formData.append('apiKey', statusParams.apiKey);
    formData.append('token', statusParams.token);
    formData.append('s', statusSignature);

    const flowResponse = await fetch(`${FLOW_CONFIG.API_URL}/payment/getStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const paymentData = await flowResponse.json();

    if (paymentData.status === 2) { // 2 es "Pagado"
      console.log('💰 Pago confirmado por Flow:', paymentData);

      // --- Aquí puedes poner tu lógica de negocio: ---
      // 1. Guardar en base de datos que el pago fue exitoso.
      // 2. Enviar email de confirmación (como ya lo haces).
      // 3. etc.
      let optionalData = {};
      try {
        optionalData = JSON.parse(paymentData.optional || '{}');
      } catch (e) {
        console.log('Optional data no es JSON válido:', paymentData.optional);
      }

      await sendConfirmationEmail({ // Asegúrate que esta función exista o la manejes aquí
        ...paymentData,
        optional: optionalData
      });
      // --- Fin lógica de negocio ---

      // 6. RESPONDER A FLOW CON EL MENSAJE EXACTO QUE ESPERA
      //    Esto es lo que estaba fallando: debes responder con un HTTP 200 y este texto.
      return res.status(200).send('PAYMENT_CONFIRMED');
      
    } else {
      console.log('⏳ Pago no está en estado "Pagado" (2). Estado actual:', paymentData.status);
      // Aún así, para que Flow no marque error, puedes responder OK pero con otro mensaje.
      return res.status(200).send(`PAYMENT_NOT_CONFIRMED_STATUS_${paymentData.status}`);
    }

  } catch (error) {
    console.error('💥 Error fatal en confirmación:', error);
    // En caso de error interno del servidor, Flow espera un 500
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

// --- Función auxiliar para emails (asegúrate que esté definida) ---
async function sendConfirmationEmail(paymentData) {
  console.log('📧 Preparando envío de email para:', paymentData.payer);
  // ... (tu código para enviar email, que ya funciona) ...
  try {
    await fetch('https://formsubmit.co/makatatuajes@outlook.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _subject: '✅ Pago Confirmado - Maka Tatuajes',
        _template: 'table',
        commerce_order: paymentData.commerceOrder,
        amount: paymentData.amount,
        payer_email: paymentData.payer,
        status: paymentData.status,
      })
    });
    console.log('✅ Email de confirmación enviado');
  } catch (error) {
    console.error('❌ Error enviando email:', error);
  }
}
