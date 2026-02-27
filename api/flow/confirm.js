const crypto = require("crypto");

module.exports = async function handler(req, res) {
  console.log("🔔 CONFIRM.JS CALLED ===", req.method);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    // Parse token from form-encoded or JSON body
    let token = '';
    if (req.body) {
      if (typeof req.body === 'object') {
        token = req.body.token || '';
      } else if (typeof req.body === 'string') {
        try {
          token = JSON.parse(req.body).token || '';
        } catch(e) {
          token = new URLSearchParams(req.body).get('token') || '';
        }
      }
    }

    if (!token) {
      console.log("❌ No token in request");
      return res.status(400).send("Token missing");
    }

    console.log("🔔 Flow confirmation received:", token);

    const apiKey = process.env.FLOW_API_KEY;
    const secretKey = process.env.FLOW_SECRET_KEY;
    const baseUrl = "https://www.flow.cl/api";

    const params = new URLSearchParams({ apiKey, token });
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(params.toString())
      .digest("hex");
    params.append("s", signature);

    const flowResponse = await fetch(`${baseUrl}/payment/getStatus?${params.toString()}`);
    const paymentData = await flowResponse.json();
    console.log("📦 Flow status:", paymentData);

    if (paymentData.status !== 2) {
      console.log("❌ Payment not completed, status:", paymentData.status);
      return res.status(200).send("Payment not completed");
    }

    const orderId = paymentData.flowOrder;
    const commerceOrder = paymentData.commerceOrder;
    const customerEmail = paymentData.payer;
    const amount = paymentData.amount;
    console.log("✅ Payment confirmed:", orderId);

    const FROM_EMAIL = "Reservas Makatatuajes <hola@makatatuajes.com>";
    const ADMIN_EMAILS = [
      "macatrabajosdiseno@gmail.com",
      "hola@makatatuajes.com",
      "makatatuajes@outlook.com",
      "junglesoul.c@gmail.com"
    ];

    // Email al cliente
    const clientRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: "✅ Reserva Confirmada - Makatatuajes",
        html: `
          <h2>¡Tu reserva fue confirmada! 🎉</h2>
          <p>Hemos recibido tu pago correctamente.</p>
          <p><strong>N° Orden:</strong> ${commerceOrder}</p>
          <p><strong>Monto:</strong> $${amount}</p>
          <p>Muy pronto me pondré en contacto contigo para coordinar tu sesión.</p>
          <br>
          <p>Gracias por confiar en Makatatuajes 💜</p>
        `
      })
    });
    console.log("📧 Client email status:", clientRes.status);

    // Email al admin
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAILS,
        subject: "💰 Nueva Reserva Pagada - Makatatuajes",
        html: `
          <h2>Nueva reserva confirmada</h2>
          <p><strong>Flow Order:</strong> ${orderId}</p>
          <p><strong>Commerce Order:</strong> ${commerceOrder}</p>
          <p><strong>Email Cliente:</strong> ${customerEmail}</p>
          <p><strong>Monto:</strong> $${amount}</p>
        `
      })
    });
    console.log("📧 Admin email status:", adminRes.status);

    console.log("📧 Emails enviados correctamente");
    return res.status(200).send("OK");

  } catch (error) {
    console.error("🔥 Confirm error:", error);
    return res.status(500).send("Server Error");
  }
};
