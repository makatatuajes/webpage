// api/available-slots.js
const { getAccessToken } = require('./auth.js');
const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        const slots = await getAvailableTimeSlots(date);
        res.json({ success: true, slots });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

async function getAvailableTimeSlots(date) {
    const accessToken = await getAccessToken();
    
    const startDateTime = new Date(date + 'T00:00:00');
    const endDateTime = new Date(date + 'T23:59:59');
    
    const response = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${process.env.CALENDAR_ID}/calendar/events`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                startDateTime: startDateTime.toISOString(),
                endDateTime: endDateTime.toISOString(),
                $select: 'start,end,subject'
            }
        }
    );
    
    const busySlots = response.data.value;
    return generateAvailableSlots(startDateTime, busySlots);
}

function generateAvailableSlots(date, busySlots) {
    const availableSlots = [];
    const workStart = 10;
    const workEnd = 18;
    const slotDuration = 2;
    
    const busyTimes = busySlots.map(event => ({
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime)
    }));
    
    for (let hour = workStart; hour <= workEnd - slotDuration; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(date);
        slotEnd.setHours(hour + slotDuration, 0, 0, 0);
        
        const isAvailable = !busyTimes.some(busy => 
            (slotStart >= busy.start && slotStart < busy.end) ||
            (slotEnd > busy.start && slotEnd <= busy.end) ||
            (slotStart <= busy.start && slotEnd >= busy.end)
        );
        
        if (isAvailable) {
            availableSlots.push({
                start: `${hour.toString().padStart(2, '0')}:00`,
                end: `${(hour + slotDuration).toString().padStart(2, '0')}:00`,
                display: `${hour}:00 - ${hour + slotDuration}:00`
            });
        }
    }
    
    return availableSlots;
}
