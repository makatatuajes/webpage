// /api/flow/confirm.js - Vercel Serverless Function para Makatatuajes
const crypto = require('crypto');

console.log('=== MAKATATUAJES CONFIRM.JS LOADED ===');

// Configuración de Flow
const FLOW_CONFIG = {
  API_URL: process.env.FLOW_API_URL || 'https://sandbox.flow.cl/api',
  API_KEY: process.env.FLOW_API_KEY,
  SECRET_KEY: process.env.FLOW_SECRET_KEY
};

console.log('Confirm config check:', {
  hasApiKey: !!FLOW_CONFIG.API_KEY,
  hasSecretKey: !!FLOW_CONFIG.SECRET_KEY,
  apiUrl: FLOW_CONFIG.API_URL
});

// Función para generar firma Flow
function generateFlowSignature(params, secretKey) {
  try {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
    return crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
  } catch (error) {
    console.error('❌ Signature generation error:', error);
    throw error;
  }
}

// Función para enviar email con Resend
async function sendConfirmationEmail(paymentData, customerData) {
  console.log('📧 Enviando email de confirmación...');
  
  // Lista de administradores en CCO
  const adminEmails = [
    'macatrabajosdiseno@gmail.com',
    'hola@makatatuajes.com',
    'makatatuajes@outlook.com',
    'junglesoul.c@gmail.com'
  ];

  const customerEmail = customerData.email || paymentData.payer;
  const customerName = customerData.nombre || 'Cliente';
  const amount = parseInt(paymentData.amount).toLocaleString('es-CL');
  
  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Makatatuajes <onboarding@resend.dev>', // Cambiar por dominio verificado
        to: [customerEmail],
        bcc: adminEmails,
        subject: '✅ Confirmación de Pago - Makatatuajes',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background: #000; color: #fff; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px; }
              .header h1 { color: #ff00ff; }
              .content { background: #111; padding: 30px; border-radius: 10px; }
              .details { margin: 20px 0; }
              .detail-item { margin: 10px 0; padding: 10px; background: #222; border-radius: 5px; }
              .btn { display: inline-block; padding: 12px 24px; background: #ff00ff; color: #fff; text-decoration: none; border-radius: 5px; }
              .footer { text-align: center; margin-top: 30px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✨ ¡Pago Confirmado! ✨</h1>
              </div>
              
              <div class="content">
                <h2>Hola ${customerName},</h2>
                
                <p>Hemos recibido tu pago correctamente. Aquí están los detalles:</p>
                
                <div class="details">
                  <div class="detail-item"><strong>Número de orden:</strong> ${paymentData.commerceOrder || 'N/A'}</div>
                  <div class="detail-item"><strong>Monto pagado:</strong> $${amount} CLP</div>
                  <div class="detail-item"><strong>Concepto:</strong> ${paymentData.subject || 'Reserva de hora'}</div>
                  <div class="detail-item"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CL')}</div>
                </div>
                
                <p><strong>Próximos pasos:</strong></p>
                <ol>
                  <li>Te contactaré dentro de las próximas 48 horas</li>
                  <li>Coordinaremos los detalles de tu diseño</li>
                  <li>Agendaremos la fecha para tu tatuaje</li>
                </ol>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://makatatuajes.com" class="btn">Visitar Sitio Web</a>
                </div>
                
                <p>Si tienes alguna duda, responde este correo o contáctame por WhatsApp.</p>
                
                <p>Saludos,<br>
                <strong>Maka</strong><br>
                Makatatuajes</p>
              </div>
              
              <div class="footer">
                <p>© 2026 Makatatuajes - Todos los derechos reservados</p>
              </div>
            </div>
          </body>
          </html>
        `
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('❌ Error Resend:', errorText);
      return false;
    }

    const result = await emailResponse.json();
    console.log('✅ Email enviado exitosamente:', result.id);
    return true;

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return false;
  }
}

// Handler principal
module.exports = async function handler(req, res) {
  console.log('=== MAKATATUAJES CONFIRM HANDLER CALLED ===', {
    method: req.method,
    url: req.url
  });

  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Obtener parámetros de Flow
    const { token, s } = req.body;
    
    console.log('📦 Confirm params:', { token: token ? '✅' : '❌', s: s ? '✅' : '❌' });

    if (!token || !s) {
      console.error('❌ Token o firma no recibidos');
      return res.status(400).send('ERROR: Faltan parámetros');
    }

    // Verificar firma
    const paramsForVerification = {
      apiKey: FLOW_CONFIG.API_KEY,
      token: token
    };
    
    const expectedSignature = generateFlowSignature(paramsForVerification, FLOW_CONFIG.SECRET_KEY);
    console.log('🔐 Verificando firma...');

    if (s !== expectedSignature) {
      console.error('❌ Firma inválida');
      console.error('  Recibida:', s);
      console.error('  Esperada:', expectedSignature);
      return res.status(401).send('ERROR: Firma inválida');
    }

    console.log('✅ Firma verificada correctamente');

    // Consultar estado del pago
    const statusParams = {
      apiKey: FLOW_CONFIG.API_KEY,
      token: token
    };
    
    const statusSignature = generateFlowSignature(statusParams, FLOW_CONFIG.SECRET_KEY);
    
    const formData = new URLSearchParams();
    formData.append('apiKey', statusParams.apiKey);
    formData.append('token', statusParams.token);
    formData.append('s', statusSignature);

    console.log('🌐 Consultando estado del pago...');
    
    const flowResponse = await fetch(`${FLOW_CONFIG.API_URL}/payment/getStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const paymentData = await flowResponse.json();
    console.log('📥 Estado del pago:', paymentData);

    // Si el pago fue exitoso (status 2)
    if (paymentData.status === 2) {
      console.log('💰 Pago confirmado exitosamente!');
      
      // Parsear datos del cliente
      let customerData = {};
      try {
        customerData = JSON.parse(paymentData.optional || '{}');
        console.log('👤 Datos del cliente:', customerData);
      } catch (e) {
        console.log('No hay datos adicionales del cliente');
      }

      // Enviar email de confirmación
      await sendConfirmationEmail(paymentData, customerData);

      // Responder a Flow con éxito
      return res.status(200).send('PAYMENT_CONFIRMED');
      
    } else {
      console.log('⏳ Pago no confirmado, estado:', paymentData.status);
      return res.status(200).send(`PAYMENT_NOT_CONFIRMED`);
    }

  } catch (error) {
    console.error('❌❌❌ Error fatal en confirmación:', error);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};
