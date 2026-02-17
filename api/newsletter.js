// api/newsletter.js
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST,PUT,DELETE');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { nombre, apellido, telefono, instagram, email } = req.body;

        // Validate required fields
        if (!nombre || !apellido || !telefono || !instagram || !email) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        // Prepare email content
        const emailContent = `
            <h2>Nuevo Suscriptor Newsletter - Makatatuajes</h2>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
            <hr>
            <h3>Datos del suscriptor:</h3>
            <ul>
                <li><strong>Nombre:</strong> ${nombre}</li>
                <li><strong>Apellido:</strong> ${apellido}</li>
                <li><strong>Teléfono:</strong> ${telefono}</li>
                <li><strong>Instagram:</strong> ${instagram}</li>
                <li><strong>Email:</strong> ${email}</li>
            </ul>
        `;

        // Send email via Resend
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        
        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY no está configurada');
            return res.status(500).json({ error: 'Error de configuración del servidor' });
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Makatatuajes <newsletter@makatatuajes.com>',
                to: ['makatatuajes@outlook.com'],
                subject: '🎨 Nuevo suscriptor Newsletter - Makatatuajes',
                html: emailContent
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Error Resend:', result);
            throw new Error(result.message || 'Error al enviar el email');
        }

        // Here you could also save to a database or file if needed
        // For now, we'll just return success

        return res.status(200).json({ 
            success: true, 
            message: 'Suscripción exitosa',
            data: result 
        });

    } catch (error) {
        console.error('Error en newsletter API:', error);
        return res.status(500).json({ 
            error: 'Error al procesar la suscripción',
            details: error.message 
        });
    }
}
