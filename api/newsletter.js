// api/newsletter.js
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Método no permitido' 
        });
    }

    try {
        const { nombre, apellido, telefono, instagram, email } = req.body;

        // Validar campos requeridos
        if (!nombre || !apellido || !telefono || !instagram || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Todos los campos son requeridos' 
            });
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email inválido' 
            });
        }

        console.log('Procesando suscripción newsletter:', { nombre, apellido, email });

        // Verificar que la API key de Resend existe
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        
        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY no está configurada en las variables de entorno');
            
            // En desarrollo, simulamos el envío
            if (process.env.NODE_ENV === 'development') {
                console.log('MODO DESARROLLO: Email simulado enviado a:', 'makatatuajes@outlook.com');
                return res.status(200).json({ 
                    success: true, 
                    message: 'Suscripción exitosa (modo desarrollo)',
                    data: { mock: true }
                });
            }
            
            return res.status(500).json({ 
                success: false, 
                error: 'Error de configuración del servidor - API key no encontrada' 
            });
        }

        // Preparar contenido del email
        const emailContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #ff00ff; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .field { margin-bottom: 15px; }
                    .label { font-weight: bold; color: #ff00ff; }
                    .value { margin-left: 10px; }
                    hr { border: 1px solid #ff00ff; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎨 Nuevo Suscriptor Newsletter</h1>
                    </div>
                    <div class="content">
                        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
                        <hr>
                        
                        <h3 style="color: #ff00ff;">📋 Datos del suscriptor:</h3>
                        
                        <div class="field">
                            <span class="label">Nombre completo:</span>
                            <span class="value">${nombre} ${apellido}</span>
                        </div>
                        
                        <div class="field">
                            <span class="label">Email:</span>
                            <span class="value">${email}</span>
                        </div>
                        
                        <div class="field">
                            <span class="label">Teléfono:</span>
                            <span class="value">${telefono}</span>
                        </div>
                        
                        <div class="field">
                            <span class="label">Instagram:</span>
                            <span class="value">@${instagram}</span>
                        </div>
                        
                        <hr>
                        
                        <p style="color: #666; font-size: 12px; text-align: center;">
                            Este suscriptor se ha registrado a través del formulario de newsletter en makatatuajes.com<br>
                            Fecha y hora: ${new Date().toLocaleString('es-CL')}
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Texto plano como alternativa
        const textContent = `
            NUEVO SUSCRIPTOR NEWSLETTER - MAKATATUAJES
            
            Fecha: ${new Date().toLocaleString('es-CL')}
            
            DATOS DEL SUSCRIPTOR:
            - Nombre: ${nombre} ${apellido}
            - Email: ${email}
            - Teléfono: ${telefono}
            - Instagram: @${instagram}
            
            Este suscriptor se ha registrado a través del formulario de newsletter en makatatuajes.cl
        `;

        // Enviar email via Resend
        console.log('Enviando email via Resend...');
        
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Makatatuajes <onboarding@resend.dev>', // Usa onboarding@resend.dev para pruebas
                to: ['makatatuajes@outlook.com'],
                subject: '📬 Nuevo suscriptor Newsletter - Makatatuajes',
                html: emailContent,
                text: textContent,
                replyTo: email
            })
        });

        const result = await response.json();
        console.log('Respuesta de Resend:', result);

        if (!response.ok) {
            console.error('Error de Resend:', result);
            throw new Error(result.message || 'Error al enviar el email');
        }

        // También podemos guardar en una base de datos o archivo si queremos
        // Por ahora solo enviamos el email

        return res.status(200).json({ 
            success: true, 
            message: 'Suscripción exitosa - Revisa tu correo',
            data: { 
                id: result.id,
                email: email 
            }
        });

    } catch (error) {
        console.error('Error en newsletter API:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error al procesar la suscripción: ' + error.message
        });
    }
}
