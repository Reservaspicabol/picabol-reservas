import { useState, useCallback } from 'react'
import { supabase, COURTS, PRICES, OPEN_PLAY_PRICE, DEPOSIT } from '../lib/supabase'

const SYSTEM_PROMPT = `Eres PIKA, el asistente inteligente de PICABOL — canchas de pickleball en Cancún, México.

CONOCIMIENTO DEL SISTEMA:
- 4 canchas: Cancha 1, Cancha 2, Cancha 3, Cancha 4
- Horario: 8:00 AM a 10:00 PM todos los días
- Cancha privada: 60 min=$400, 90 min=$600, 2 hrs=$750, 2.5 hrs=$950 MXN
- Open Play: $200 MXN por persona, 3 horas
- Depósito garantía: $50 MXN (no reembolsable)
- Tolerancia: 10 minutos después de la hora reservada
- Cancelación: hasta 2 horas antes sin penalización adicional
- Ubicación: Cancún, Quintana Roo, México
- Contacto: reservaspicabol@gmail.com

CAPACIDADES:
- Puedes consultar disponibilidad en CUALQUIER fecha (no solo los próximos 3 días)
- Puedes hacer reservas de cancha privada por el usuario
- Puedes hacer modificaciones a reservas existentes (cambio de sala, cancha, horario)
- Si el usuario quiere reservar, pídele: nombre, celular, correo, fecha, hora, cancha y duración
- Si quiere modificar, pídele su número de referencia (PBL-XXXXXX)

REGLAS:
- Responde siempre en el idioma del usuario (español o inglés)
- Sé amigable, entusiasta y breve
- Cuando confirmes una acción, indica claramente qué hiciste
- Si no puedes hacer algo técnicamente en este momento, explica cómo pueden hacerlo en el formulario
- Las reservas del sitio web quedan marcadas como "SITIO WEB PUBLICO" en el sistema admin
- Solo PIKA puede hacer modificaciones a reservas ya hechas

FORMATO: Respuestas cortas y claras. Usa emojis con moderación. 🎾`

export function usePika() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const sendMessage = useCallback(async (userText, contextData = {}) => {
    const userMsg = { role: 'user', content: userText }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Construir contexto de disponibilidad si se proporciona
      let contextNote = ''
      if (contextData.date && contextData.court !== undefined) {
        contextNote = `\n\n[CONTEXTO ACTUAL: El usuario está viendo ${contextData.date}, ${COURTS[contextData.court]}]`
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: SYSTEM_PROMPT + contextNote,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await response.json()
      const assistantText = data.content?.[0]?.text || 'Lo siento, no pude procesar tu mensaje.'

      const assistantMsg = { role: 'assistant', content: assistantText }
      setMessages(prev => [...prev, assistantMsg])
      return assistantText
    } catch (err) {
      const errMsg = { role: 'assistant', content: 'Hubo un error de conexión. Intenta de nuevo. 🔄' }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }, [messages])

  const reset = useCallback(() => setMessages([]), [])

  return { messages, loading, sendMessage, reset }
}
