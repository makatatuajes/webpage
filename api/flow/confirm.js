// /api/flow/confirm.js - Versión con Resend
const crypto = require('crypto');

const FLOW_CONFIG = {
  API_URL: process.env.FLOW_API_URL || 'https://www.flow.cl/api',
  API_KEY: process.env.FLOW_API_KEY,
  SECRET_KEY: process.env.FLOW_SECRET_KEY
};

// Función para generar firma Flow
function generateFlowSignature(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
  return crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
}

// Función para enviar email usando Resend API
async function sendConfirmationEmailWithResend(paymentData, customerEmail, customerName) {
  console.log('📧 Enviando email con Resend...');
  
  // Lista de destinatarios admin (CCO)
  const adminEmails = [
    'macatrabajosdiseno@gmail.com',
    'hola@makatatuajes.com',
    'makatatuajes@outlook.com',
    'junglesoul.c@gmail.com'
  ];
  
  try {
    const emailData = {
      from: 'Makatatuajes <onboarding@resend.dev>', // Cambia esto por tu dominio verificado
      to: [customerEmail], // Cliente como destinatario principal
      bcc: adminEmails, // Admins en copia oculta
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
                .detail-item { margin: 10px 0; }
                .btn { display: inline-block; padding: 10px 20px; background: #ff00ff; color: #fff; text-decoration: none; border-radius: 5px; }
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
                        <div class="detail-item"><strong>Número de transacción:</strong> ${paymentData.commerceOrder || 'N/A'}</div>
                        <div class="detail-item"><strong>Monto pagado:</strong> $${parseInt(paymentData.amount).toLocaleString('es-CL')} CLP</div>
                        <div class="detail-item"><strong>Concepto:</strong> ${paymentData.subject || 'Reserva de hora'}</div>
                        <div class="detail-item"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CL')}</div>
                    </div>
                    
                    <p>Próximos pasos:</p>
                    <ol>
                        <li>Te contactaré dentro de las próximas 48 horas</li>
                        <li>Coordinaremos los detalles de tu diseño</li>
                        <li>Agendaremos la fecha para tu tatuaje</li>
                    </ol>
                    
                    <p style="text-align: center;">
                        <a href="https://makatatuajes.com" class="btn">Visitar Sitio Web</a>
                    </p>
                    
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
    };

    // Aquí haces la llamada a tu API de Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error Resend: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Email enviado exitosamente:', result);
    return true;

  } catch (error) {
    console.error('❌ Error enviando email con Resend:', error);
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { token, s } = req.body;

    if (!token || !s) {
      return res.status(400).send('ERROR: Faltan parámetros');
    }

    // Verificar firma
    const paramsForVerification = {
      apiKey: FLOW_CONFIG.API_KEY,
      token: token
    };
    const expectedSignature = generateFlowSignature(paramsForVerification, FLOW_CONFIG.SECRET_KEY);

    if (s !== expectedSignature) {
      console.error('❌ Firma inválida');
      return res.status(401).send('ERROR: Firma inválida');
    }

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

    const flowResponse = await fetch(`${FLOW_CONFIG.API_URL}/payment/getStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const paymentData = await flowResponse.json();

    if (paymentData.status === 2) { // Pago exitoso
      console.log('💰 Pago confirmado:', paymentData);
      
      // Recuperar datos del cliente (deberías tenerlos en paymentData.optional)
      let customerData = {};
      try {
        customerData = JSON.parse(paymentData.optional || '{}');
      } catch (e) {
        console.log('No hay datos adicionales del cliente');
      }

      // Enviar email de confirmación
      await sendConfirmationEmailWithResend(
        paymentData, 
        customerData.email || paymentData.payer, 
        customerData.nombre || 'Cliente'
      );

      return res.status(200).send('PAYMENT_CONFIRMED');
      
    } else {
      console.log('Pago no confirmado, estado:', paymentData.status);
      return res.status(200).send(`PAYMENT_NOT_CONFIRMED`);
    }

  } catch (error) {
    console.error('💥 Error en confirmación:', error);
    return res.status(500).json({ error: 'Error interno', details: error.message });
  }
};
