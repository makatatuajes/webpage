// api/create-appointment.js
const { getAccessToken } = require('./auth.js');
const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const formData = req.body;
        
        // Validate required fields
        const required = ['name', 'email', 'phone', 'date', 'timeSlot'];
        for (const field of required) {
            if (!formData[field]) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Missing required field: ${field}` 
                });
            }
        }

        const event = await createCalendarEvent(formData);
        
        res.json({
            success: true,
            eventId: event.id,
            message: 'Appointment created successfully'
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.error?.message || error.message
        });
    }
};

async function createCalendarEvent(formData) {
    const accessToken = await getAccessToken();
    
    const startDateTime = new Date(`${formData.date}T${formData.timeSlot.start}`);
    const endDateTime = new Date(`${formData.date}T${formData.timeSlot.end}`);
    
    const event = {
        subject: `🎨 Tattoo Appointment - ${formData.name}`,
        body: {
            contentType: "HTML",
            content: `
                <h3>Nueva Cita de Tatuaje Confirmada</h3>
                <p><strong>Cliente:</strong> ${formData.name}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Teléfono:</strong> ${formData.phone}</p>
                <p><strong>Abono Seleccionado:</strong> ${formData.deposit}</p>
                <p><strong>Género:</strong> ${formData.gender}</p>
                <p><strong>Comentarios:</strong> ${formData.comments || 'Ninguno'}</p>
                <p><strong>Autorización de fotos:</strong> ${formData.photoAuth ? 'Sí' : 'No'}</p>
                <hr>
                <p><strong>Fecha:</strong> ${formData.date}</p>
                <p><strong>Horario:</strong> ${formData.timeSlot.display}</p>
            `
        },
        start: {
            dateTime: startDateTime.toISOString(),
            timeZone: "America/Santiago"
        },
        end: {
            dateTime: endDateTime.toISOString(),
            timeZone: "America/Santiago"
        },
        location: {
            displayName: "Estudio de Tatuajes Maka"
        },
        attendees: [
            {
                emailAddress: {
                    address: formData.email,
                    name: formData.name
                },
                type: "required"
            }
        ]
    };

    const response = await axios.post(
        `https://graph.microsoft.com/v1.0/users/${process.env.CALENDAR_ID}/calendar/events`,
        event,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );
    
    return response.data;
}
