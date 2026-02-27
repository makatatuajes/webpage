// /api/flow/payment.js - Handles payment creation AND Flow return
const crypto = require('crypto');

const PRODUCTION_URL = 'https://makatatuajes.com';

const FLOW_CONFIG = {
  API_URL: 'https://www.flow.cl/api',
  API_KEY: process.env.FLOW_API_KEY,
  SECRET_KEY: process.env.FLOW_SECRET_KEY,
  URL_CONFIRMATION: `${PRODUCTION_URL}/api/flow/confirm`,
  URL_RETURN: 'https://webpage-nine-mu.vercel.app/api/flow/payment'
};

function generateFlowSignature(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
  return crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
}

function generateOrderNumber() {
  return `MAKA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pago Exitoso - Makatatuajes</title>
    <style>
        :root { --bg-primary:#000; --bg-secondary:#111; --text-primary:#fff; --text-secondary:#ccc; --accent:#ff00ff; --accent-hover:#ff66ff; }
        body { font-family:'Segoe UI',sans-serif; background-color:var(--bg-primary); color:var(--text-primary); margin:0; padding:0; min-height:100vh; display:flex; justify-content:center; align-items:center; }
        .success-container { text-align:center; padding:2rem; max-width:600px; }
        .success-icon { font-size:5rem; color:#00ff00; margin-bottom:2rem; }
        h1 { color:var(--accent); margin-bottom:1.5rem; }
        .message-box { background:var(--bg-secondary); padding:2rem; border-radius:10px; margin:2rem 0; border:1px solid rgba(255,0,255,0.2); }
        .btn { display:inline-block; padding:1rem 2rem; background-color:var(--accent); color:var(--text-primary); text-decoration:none; border-radius:30px; font-weight:bold; transition:all 0.3s ease; border:none; cursor:pointer; margin:0.5rem; }
        .btn:hover { background-color:var(--accent-hover); transform:translateY(-3px); box-shadow:0 5px 15px rgba(255,0,255,0.4); }
        .footer { margin-top:2rem; color:var(--text-secondary); }
    </style>
</head>
<body>
    <div class="success-container">
        <div class="success-icon">✓</div>
        <h1>¡Pago Exitoso!</h1>
        <div class="message-box">
            <p style="font-size:1.2rem;margin-bottom:1rem">Tu reserva ha sido confirmada</p>
            <p style="color:var(--text-secondary)">Hemos enviado un correo con los detalles de tu reserva.<br>Pronto me pondré en contacto contigo para coordinar tu cita.</p>
        </div>
        <a href="/" class="btn">Volver al Inicio</a>
        <div class="footer"><p>Makatatuajes - Arte en piel con estilo urbano</p></div>
    </div>
</body>
</html>`;

module.exports = async function handler(req, res) {
  console.log('=== PAYMENT.JS CALLED ===', req.method);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ==============================
  // FLOW RETURN — GET or POST with token = user came back from Flow
  // ==============================
  if (req.method === 'GET' || req.method === 'POST') {
    // Check if this is a Flow return (has token but no payment form fields)
    let token = '';

    if (req.method === 'GET' && req.query && req.query.token) {
      token = req.query.token;
    }

    if (req.method === 'POST' && req.body) {
      const body = typeof req.body === 'string'
        ? Object.fromEntries(new URLSearchParams(req.body))
        : req.body;

      // If body has token but no 'price' field → this is Flow's return POST, not a new payment
      if (body.token && !body.price) {
        token = body.token;
      }
    }

    if (token) {
      console.log('✅ Flow return detected, token:', token);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(SUCCESS_HTML);
    }
  }

  // ==============================
  // NEW PAYMENT — POST from frontend form
  // ==============================
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!FLOW_CONFIG.API_KEY || !FLOW_CONFIG.SECRET_KEY) {
    console.error('❌ MISSING CREDENTIALS');
    return res.status(500).json({ error: 'Credenciales de Flow no configuradas' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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
    console.log('📝 Order:', commerceOrder);

    const flowParams = {
      apiKey: FLOW_CONFIG.API_KEY,
      commerceOrder,
      subject: `Maka Tatuajes - ${abono}`,
      currency: 'CLP',
      amount,
      email,
      paymentMethod: 9,
      urlConfirmation: FLOW_CONFIG.URL_CONFIRMATION,
      urlReturn: FLOW_CONFIG.URL_RETURN,
      optional: JSON.stringify({ nombre, email, celular, genero, comentarios, abono, monto: amount, fecha: new Date().toISOString() })
    };

    console.log('➡️  urlReturn:', flowParams.urlReturn);
    console.log('➡️  urlConfirmation:', flowParams.urlConfirmation);

    flowParams.s = generateFlowSignature(flowParams, FLOW_CONFIG.SECRET_KEY);

    const formData = new URLSearchParams();
    Object.keys(flowParams).forEach(key => formData.append(key, flowParams[key]));

    console.log('🌐 Calling Flow API...');
    const flowResponse = await fetch(`${FLOW_CONFIG.API_URL}/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const flowResult = JSON.parse(await flowResponse.text());
    console.log('📥 Flow response:', flowResult);

    if (flowResult.url && flowResult.token) {
      console.log('✅ Payment created!');
      return res.status(200).json({
        success: true,
        flowUrl: `${flowResult.url}?token=${flowResult.token}`,
        commerceOrder,
        token: flowResult.token
      });
    }

    throw new Error(flowResult.message || 'Error creating payment');

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: 'Error interno', details: error.message });
  }
};
