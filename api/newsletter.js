// api/newsletter.js
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Método no permitido' 
        });
    }

    try {
        const { nombre, apellido, telefono, instagram, email } = req.body;

        console.log('Received newsletter subscription:', { nombre, apellido, telefono, instagram, email });

        // Validate required fields
        if (!nombre || !apellido || !telefono || !instagram || !email) {
            return res.status(400).json({ 
                success: false,
                error: 'Todos los campos son requeridos' 
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                error: 'Email inválido' 
            });
        }

        // Prepare email content
        const emailContent = `
            <h2>📬 Nuevo Suscriptor Newsletter - Makatatuajes</h2>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
            <p><strong>Hora:</strong> ${new Date().toLocaleTimeString('es-CL')}</p>
            <hr>
            <h3>📋 Datos del suscriptor:</h3>
            <ul>
                <li><strong>Nombre:</strong> ${nombre} ${apellido}</li>
                <li><strong>Teléfono:</strong> ${telefono}</li>
                <li><strong>Instagram:</strong> @${instagram}</li>
                <li><strong>Email:</strong> ${email}</li>
            </ul>
            <hr>
            <p style="color: #666; font-size: 12px;">Este suscriptor se ha registrado a través del formulario de newsletter en makatatuajes.cl</p>
        `;

        // Check if Resend API key is configured
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        
        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY no está configurada');
            // For development, log the email instead of sending
            if (process.env.NODE_ENV === 'development') {
                console.log('DEV MODE - Email would be sent:', emailContent);
                return res.status(200).json({ 
                    success: true, 
                    message: 'Suscripción exitosa (modo desarrollo)',
                    data: { mock: true }
                });
            }
            return res.status(500).json({ 
                success: false,
                error: 'Error de configuración del servidor' 
            });
        }

        // Send email via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Makatatuajes <onboarding@resend.dev>', // Use your verified domain or resend default
                to: ['makatatuajes@outlook.com'],
                subject: '🎨 Nuevo suscriptor Newsletter - Makatatuajes',
                html: emailContent,
                replyTo: email
            })
        });

        const result = await response.json();
        console.log('Resend API response:', result);

        if (!response.ok) {
            console.error('Error Resend:', result);
            throw new Error(result.message || 'Error al enviar el email');
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Suscripción exitosa',
            data: result 
        });

    } catch (error) {
        console.error('Error en newsletter API:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Error al procesar la suscripción',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
