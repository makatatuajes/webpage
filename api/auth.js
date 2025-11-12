// api/auth.js
const axios = require('axios');

async function getAccessToken() {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', process.env.OUTLOOK_CLIENT_ID);
    params.append('client_secret', process.env.OUTLOOK_CLIENT_SECRET);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    const response = await axios.post(tokenUrl, params);
    return response.data.access_token;
}

module.exports = { getAccessToken };
