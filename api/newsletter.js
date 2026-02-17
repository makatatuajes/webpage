// api/newsletter.js
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Método no permitido. Use POST.' 
        });
    }

    try {
        const { nombre, apellido, telefono, instagram, email } = req.body;

        // Validate required fields
        if (!nombre || !apellido || !telefono || !instagram || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Todos los campos son requeridos' 
            });
        }

        // For now, just return success (we'll add Resend later)
        // This will help us confirm the API is working
        console.log('Newsletter subscription received:', { nombre, apellido, telefono, instagram, email });

        return res.status(200).json({ 
            success: true, 
            message: 'Suscripción recibida correctamente',
            data: { nombre, apellido, email }
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
}
