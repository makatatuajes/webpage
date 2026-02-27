const crypto = require('crypto');

// ⚠️ IMPORTANT: Use Vercel URL directly for Flow callbacks
// Custom domain blocks form-encoded POSTs from Flow's servers
const VERCEL_URL = 'https://webpage-nine-mu.vercel.app';
const PRODUCTION_URL = 'https://makatatuajes.com';

const FLOW_CONFIG = {
  API_URL: 'https://www.flow.cl/api',
  API_KEY: process.env.FLOW_API_KEY,
  SECRET_KEY: process.env.FLOW_SECRET_KEY,
  URL_CONFIRMATION: `${VERCEL_URL}/api/flow/confirm`,
  URL_RETURN: `${VERCEL_URL}/api/flow/payment`
};

console.log('=== PAYMENT.JS LOADED ===');
console.log('URL_RETURN:', FLOW_CONFIG.URL_RETURN);
console.log('URL_CONFIRMATION:', FLOW_CONFIG.URL_CONFIRMATION);
console.log('HAS API_KEY:', !!FLOW_CONFIG.API_KEY);
console.log('HAS SECRET_KEY:', !!FLOW_CONFIG.SECRET_KEY);

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
        <a href="${PRODUCTION_URL}" class="btn">Volver al Inicio</a>
        <div class="footer"><p>Makatatuajes - Arte en piel con estilo urbano</p></div>
    </div>
</body>
</html>`;

module.exports = async function handler(req, res) {
  console.log('=== PAYMENT.JS HANDLER ===', req.method);
  console.log('Content-Type:', req.headers['content-type']);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ==============================
  // FLOW RETURN — detect by token without price field
  // ==============================
  if (req.method === 'GET' || req.method === 'POST') {
    let token = '';

    if (req.method === 'GET' && req.query && req.query.token) {
      token = req.query.token;
      console.log('✅ Flow GET return, token:', token);
    }

    if (req.method === 'POST' && req.body) {
      const body = typeof req.body === 'string'
        ? Object.fromEntries(new URLSearchParams(req.body))
        : req.body;
      console.log('📦 POST body keys:', Object.keys(body));
      if (body.token && !body.price) {
        token = body.token;
        console.log('✅ Flow POST return, token:', token);
      }
    }

    if (token) {
      console.log('🔍 Checking payment status for token:', token);

      try {
        // Query Flow for the real payment status
        const apiKey = process.env.FLOW_API_KEY;
        const secretKey = process.env.FLOW_SECRET_KEY;

        const params = new URLSearchParams({ apiKey, token });
        const signature = crypto
          .createHmac('sha256', secretKey)
          .update(params.toString())
          .digest('hex');
        params.append('s', signature);

        const statusRes = await fetch(`${FLOW_CONFIG.API_URL}/payment/getStatus?${params.toString()}`);
        const paymentData = await statusRes.json();
        console.log('📦 Payment status:', paymentData.status, 'order:', paymentData.commerceOrder);

        if (paymentData.status === 2) {
          // Payment successful
          console.log('✅ Payment success, redirecting to success page');
          res.writeHead(302, { Location: `${PRODUCTION_URL}/success.html` });
        } else {
          // Payment rejected, cancelled or pending
          console.log('❌ Payment not successful, status:', paymentData.status);
          res.writeHead(302, { Location: `${PRODUCTION_URL}/error.html?status=${paymentData.status}` });
        }
      } catch (err) {
        console.error('❌ Error checking status:', err.message);
        res.writeHead(302, { Location: `${PRODUCTION_URL}/error.html` });
      }

      return res.end();
    }
  }

  // ==============================
  // NEW PAYMENT — POST from frontend
  // ==============================
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!FLOW_CONFIG.API_KEY || !FLOW_CONFIG.SECRET_KEY) {
    console.error('❌ MISSING CREDENTIALS');
    return res.status(500).json({ error: 'Credenciales de Flow no configuradas' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('📦 New payment body:', JSON.stringify(body));

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
    console.log('📥 Flow response:', JSON.stringify(flowResult));

    if (flowResult.url && flowResult.token) {
      console.log('✅ Payment created:', flowResult.flowOrder);
      return res.status(200).json({
        success: true,
        flowUrl: `${flowResult.url}?token=${flowResult.token}`,
        commerceOrder,
        token: flowResult.token
      });
    }

    throw new Error(flowResult.message || 'Error creating payment');

  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({ error: 'Error interno', details: error.message });
  }
};
