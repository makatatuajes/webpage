// /api/flow/payment.js - Vercel Serverless Function para integración con Flow (CommonJS)
const crypto = require('crypto');

console.log('=== PAYMENT.JS LOADED ===');

// Configuración de Flow
const FLOW_CONFIG = {
  API_URL: process.env.FLOW_API_URL || 'https://sandbox.flow.cl/api',
  API_KEY: process.env.FLOW_API_KEY,
  SECRET_KEY: process.env.FLOW_SECRET_KEY,
  URL_CONFIRMATION: process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/api/flow/confirm` 
    : 'http://localhost:3000/api/flow/confirm',
  URL_RETURN: process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/success` 
    : 'http://localhost:3000/success'
};

// Función para generar firma Flow
function generateFlowSignature(params, secretKey) {
  try {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
    return crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
  } catch (error) {
    console.error('Signature generation error:', error);
    throw error;
  }
}

// Función para generar número de orden único
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `MAKA-${timestamp}-${random}`;
}

module.exports = async function handler(req, res) {
  console.log('=== PAYMENT API CALLED ===', {
    method: req.method,
    url: req.url
  });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Validate environment variables
  if (!FLOW_CONFIG.API_KEY || !FLOW_CONFIG.SECRET_KEY) {
    console.error('MISSING FLOW CREDENTIALS');
    return res.status(500).json({ 
      error: 'Configuración incompleta',
      details: 'Credenciales de Flow no configuradas'
    });
  }

  try {
    console.log('Parsing request body...');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('Body received:', body);

    // Validate required fields
    const { abono, nombre, email, celular, genero, price } = body;

    if (!abono || !nombre || !email || !celular || !genero || !price) {
      console.log('Missing required fields:', { abono, nombre, email, celular, genero, price });
      return res.status(400).json({ 
        error: 'Faltan datos requeridos',
        details: 'Todos los campos son obligatorios'
      });
    }

    const amount = parseInt(price);
    if (isNaN(amount) || amount <= 0) {
      console.log('Invalid price:', price);
      return res.status(400).json({ error: 'Precio inválido' });
    }

    const commerceOrder = generateOrderNumber();
    console.log('Generated order:', commerceOrder);

    // Prepare Flow parameters
    const flowParams = {
      apiKey: FLOW_CONFIG.API_KEY,
      commerceOrder: commerceOrder,
      subject: `Maka Tatuajes - ${abono}`,
      currency: 'CLP',
      amount: amount,
      email: email,
      paymentMethod: 9, // All payment methods
      urlConfirmation: FLOW_CONFIG.URL_CONFIRMATION,
      urlReturn: FLOW_CONFIG.URL_RETURN,
      optional: JSON.stringify({
        nombre: nombre,
        celular: celular,
        genero: genero,
        comentarios: body.comentarios || '',
        abono: abono
      })
    };

    console.log('Flow params:', flowParams);

    // Generate signature
    const signature = generateFlowSignature(flowParams, FLOW_CONFIG.SECRET_KEY);
    flowParams.s = signature;

    // Create URL-encoded form data for Flow
    const formData = new URLSearchParams();
    Object.keys(flowParams).forEach(key => {
      formData.append(key, flowParams[key]);
    });

    console.log('Calling Flow API...');

    // Call Flow API
    const flowResponse = await fetch(`${FLOW_CONFIG.API_URL}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    console.log('Flow API response status:', flowResponse.status);

    if (!flowResponse.ok) {
      throw new Error(`Flow API error: ${flowResponse.status}`);
    }

    const flowResult = await flowResponse.json();
    console.log('Flow API response:', flowResult);

    if (flowResult.url && flowResult.token) {
      console.log('Payment created successfully');
      
      return res.status(200).json({
        success: true,
        flowUrl: `${flowResult.url}?token=${flowResult.token}`,
        commerceOrder: commerceOrder,
        token: flowResult.token
      });
    } else {
      console.error('Flow API error:', flowResult);
      throw new Error(flowResult.message || 'Error en la respuesta de Flow');
    }

  } catch (error) {
    console.error('FATAL ERROR:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};
