// /api/success.js
export default function handler(req, res) {
  // Si es una petición POST de Flow, redirigimos con un 303 See Other
  if (req.method === 'POST') {
    // Puedes acceder a los datos que Flow envía si es necesario: req.body
    console.log("POST recibido de Flow en /api/success", req.body);
    // Redirigir al archivo HTML estático para que el usuario vea la página
    res.redirect(303, '/success.html');
    return;
  }

  // Si es GET (usuario entrando directo), simplemente sirves el HTML estático
  // Aquí podrías servir el archivo directamente o redirigir también
  // Por simplicidad, redirigimos también
  res.redirect(307, '/success.html');
}
