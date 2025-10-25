// /api/flow/payment.js - Vercel Serverless Function
const crypto = require('crypto');

// Configuration - make sure these are set in Vercel environment variables
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

// Generate Flow signature
function generateFlowSignature(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
  return crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
}

// Generate unique order number
function generateOrderNumber() {
  return `MAKA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

module.exports = async (req, res) => {
  console.log('=== FLOW PAYMENT API CALLED ===');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse JSON body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { abono, nombre, email, celular, genero, comentarios, price } = body;

    // Validate required fields
    if (!abono || !nombre || !email || !celular || !genero || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'All fields are required'
      });
    }

    const amount = parseInt(price);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    // Check if Flow credentials are configured
    if (!FLOW_CONFIG.API_KEY || !FLOW_CONFIG.SECRET_KEY) {
      console.error('Flow credentials not configured');
      return res.status(500).json({ 
        error: 'Payment system not configured',
        details: 'Please contact administrator'
      });
    }

    const commerceOrder = generateOrderNumber();
    
    // Prepare Flow parameters
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
      optional: JSON.stringify({
        nombre: nombre,
        celular: celular,
        genero: genero,
        comentarios: comentarios || '',
        abono: abono
      })
    };

    // Generate signature
    const signature = generateFlowSignature(flowParams, FLOW_CONFIG.SECRET_KEY);
    flowParams.s = signature;

    // Create form data for Flow API
    const formData = new URLSearchParams();
    Object.keys(flowParams).forEach(key => {
      formData.append(key, flowParams[key]);
    });

    // Call Flow API
    const flowResponse = await fetch(`${FLOW_CONFIG.API_URL}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    if (!flowResponse.ok) {
      throw new Error(`Flow API error: ${flowResponse.status}`);
    }

    const flowResult = await flowResponse.json();

    if (flowResult.url && flowResult.token) {
      return res.status(200).json({
        success: true,
        flowUrl: `${flowResult.url}?token=${flowResult.token}`,
        commerceOrder: commerceOrder,
        token: flowResult.token
      });
    } else {
      throw new Error(flowResult.message || 'Error from Flow API');
    }

  } catch (error) {
    console.error('Payment error:', error);
    return res.status(500).json({ 
      error: 'Payment processing failed',
      details: error.message
    });
  }
};
