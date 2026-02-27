module.exports = async function handler(req, res) {
  console.log('=== SUCCESS.JS CALLED ===', req.method);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let token = '';

  if (req.body) {
    if (typeof req.body === 'object' && req.body.token) {
      token = req.body.token;
    } else if (typeof req.body === 'string') {
      try {
        token = new URLSearchParams(req.body).get('token') || '';
      } catch(e) {}
    }
  }

  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  console.log('=== SUCCESS.JS TOKEN:', token || 'none');

  const html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Pago Exitoso - Makatatuajes</title><style>:root{--bg-primary:#000;--bg-secondary:#111;--text-primary:#fff;--text-secondary:#ccc;--accent:#ff00ff;--accent-hover:#ff66ff}body{font-family:Segoe UI,sans-serif;background-color:var(--bg-primary);color:var(--text-primary);margin:0;padding:0;min-height:100vh;display:flex;justify-content:center;align-items:center}.success-container{text-align:center;padding:2rem;max-width:600px}.success-icon{font-size:5rem;color:#0f0;margin-bottom:2rem}h1{color:var(--accent);margin-bottom:1.5rem}.message-box{background:var(--bg-secondary);padding:2rem;border-radius:10px;margin:2rem 0;border:1px solid rgba(255,0,255,.2)}.btn{display:inline-block;padding:1rem 2rem;background-color:var(--accent);color:var(--text-primary);text-decoration:none;border-radius:30px;font-weight:700;transition:all .3s ease;border:none;cursor:pointer;margin:.5rem}.footer{margin-top:2rem;color:var(--text-secondary)}</style></head><body><div class="success-container"><div class="success-icon">✓</div><h1>¡Pago Exitoso!</h1><div class="message-box"><p style="font-size:1.2rem;margin-bottom:1rem">Tu reserva ha sido confirmada</p><p style="color:var(--text-secondary)">Hemos enviado un correo con los detalles de tu reserva.<br>Pronto me pondré en contacto contigo para coordinar tu cita.</p></div><a href="/" class="btn">Volver al Inicio</a><div class="footer"><p>Makatatuajes - Arte en piel con estilo urbano</p></div></div></body></html>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};
