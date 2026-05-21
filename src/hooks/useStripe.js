// Inicia el checkout de Stripe — redirige a la página de pago
export async function initiateStripeCheckout({ type, bookingData }) {
  const response = await fetch('/.netlify/functions/stripe-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, bookingData, origin: window.location.origin }),
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error)

  // Guardar en sessionStorage por si el usuario vuelve
  sessionStorage.setItem('pending_booking', JSON.stringify({ type, bookingData }))
  window.location.href = data.url
}

// Detecta si el usuario regresó de Stripe exitosamente
export function checkStripeReturn() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('stripe_success') === '1') {
    const type = params.get('type')
    const dataStr = params.get('data')
    if (type && dataStr) {
      try {
        const bookingData = JSON.parse(decodeURIComponent(dataStr))
        window.history.replaceState({}, '', '/')
        return { type, bookingData }
      } catch { return null }
    }
  }
  return null
}

// Detecta si el usuario canceló el pago
export function checkStripeCancelled() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('stripe_cancelled') === '1') {
    window.history.replaceState({}, '', '/')
    return true
  }
  return false
}
