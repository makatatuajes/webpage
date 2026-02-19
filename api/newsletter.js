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
            console.error('RESEND_API_KEY no está configurada');
            return res.status(500).json({ 
                success: false, 
                error: 'Error de configuración del servidor - API key no encontrada'
            });
        }

        // Generar código de descuento único
        const discountCode = generateDiscountCode(nombre, apellido);
        
        // EMAIL 1: Para el administrador (notificación de nuevo suscriptor)
        const adminEmailContent = createAdminEmail(nombre, apellido, telefono, instagram, email);
        
        // EMAIL 2: Para el cliente (bienvenida con cupón de descuento)
        const clientEmailContent = createClientEmail(nombre, apellido, discountCode);

        // Enviar ambos emails en paralelo para mejor rendimiento
        const [adminEmailResult, clientEmailResult] = await Promise.allSettled([
            // Email al administrador
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Makatatuajes <onboarding@resend.dev>',
                    to: ['makatatuajes@outlook.com'],
                    subject: '📬 Nuevo suscriptor Newsletter - Makatatuajes',
                    html: adminEmailContent,
                    replyTo: email
                })
            }),
            
            // Email al cliente con descuento
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Makatatuajes <onboarding@resend.dev>',
                    to: [email], // Enviar al email del suscriptor
                    subject: '🎁 Bienvenido al Club de Descuentos de Makatatuajes - 10% de descuento',
                    html: clientEmailContent
                })
            })
        ]);

        // Verificar resultados
        if (adminEmailResult.status === 'rejected' || clientEmailResult.status === 'rejected') {
            console.error('Error enviando emails:', { adminEmailResult, clientEmailResult });
            // Aún así retornamos éxito parcial porque al menos se procesó la suscripción
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Suscripción exitosa - Revisa tu correo para el cupón de descuento',
            discountCode: discountCode,
            data: { 
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

// Función para generar código de descuento único
function generateDiscountCode(nombre, apellido) {
    const initials = (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 dígitos aleatorios
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    
    return `BIENVENIDA${initials}${randomNum}`;
}

// Función para crear email del administrador
function createAdminEmail(nombre, apellido, telefono, instagram, email) {
    return `
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
                hr { border: 1px solid #ff00ff; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎨 Nuevo Suscriptor del Club de Descuentos</h1>
                </div>
                <div class="content">
                    <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
                    <hr>
                    
                    <h3 style="color: #ff00ff;">📋 Datos del suscriptor:</h3>
                    
                    <div class="field">
                        <span class="label">Nombre completo:</span>
                        <span>${nombre} ${apellido}</span>
                    </div>
                    
                    <div class="field">
                        <span class="label">Email:</span>
                        <span>${email}</span>
                    </div>
                    
                    <div class="field">
                        <span class="label">Teléfono:</span>
                        <span>${telefono}</span>
                    </div>
                    
                    <div class="field">
                        <span class="label">Instagram:</span>
                        <span>@${instagram}</span>
                    </div>
                    
                    <hr>
                    <p style="color: #666; font-size: 12px; text-align: center;">
                        Se ha enviado un email de bienvenida con cupón de descuento al suscriptor.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Función para crear email del cliente con descuento
function createClientEmail(nombre, apellido, discountCode) {
    const fechaExpiracion = new Date();
    fechaExpiracion.setMonth(fechaExpiracion.getMonth() + 3); // Válido por 3 meses
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    margin: 0;
                    padding: 0;
                    background-color: #000;
                }
                .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    background: #111;
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(255, 0, 255, 0.2);
                    border: 1px solid rgba(255, 0, 255, 0.3);
                }
                .header { 
                    background: linear-gradient(135deg, #ff00ff 0%, #ff66ff 100%);
                    padding: 30px 20px;
                    text-align: center;
                }
                .header img {
                    max-width: 150px;
                    margin-bottom: 15px;
                }
                .header h1 {
                    color: white;
                    margin: 0;
                    font-size: 28px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }
                .content { 
                    padding: 40px 30px;
                    background: #111;
                    color: #fff;
                }
                .discount-box {
                    background: rgba(255, 0, 255, 0.1);
                    border: 2px dashed #ff00ff;
                    border-radius: 15px;
                    padding: 30px;
                    text-align: center;
                    margin: 30px 0;
                }
                .discount-code {
                    font-size: 32px;
                    font-weight: bold;
                    color: #ff00ff;
                    letter-spacing: 3px;
                    background: #000;
                    padding: 15px 25px;
                    border-radius: 50px;
                    display: inline-block;
                    border: 1px solid #ff00ff;
                    margin: 15px 0;
                    font-family: monospace;
                }
                .discount-percentage {
                    font-size: 48px;
                    color: #ff00ff;
                    font-weight: bold;
                }
                .info-box {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    padding: 20px;
                    margin: 20px 0;
                    border-left: 4px solid #ff00ff;
                }
                .button {
                    display: inline-block;
                    background: #ff00ff;
                    color: white;
                    text-decoration: none;
                    padding: 15px 30px;
                    border-radius: 50px;
                    font-weight: bold;
                    margin: 20px 0;
                    transition: all 0.3s;
                }
                .button:hover {
                    background: #ff66ff;
                    transform: scale(1.05);
                }
                .footer {
                    background: #000;
                    padding: 20px;
                    text-align: center;
                    color: #999;
                    font-size: 12px;
                    border-top: 1px solid rgba(255, 0, 255, 0.2);
                }
                .social-links {
                    margin: 15px 0;
                }
                .social-links a {
                    color: #ff00ff;
                    text-decoration: none;
                    margin: 0 10px;
                    font-size: 20px;
                }
                .expiry {
                    color: #ff00ff;
                    font-size: 14px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://tu-dominio.com/Logo (2).png" alt="Makatatuajes" style="max-width: 150px;">
                    <h1>🎉 ¡Bienvenido al Clubd de Descuentos de Makatatuajes!</h1>
                </div>
                
                <div class="content">
                    <h2 style="color: #ff00ff; text-align: center;">Hola ${nombre} ${apellido},</h2>
                    
                    <p style="text-align: center; font-size: 18px;">
                        Gracias por suscribirte a nuestro newsletter. Estamos felices de tenerte en nuestra comunidad.
                    </p>
                    
                    <div class="discount-box">
                        <div class="discount-percentage">10% OFF</div>
                        <p style="font-size: 18px; margin: 10px 0;">en tu próxima sesión de tatuaje</p>
                        
                        <div class="discount-code">${discountCode}</div>
                        
                        <div class="info-box">
                            <p style="margin: 5px 0;"><strong>🎨 ¿Cómo usar tu descuento?</strong></p>
                            <p style="margin: 5px 0; color: #ccc;">Presenta este código al cotizar tu tatuaje, ya sea:</p>
                            <p style="margin: 10px 0;">💻 Mencionándolo en tu consulta online</p>
                            <p style="margin: 5px 0;">🏠 O directamente durante tu cita presencial</p>
                        </div>
                        
                        <p class="expiry">
                            <i class="fas fa-clock"></i> 
                            Válido hasta: ${fechaExpiracion.toLocaleDateString('es-CL')}
                        </p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="https://instagram.com/maka.tatuajes" class="button" target="_blank">
                            <i class="fab fa-instagram"></i> Ver mi trabajo
                        </a>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #ccc;">¿Tienes alguna idea en mente?</p>
                        <p style="color: #ff00ff; font-weight: bold;">¡Conversemos! Estoy aquí para hacer realidad tu próximo tatuaje.</p>
                    </div>
                </div>
                
                <div class="footer">
                    <div class="social-links">
                        <a href="https://instagram.com/maka.tatuajes" target="_blank">📷 Instagram</a>
                        <a href="https://facebook.com/mvjaque" target="_blank">📘 Facebook</a>
                        <a href="https://tiktok.com/@maka.tatuajes0" target="_blank">🎵 TikTok</a>
                    </div>
                    <p>© 2026 Makatatuajes. Todos los derechos reservados.</p>
                    <p>Si no solicitaste este correo, por favor ignóralo.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}
