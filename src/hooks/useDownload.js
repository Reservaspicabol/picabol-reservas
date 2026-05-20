// Genera y descarga el PDF de confirmación de reserva
// Usa canvas nativo del navegador — sin dependencias externas

export function downloadBookingPDF(success, lang = 'es') {
  const { ref, type, details } = success
  const isES = lang === 'es'

  // Crear canvas
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 520
  const ctx = canvas.getContext('2d')

  // ── Fondo ──
  ctx.fillStyle = '#1a1916'
  ctx.fillRect(0, 0, 800, 520)

  // ── Header verde ──
  ctx.fillStyle = '#3d5a2e'
  ctx.fillRect(0, 0, 800, 120)

  // ── Franja lima ──
  ctx.fillStyle = '#d4e84a'
  ctx.fillRect(0, 118, 800, 4)

  // ── Logo texto ──
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 42px Arial'
  ctx.fillText('PICABOL', 40, 68)

  ctx.fillStyle = '#d4e84a'
  ctx.font = '14px Arial'
  ctx.fillText('CANCÚN · PICKLEBALL', 40, 90)

  // ── Checkmark ──
  ctx.fillStyle = '#d4e84a'
  ctx.beginPath()
  ctx.arc(720, 60, 38, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3d5a2e'
  ctx.font = 'bold 36px Arial'
  ctx.fillText('✓', 703, 73)

  // ── Título ──
  ctx.fillStyle = '#d4e84a'
  ctx.font = 'bold 28px Arial'
  ctx.fillText(isES ? '¡RESERVA CONFIRMADA!' : 'BOOKING CONFIRMED!', 40, 165)

  // ── Referencia ──
  ctx.fillStyle = '#7a7870'
  ctx.font = '13px Arial'
  ctx.fillText(isES ? 'Referencia:' : 'Reference:', 40, 192)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 13px Arial'
  ctx.fillText(ref, 130, 192)

  // ── Tipo de reserva badge ──
  ctx.fillStyle = type === 'cancha' ? '#3d5a2e' : '#0d1e35'
  roundRect(ctx, 40, 205, type === 'cancha' ? 160 : 120, 28, 6)
  ctx.fill()
  ctx.fillStyle = type === 'cancha' ? '#d4e84a' : '#7eb8f7'
  ctx.font = 'bold 12px Arial'
  ctx.fillText(
    type === 'cancha'
      ? (isES ? 'CANCHA PRIVADA' : 'PRIVATE COURT')
      : 'OPEN PLAY',
    52, 224
  )

  // ── Línea divisoria ──
  ctx.strokeStyle = '#2a2a22'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, 248)
  ctx.lineTo(760, 248)
  ctx.stroke()

  // ── Datos del cliente ──
  const rows = [
    [isES ? 'Titular' : 'Name', details.name],
    [isES ? 'Celular' : 'Phone', details.phone],
    [isES ? 'Correo' : 'Email', details.email],
    ...(type === 'cancha' ? [
      [isES ? 'Cancha' : 'Court', details.court],
      [isES ? 'Fecha' : 'Date', details.date],
      [isES ? 'Hora' : 'Time', details.time],
      [isES ? 'Duración' : 'Duration', `${details.duration} min`],
      [isES ? 'Total' : 'Total', `$${details.price} MXN`],
      [isES ? 'Anticipo pagado' : 'Deposit paid', '$50 MXN'],
      [isES ? 'Saldo al llegar' : 'Balance on arrival', `$${details.price - 50} MXN`],
    ] : [
      [isES ? 'Sala' : 'Room', details.roomName],
      [isES ? 'Fecha' : 'Date', details.date],
      [isES ? 'Hora' : 'Time', details.time],
      [isES ? 'Precio por persona' : 'Price per person', `$${details.price} MXN`],
      [isES ? 'Anticipo pagado' : 'Deposit paid', '$50 MXN'],
      [isES ? 'Saldo al llegar' : 'Balance on arrival', `$${details.price - 50} MXN`],
    ])
  ]

  let y = 270
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)'
      ctx.fillRect(40, y - 14, 720, 26)
    }
    ctx.fillStyle = '#7a7870'
    ctx.font = '12px Arial'
    ctx.fillText(label, 52, y + 4)
    ctx.fillStyle = label === (isES ? 'Total' : 'Total') || label === (isES ? 'Anticipo pagado' : 'Deposit paid') ? '#d4e84a' : '#ffffff'
    ctx.font = label === (isES ? 'Total' : 'Total') ? 'bold 13px Arial' : '13px Arial'
    ctx.fillText(value || '—', 300, y + 4)
    y += 26
  })

  // ── Nota de tolerancia ──
  ctx.fillStyle = 'rgba(212,232,74,0.1)'
  roundRect(ctx, 40, y + 8, 720, 36, 8)
  ctx.fill()
  ctx.fillStyle = '#d4e84a'
  ctx.font = '12px Arial'
  ctx.fillText(
    isES
      ? '🔒  Tienes 10 minutos de tolerancia para llegar a tu hora reservada'
      : '🔒  You have 10 minutes of grace period from your booking time',
    56, y + 31
  )

  // ── Footer ──
  ctx.fillStyle = '#3a3a32'
  ctx.fillRect(0, 480, 800, 40)
  ctx.fillStyle = '#7a7870'
  ctx.font = '11px Arial'
  ctx.fillText('picabolmx.com  |  Los Olivos S/N, Cancún Q.R.  |  834 477 5287', 40, 504)
  ctx.fillText(new Date().toLocaleDateString(isES ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 620, 504)

  // ── Descargar como PNG (más compatible que PDF en móvil) ──
  const link = document.createElement('a')
  link.download = `PICABOL-${ref}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// Helper para rectángulos con esquinas redondeadas
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
