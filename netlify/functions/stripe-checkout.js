const Stripe = require('stripe')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const { type, bookingData, origin } = JSON.parse(event.body)

    const descriptions = {
      cancha: `Anticipo Cancha · ${bookingData.date} ${bookingData.time} · ${bookingData.duration}min`,
      open_create: `Anticipo Open Play · Sala "${bookingData.roomName}" · ${bookingData.date} ${bookingData.time}`,
      open_join: `Anticipo Open Play · Sala "${bookingData.roomName}" · ${bookingData.date} ${bookingData.time}`,
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: {
            name: 'PICABOL — Anticipo de reserva',
            description: descriptions[type] || 'Anticipo garantía $50 MXN',
          },
          unit_amount: 5000, // $50 MXN en centavos
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/?stripe_success=1&type=${type}&data=${encodeURIComponent(JSON.stringify(bookingData))}`,
      cancel_url: `${origin}/?stripe_cancelled=1`,
      metadata: { type, booking_data: JSON.stringify(bookingData) },
      locale: 'es',
    })

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) }
  } catch (err) {
    console.error('Stripe error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
