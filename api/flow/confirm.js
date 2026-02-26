import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).send("Token missing");
    }

    console.log("🔔 Flow confirmation received:", token);

    const apiKey = process.env.FLOW_API_KEY;
    const secretKey = process.env.FLOW_SECRET_KEY;
    const baseUrl = "https://www.flow.cl/api"; // Producción

    // ==============================
    // 1️⃣ Consultar estado real en Flow
    // ==============================

    const params = new URLSearchParams({
      apiKey,
      token
    });

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(params.toString())
      .digest("hex");

    params.append("s", signature);

    const flowResponse = await fetch(
      `${baseUrl}/payment/getStatus?${params.toString()}`
    );

    const paymentData = await flowResponse.json();

    console.log("📦 Flow status:", paymentData);

    if (paymentData.status !== 2) {
      console.log("❌ Payment not completed");
      return res.status(200).send("Payment not completed");
    }

    const orderId = paymentData.flowOrder;
    const commerceOrder = paymentData.commerceOrder;
    const customerEmail = paymentData.payer;
    const amount = paymentData.amount;

    console.log("✅ Payment confirmed:", orderId);

    // ==============================
    // 2️⃣ Configuración dominio real
    // ==============================

    const FROM_EMAIL = "Reservas Makatatuajes <hola@makatatuajes.com>";

    const ADMIN_EMAILS = [
      "macatrabajosdiseno@gmail.com",
      "hola@makatatuajes.com",
      "makatatuajes@outlook.com",
      "junglesoul.c@gmail.com"
    ];

    // ==============================
    // 3️⃣ Email al CLIENTE
    // ==============================

    await fetch("https://api.resend.com/emails", {
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

    // ==============================
    // 4️⃣ Email al ADMIN
    // ==============================

    await fetch("https://api.resend.com/emails", {
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

    console.log("📧 Emails enviados correctamente");

    return res.status(200).send("OK");

  } catch (error) {
    console.error("🔥 Confirm error:", error);
    return res.status(500).send("Server Error");
  }
}
