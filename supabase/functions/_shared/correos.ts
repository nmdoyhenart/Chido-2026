export type CorreoRegistro = {
  id: string;
  correo: string;
  nombres: string;
  estado: 'pendiente' | 'aceptado' | 'rechazado';
  bloqueo: string;
  intentos: number;
};

const escapar = (texto: string) => texto.replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]!));

export function componerCorreo(correo: CorreoRegistro, logo: string) {
  const url = new URL(logo);
  if (url.protocol !== 'https:') throw new Error('LOGO_HTTPS_REQUERIDO');
  const textos = {
    pendiente: { asunto: 'Recibimos tu registro en Chido', titulo: 'Tu registro está en revisión', color: '#c2410c', tamano: 27, mensaje: 'Recibimos tus datos. El dueño o supervisor revisará tu solicitud. Hasta que sea aceptada, no podrás ingresar como cliente registrado.' },
    aceptado: { asunto: '¡Tu registro en Chido fue aceptado!', titulo: '¡Bienvenido a Chido!', color: '#15803d', tamano: 32, mensaje: 'Tu registro fue aceptado. Ya podés ingresar con tu correo y contraseña para disfrutar de Chido.' },
    rechazado: { asunto: 'Novedades sobre tu registro en Chido', titulo: 'Tu solicitud no fue aceptada', color: '#b91c1c', tamano: 25, mensaje: 'Tu registro fue rechazado por el dueño o supervisor. No podrás ingresar con esta cuenta. Si necesitás más información, consultanos en el restaurante.' },
  }[correo.estado];
  if (!textos) throw new Error('ESTADO_INVALIDO');
  return {
    subject: textos.asunto,
    text: `Hola, ${correo.nombres}.\n\n${textos.mensaje}\n\nEl equipo de Chido`,
    html: `<div style="font-family:Arial,sans-serif;background:#ffedd5;padding:28px;color:#7c2d12;max-width:600px;margin:auto"><img src="${escapar(url.href)}" alt="Chido" width="140" style="display:block;margin:auto"/><h1 style="font-family:Georgia,serif;font-size:${textos.tamano}px;color:${textos.color}">${textos.titulo}</h1><p style="font-size:20px">Hola, ${escapar(correo.nombres)}.</p><p style="font-size:18px;line-height:1.6">${textos.mensaje}</p><p style="font-size:16px;font-weight:bold">El equipo de Chido</p></div>`,
  };
}
