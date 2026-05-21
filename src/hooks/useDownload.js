export function downloadBookingPDF(success, lang = 'es') {
  const { ref, type, details } = success
  const isES = lang === 'es'

  const W = 800, H = 600
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#f8f7f4'
  ctx.fillRect(0, 0, W, H)

  // Header
  ctx.fillStyle = '#3d5a2e'
  ctx.fillRect(0, 0, W, 90)

  // Lime accent
  ctx.fillStyle = '#d4e84a'
  ctx.fillRect(0, 88, W, 4)

  // Logo
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 36px Arial'
  ctx.fillText('PICABOL', 36, 52)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '13px Arial'
  ctx.fillText('CANCÚN · PICKLEBALL', 36, 72)

  // Check circle
  ctx.fillStyle = '#d4e84a'
  ctx.beginPath(); ctx.arc(740, 45, 32, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = '#3d5a2e'
  ctx.font = 'bold 28px Arial'
  ctx.fillText('✓', 725, 55)

  // Title
  ctx.fillStyle = '#1a1916'
  ctx.font = 'bold 24px Arial'
  ctx.fillText(isES ? '¡Reserva Confirmada!' : 'Booking Confirmed!', 36, 130)

  // Ref + badge
  ctx.fillStyle = '#7a7870'
  ctx.font = '12px Arial'
  ctx.fillText(isES ? 'Referencia:' : 'Reference:', 36, 152)
  ctx.fillStyle = '#1a1916'
  ctx.font = 'bold 12px Arial'
  ctx.fillText(ref, 120, 152)

  // Badge
  const badgeColor = type === 'cancha' ? '#3d5a2e' : '#0d3060'
  const badgeTxt = type === 'cancha' ? (isES?'CANCHA PRIVADA':'PRIVATE COURT') : 'OPEN PLAY'
  ctx.fillStyle = badgeColor
  rRect(ctx, 36, 162, ctx.measureText(badgeTxt).width + 20, 22, 5); ctx.fill()
  ctx.fillStyle = '#d4e84a'
  ctx.font = 'bold 11px Arial'
  ctx.fillText(badgeTxt, 46, 177)

  // Divider
  ctx.strokeStyle = '#e0dfd8'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(36, 196); ctx.lineTo(764, 196); ctx.stroke()

  // Data rows
  const rows = type === 'cancha' ? [
    [isES?'Titular':'Name',       details.name],
    [isES?'Celular':'Phone',      details.phone],
    [isES?'Correo':'Email',       details.email],
    [isES?'Cancha':'Court',       details.court],
    [isES?'Fecha':'Date',         details.date],
    [isES?'Hora':'Time',          details.time],
    [isES?'Duración':'Duration',  `${details.duration} min`],
    [isES?'Total':'Total',        `$${details.price} MXN`],
    [isES?'Anticipo pagado':'Deposit paid', '$50 MXN'],
    [isES?'Saldo al llegar':'Balance on arrival', `$${details.price - 50} MXN`],
  ] : [
    [isES?'Titular':'Name',       details.name],
    [isES?'Celular':'Phone',      details.phone],
    [isES?'Correo':'Email',       details.email],
    [isES?'Sala':'Room',          details.roomName],
    details.court ? [isES?'Cancha':'Court', details.court] : null,
    [isES?'Fecha':'Date',         details.date],
    [isES?'Hora':'Time',          details.time],
    [isES?'Precio/persona':'Price/person', `$${details.price} MXN`],
    [isES?'Anticipo pagado':'Deposit paid', '$50 MXN'],
    [isES?'Saldo al llegar':'Balance on arrival', `$${details.price - 50} MXN`],
  ].filter(Boolean)

  let y = 210
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      ctx.fillStyle = '#f0efe8'
      ctx.fillRect(36, y-2, 728, 24)
    }
    ctx.fillStyle = '#7a7870'; ctx.font = '12px Arial'
    ctx.fillText(label, 48, y+14)
    const isHighlight = label.includes('Total') || label.includes('Anticipo') || label.includes('Deposit') || label.includes('Saldo') || label.includes('Balance')
    ctx.fillStyle = isHighlight ? '#3d5a2e' : '#1a1916'
    ctx.font = isHighlight ? 'bold 12px Arial' : '12px Arial'
    ctx.fillText(value || '—', 300, y+14)
    y += 24
  })

  // Tolerance note
  y += 8
  ctx.fillStyle = '#eef4e0'
  rRect(ctx, 36, y, 728, 34, 7); ctx.fill()
  ctx.strokeStyle = '#c8dc60'; ctx.lineWidth = 1
  rRect(ctx, 36, y, 728, 34, 7); ctx.stroke()
  ctx.fillStyle = '#3d5a2e'; ctx.font = '12px Arial'
  ctx.fillText(
    isES ? '⏱  Tienes 10 minutos de tolerancia a partir de tu hora de reserva'
         : '⏱  You have 10 minutes of grace period from your booking time',
    52, y+21
  )

  // Footer
  ctx.fillStyle = '#e8e7e0'
  ctx.fillRect(0, H-42, W, 42)
  ctx.strokeStyle = '#d0cfc8'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, H-42); ctx.lineTo(W, H-42); ctx.stroke()
  ctx.fillStyle = '#7a7870'; ctx.font = '11px Arial'
  ctx.fillText('picabolmx.com  ·  Los Olivos S/N, Cancún Q.R.  ·  834 477 5287', 36, H-18)
  const dateStr = new Date().toLocaleDateString(isES?'es-MX':'en-US',{year:'numeric',month:'long',day:'numeric'})
  const dw = ctx.measureText(dateStr).width
  ctx.fillText(dateStr, W-36-dw, H-18)

  // Download
  const link = document.createElement('a')
  link.download = `PICABOL-${ref}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function rRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y)
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r)
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h)
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r)
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}
