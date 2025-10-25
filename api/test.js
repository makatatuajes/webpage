// Simple test API to verify Vercel functions are working
module.exports = async (req, res) => {
  console.log('=== TEST API CALLED ===');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('Test received:', body);
    
    return res.status(200).json({
      success: true,
      message: '✅ API is working!',
      test: true,
      received: body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
