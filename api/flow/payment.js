// /api/flow/payment.js - Vercel Serverless Function para Makatatuajes
const crypto = require('crypto');

console.log('=== MAKATATUAJES PAYMENT.JS LOADED ===');

// Configuración de Flow para Makatatuajes
const FLOW_CONFIG = {
  API_URL: process.env.FLOW_API_URL || 'https://sandbox.flow.cl/api',
  API_KEY: process.env.FLOW_API_KEY,
  SECRET_KEY: process.env.FLOW_SECRET_KEY,
  URL_CONFIRMATION: process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/api/flow/confirm` 
    : 'http://localhost:3000/api/flow/confirm',
  URL_RETURN: process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/success.html` 
    : 'https://makatatuajes.com/success.html'
};

console.log('Makatatuajes Flow config check:', {
  hasApiKey: !!FLOW_CONFIG.API_KEY,
  hasSecretKey: !!FLOW_CONFIG.SECRET_KEY,
  apiUrl: FLOW_CONFIG.API_URL,
  urlReturn: FLOW_CONFIG.URL_RETURN,
  urlConfirmation: FLOW_CONFIG.URL_CONFIRMATION
});

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

// Función para generar número de orden único para Makatatuajes
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
    console.error('MISSING CREDENTIALS:', {
      API_KEY: FLOW_CONFIG.API_KEY,
      SECRET_KEY: FLOW_CONFIG.SECRET_KEY
    });
    return res.status(500).json({ 
      error: 'Configuración incompleta',
      details: 'Credenciales de Flow no configuradas correctamente'
    });
  }

  try {
    console.log('Request body received');
    
    // Parse body
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }
    
    console.log('Body:', body);

    // Obtener datos del formulario
    const { abono, nombre, email, celular, genero, comentarios, price } = body;

    // Validación de campos requeridos
    if (!abono || !nombre || !email || !celular || !genero || !comentarios || !price) {
      console.log('Missing required fields:', { abono, nombre, email, celular, genero, comentarios, price });
      return res.status(400).json({ 
        error: 'Faltan datos requeridos',
        received: { abono, nombre, email, celular, genero, comentarios, price }
      });
    }

    const amount = parseInt(price);
    if (isNaN(amount) || amount <= 0) {
      console.log('Invalid price:', price);
      return res.status(400).json({ error: 'Precio inválido' });
    }

    const commerceOrder = generateOrderNumber();
    console.log('Generated order:', commerceOrder);

    // IMPORTANTE: Guardar todos los datos del cliente en optional
    // para que estén disponibles en confirm.js
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

    console.log('Customer data para confirmación:', customerData);

    // Preparar parámetros para Flow
    const flowParams = {
      apiKey: FLOW_CONFIG.API_KEY,
      commerceOrder: commerceOrder,
      subject: `Maka Tatuajes - ${abono}`,
      currency: 'CLP',
      amount: amount,
      email: email,
      paymentMethod: 9, // 9 = Todos los medios de pago
      urlConfirmation: FLOW_CONFIG.URL_CONFIRMATION,
      urlReturn: FLOW_CONFIG.URL_RETURN,
      // Datos adicionales para confirmación - TODOS los datos del cliente
      optional: JSON.stringify(customerData)
    };

    console.log('Flow params prepared:', flowParams);

    // Generar firma
    const signature = generateFlowSignature(flowParams, FLOW_CONFIG.SECRET_KEY);
    flowParams.s = signature;

    // Crear formulario URL-encoded para Flow
    const formData = new URLSearchParams();
    Object.keys(flowParams).forEach(key => {
      formData.append(key, flowParams[key]);
    });

    console.log('Calling Flow API...', FLOW_CONFIG.API_URL);

    // Llamar a Flow API
    const flowResponse = await fetch(`${FLOW_CONFIG.API_URL}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    console.log('Flow API response status:', flowResponse.status);

    const flowResult = await flowResponse.json();
    console.log('Flow API response:', flowResult);

    if (flowResult.url && flowResult.token) {
      console.log('✅ Payment created successfully for Makatatuajes');
      
      // Construir URL completa de Flow
      const flowPaymentUrl = `${flowResult.url}?token=${flowResult.token}`;
      
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
    console.error('❌ FATAL ERROR in handler:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};
