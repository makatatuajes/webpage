// /api/flow/payment.js - Vercel Serverless Function para Makatatuajes
const crypto = require('crypto');

console.log('=== MAKATATUAJES PAYMENT.JS LOADED ===');

// Función para determinar la URL base correcta
// REMOVED: getBaseUrl was causing wrong URL to be sent to Flow
function getBaseUrl_DISABLED() {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

// Hardcoded production URLs - no env var dependencies
const PRODUCTION_URL = 'https://makatatuajes.com';

const FLOW_CONFIG = {
  API_URL: 'https://www.flow.cl/api',
  API_KEY: process.env.FLOW_API_KEY,
  SECRET_KEY: process.env.FLOW_SECRET_KEY,
  URL_CONFIRMATION: `${PRODUCTION_URL}/api/flow/confirm`,
  URL_RETURN: `${PRODUCTION_URL}/api/flow/success`
};

console.log('🚨 FLOW URLs being used:');
console.log('  urlReturn:', FLOW_CONFIG.URL_RETURN);
console.log('  urlConfirmation:', FLOW_CONFIG.URL_CONFIRMATION);

console.log('Makatatuajes Flow config check:', {
  hasApiKey: !!FLOW_CONFIG.API_KEY,
  hasSecretKey: !!FLOW_CONFIG.SECRET_KEY,
  apiUrl: FLOW_CONFIG.API_URL,
  urlReturn: FLOW_CONFIG.URL_RETURN,
  urlConfirmation: FLOW_CONFIG.URL_CONFIRMATION,
  baseUrl: PRODUCTION_URL
});

// Función para generar firma Flow
function generateFlowSignature(params, secretKey) {
  try {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
    const signature = crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
    console.log('✅ Firma generada exitosamente');
    return signature;
  } catch (error) {
    console.error('❌ Signature generation error:', error);
    throw error;
  }
}

// Función para generar número de orden único
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `MAKA-${timestamp}-${random}`;
}

// Handler principal
module.exports = async function handler(req, res) {
  console.log('=== MAKATATUAJES HANDLER CALLED ===', {
    method: req.method,
    url: req.url
  });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!FLOW_CONFIG.API_KEY || !FLOW_CONFIG.SECRET_KEY) {
    console.error('❌ MISSING CREDENTIALS');
    return res.status(500).json({ 
      error: 'Configuración incompleta',
      details: 'Credenciales de Flow no configuradas correctamente'
    });
  }

  try {
    console.log('📦 Request body received');
    
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }
    
    console.log('📦 Body recibido:', JSON.stringify(body, null, 2));

    const { abono, nombre, email, celular, genero, comentarios, price } = body;

    if (!abono || !nombre || !email || !celular || !genero || !comentarios || !price) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const amount = parseInt(price);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Precio inválido' });
    }

    const commerceOrder = generateOrderNumber();
    console.log('📝 Order generated:', commerceOrder);

    const customerData = {
      nombre: nombre,
      email: email,
      celular: celular,
      genero: genero,
      comentarios: comentarios || '',
      abono: abono,
      monto: amount,
      fecha: new Date().toISOString()
    };

    console.log('👤 Customer data:', customerData);

    const flowParams = {
      apiKey: FLOW_CONFIG.API_KEY,
      commerceOrder: commerceOrder,
      subject: `Maka Tatuajes - ${abono}`,
      currency: 'CLP',
      amount: amount,
      email: email,
      paymentMethod: 9,
      urlConfirmation: FLOW_CONFIG.URL_CONFIRMATION,
      urlReturn: FLOW_CONFIG.URL_RETURN,
      optional: JSON.stringify(customerData)
    };

    console.log('📤 Flow params prepared:');
    console.log('  ➡️  urlReturn:', flowParams.urlReturn);
    console.log('  ➡️  urlConfirmation:', flowParams.urlConfirmation);

    const signature = generateFlowSignature(flowParams, FLOW_CONFIG.SECRET_KEY);
    flowParams.s = signature;
    console.log('🔐 Firma generada');

    const formData = new URLSearchParams();
    Object.keys(flowParams).forEach(key => {
      formData.append(key, flowParams[key]);
    });

    console.log('🌐 Llamando a Flow API');

    const flowResponse = await fetch(`${FLOW_CONFIG.API_URL}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    console.log('📥 Flow API response status:', flowResponse.status);

    const responseText = await flowResponse.text();
    console.log('📥 Flow API response text:', responseText);

    let flowResult;
    try {
      flowResult = JSON.parse(responseText);
      console.log('✅ Flow API response parsed:', flowResult);
    } catch (e) {
      console.error('❌ Error parsing Flow response as JSON:', e);
      throw new Error('Respuesta inválida de Flow');
    }

    if (flowResult.url && flowResult.token) {
      console.log('✅ Payment created successfully!');
      
      // ✅ GUARDAR TOKEN EN COOKIE (AHORA ANTES DE RESPONDER)
      res.setHeader('Set-Cookie', `payment_token=${flowResult.token}; Path=/; HttpOnly; Max-Age=3600; SameSite=Lax`);
      
      const flowPaymentUrl = `${flowResult.url}?token=${flowResult.token}`;
      console.log('🔗 Payment URL:', flowPaymentUrl);
      
      return res.status(200).json({
        success: true,
        flowUrl: flowPaymentUrl,
        commerceOrder: commerceOrder,
        token: flowResult.token
      });
    } else {
      console.error('❌ Flow API error response:', flowResult);
      throw new Error(flowResult.message || 'Error al crear el pago en Flow');
    }

  } catch (error) {
    console.error('❌❌❌ FATAL ERROR in handler:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};
