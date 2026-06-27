import { useState, useCallback } from 'react'
import {
  supabase, COURTS, PRICES, OPEN_PLAY_PRICE,
  getOccupiedSlots, getOpenPlayRooms,
  createPublicBooking, createOpenPlayRoom,
  getReservationBlocks, describeOperatingHours, getLastWebBooking, checkPromoCode
} from '../lib/supabase'

const TOOLS = [
  {
    name: 'check_availability',
    description: 'Consulta disponibilidad de canchas para una fecha y cancha específica.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        court_index: { type: 'number', description: '0=Cancha1, 1=Cancha2, 2=Cancha3, 3=Cancha4' }
      },
      required: ['date', 'court_index']
    }
  },
  {
    name: 'get_open_play_rooms',
    description: 'Obtiene las salas de Open Play activas para una fecha.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' }
      },
      required: ['date']
    }
  },
  {
    name: 'create_court_booking',
    description: 'Crea una reserva de cancha privada. Si el usuario pidio una cancha especifica y esta disponible, incluyela. Si no especifico, omite el campo y el sistema asigna automaticamente.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        hour: { type: 'number' },
        start_minute: { type: 'number', description: '0 o 30' },
        preferred_court: { type: 'number', description: 'Numero de cancha preferida (1-4), solo si el usuario la pidio y esta disponible' },
        duration: { type: 'number', description: '60, 90, 120 o 150 minutos' },
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' }
      },
      required: ['date', 'hour', 'start_minute', 'duration', 'name', 'phone', 'email']
    }
  },
  {
    name: 'create_open_play_room',
    description: 'Crea una sala de Open Play.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        hour: { type: 'number' },
        room_name: { type: 'string' },
        host_name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        members: { type: 'array', items: { type: 'string' } },
        promo_code: { type: 'string', description: 'Codigo de promocion, SOLO si el usuario lo menciona espontaneamente. No preguntes por esto.' }
      },
      required: ['date', 'hour', 'room_name', 'host_name', 'phone', 'email']
    }
  },
  {
    name: 'find_booking',
    description: 'Busca una reserva existente por nombre para modificarla.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del titular' }
      },
      required: ['name']
    }
  },
  {
    name: 'get_last_booking',
    description: 'Obtiene la ultima reserva registrada a traves del sitio web (de cualquier fecha, pasada o futura). Usalo SOLO cuando te pregunten directamente cual fue la ultima reserva o si se ha registrado algo recientemente.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'modify_booking',
    description: 'Modifica una reserva existente. Solo PICA puede hacer esto.',
    input_schema: {
      type: 'object',
      properties: {
        booking_id: { type: 'string' },
        new_hour: { type: 'number' },
        new_court: { type: 'string' },
        new_date: { type: 'string' }
      },
      required: ['booking_id']
    }
  }
]

async function executeTool(toolName, toolInput) {
  try {
    switch (toolName) {
      case 'check_availability': {
        const occupied = await getOccupiedSlots(toolInput.court_index, toolInput.date)
        const blocks = getReservationBlocks(toolInput.date)
        const available = []
        const taken = []
        for (const b of blocks) {
          for (let mins = b.startMin; mins < b.endMin; mins += 30) {
            const h = Math.floor(mins / 60)
            const m = mins % 60
            const key = `${h}:${m === 0 ? '00' : '30'}`
            occupied.has(key) ? taken.push(key) : available.push(key)
          }
        }
        return {
          court: COURTS[toolInput.court_index], date: toolInput.date,
          operating_hours: describeOperatingHours(toolInput.date),
          available_slots: available, occupied_slots: taken
        }
      }
      case 'get_open_play_rooms': {
        const rooms = await getOpenPlayRooms(toolInput.date)
        return {
          date: toolInput.date,
          rooms: rooms.map(r => {
            const salaMatch = (r.notes || '').match(/Sala: ([^|]+)/)
            const membersMatch = (r.notes || '').match(/Miembros: ([^|]+)/)
            return {
              id: r.id, room_name: salaMatch ? salaMatch[1].trim() : `Open Play ${r.court}`,
              host: r.name, hour: r.hour, court: r.court, total_players: r.people || 1,
              members: [r.name, ...(membersMatch ? membersMatch[1].split(',').map(m => m.trim()) : [])]
            }
          }),
          total: rooms.length
        }
      }
      case 'create_court_booking': {
        const prices = { 60: 400, 90: 600, 120: 750, 150: 950 }
        const totalPrice = prices[toolInput.duration] || 400
        const bookingData = {
          date: toolInput.date, hour: toolInput.hour,
          startMinute: toolInput.start_minute || 0,
          duration: toolInput.duration, name: toolInput.name,
          phone: toolInput.phone, email: toolInput.email,
          time: `${String(toolInput.hour).padStart(2,'0')}:${String(toolInput.start_minute||0).padStart(2,'0')}`,
          preferredCourt: toolInput.preferred_court || null,
        }
        try {
          const resp = await fetch('/api/stripe-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'cancha', bookingData, origin: window.location.origin }),
          })
          const data = await resp.json()
          if (data.url) {
            sessionStorage.setItem('pending_booking', JSON.stringify({ type: 'cancha', bookingData }))
            window.location.href = data.url
            return { success: true, redirecting: true }
          }
        } catch(e) { /* ignore */ }
        return { success: false, error: 'Error al iniciar pago', total_price_mxn: totalPrice }
      }
      case 'create_open_play_room': {
        // Si el usuario mencionó un codigo de promocion, validarlo y crear directo sin Stripe
        if (toolInput.promo_code && toolInput.promo_code.trim()) {
          const isValid = await checkPromoCode(toolInput.promo_code)
          if (isValid) {
            const result = await createOpenPlayRoom({
              date: toolInput.date, hour: toolInput.hour,
              roomName: toolInput.room_name, hostName: toolInput.host_name,
              phone: toolInput.phone, email: toolInput.email,
              members: toolInput.members || [],
              promoApplied: true,
            })
            return { success: true, promo_applied: true, room_id: result.id, court: result.courtName, message: 'Sala creada sin anticipo (codigo de promocion aplicado)' }
          }
          return { success: false, error: 'Codigo de promocion invalido' }
        }
        const bookingData = {
          date: toolInput.date, hour: toolInput.hour,
          roomName: toolInput.room_name, hostName: toolInput.host_name,
          phone: toolInput.phone, email: toolInput.email,
          members: toolInput.members || [],
          time: `${String(toolInput.hour).padStart(2,'0')}:00`,
        }
        try {
          const resp = await fetch('/api/stripe-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'open_create', bookingData, origin: window.location.origin }),
          })
          const data = await resp.json()
          if (data.url) {
            sessionStorage.setItem('pending_booking', JSON.stringify({ type: 'open_create', bookingData }))
            window.location.href = data.url
            return { success: true, redirecting: true }
          }
        } catch(e) { /* ignore */ }
        return { success: false, error: 'Error al iniciar pago' }
      }
      case 'find_booking': {
        const { data } = await supabase
          .from('bookings').select('id, date, hour, court, modality, name, notes, status, duration')
          .ilike('name', `%${toolInput.name}%`).in('status', ['reserved', 'playing'])
          .order('date', { ascending: false }).limit(5)
        return { found: (data||[]).length, bookings: data || [] }
      }
      case 'get_last_booking': {
        return await getLastWebBooking()
      }
      case 'modify_booking': {
        const updates = {}
        if (toolInput.new_hour !== undefined) updates.hour = parseInt(toolInput.new_hour)
        if (toolInput.new_court) {
          // Convert "Cancha 2" or "2" to number
          const courtNum = typeof toolInput.new_court === 'number'
            ? toolInput.new_court
            : parseInt(String(toolInput.new_court).replace(/\D/g, '')) || 1
          updates.court = courtNum
        }
        if (toolInput.new_date) updates.date = toolInput.new_date
        if (Object.keys(updates).length === 0) return { error: 'No se especificaron cambios' }
        const { error } = await supabase.from('bookings').update(updates).eq('id', toolInput.booking_id)
        if (error) throw error
        return { success: true, booking_id: toolInput.booking_id, changes: updates }
      }
      default: return { error: `Tool ${toolName} not found` }
    }
  } catch (err) {
    return { error: err.message || 'Error al ejecutar herramienta' }
  }
}

function buildSystemPrompt() {
  const now = new Date()
  const fmt = (d) => d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const ymd = (d) => d.toISOString().slice(0, 10)
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(now); dayAfter.setDate(dayAfter.getDate() + 2)

  return `Eres PICA, la asistente inteligente de PICABOL en Cancun, Mexico.

FECHA Y HORA ACTUAL: ${fmt(now)} — formato YYYY-MM-DD: ${ymd(now)}
AÑO ACTUAL: ${now.getFullYear()}

REFERENCIA DE FECHAS (usa esto para no confundir el dia de la semana con la fecha):
- HOY = ${ymd(now)} (${fmt(now)})
- MAÑANA = ${ymd(tomorrow)} (${fmt(tomorrow)})
- PASADO MAÑANA = ${ymd(dayAfter)} (${fmt(dayAfter)})

REGLA CRITICA DE FECHAS:
- SIEMPRE verifica que el dia de la semana corresponda exactamente a la fecha YYYY-MM-DD antes de usarla en cualquier herramienta.
- Si el usuario dice "el viernes" o "el sabado que viene", calcula la fecha exacta usando HOY como referencia — NUNCA asumas o inventes una fecha.
- Todas las reservas deben ser en el año ${now.getFullYear()} o posterior. NUNCA uses años pasados.
- Si tienes cualquier duda sobre que fecha corresponde a que dia, usa check_availability con la fecha calculada para confirmar antes de reservar.

UBICACION:
- Direccion: Los Olivos S/N, 77560 Cancun, Q.R., Mexico
- Link Google Maps: https://maps.google.com/?q=Los+Olivos+S/N+Cancun+Quintana+Roo+Mexico+77560+Picabol
- Telefono: 834 477 5287
- Sitio web: picabolmx.com

HORARIOS DE OPERACION (para reservar):
- Lunes a Viernes: 7:00 AM - 10:00 AM y 4:00 PM - 10:00 PM (DOS bloques, cerrado de 10am a 4pm)
- Sabado: 7:00 AM - 1:00 PM (ultima reserva posible: 12:00pm por 1 hora)
- Domingo: CERRADO todo el dia — no se puede reservar nada

PRECIOS (precio total — el anticipo de $50 MXN esta INCLUIDO en el precio total):
- Cancha privada 60min: $400 MXN total ($50 anticipo online + $350 al llegar)
- Cancha privada 90min: $600 MXN total ($50 anticipo online + $550 al llegar)
- Cancha privada 2hrs: $750 MXN total ($50 anticipo online + $700 al llegar)
- Cancha privada 2.5hrs: $950 MXN total ($50 anticipo online + $900 al llegar)
- Open Play: $200 MXN por persona total ($50 anticipo online + $150 al llegar)
- Tolerancia: 10 min despues de la hora reservada
- Cancelacion: hasta 2 horas antes sin penalizacion adicional

HORARIOS PARA RESERVAR (reglas por dia, ultimos horarios posibles):
- Lunes a Viernes, bloque mañana (7am-10am): cancha privada puede iniciar hasta las 9:00am (1h, termina 10am). NO hay Open Play en este bloque salvo que inicie exactamente a las 7am (3h, termina 10am).
- Lunes a Viernes, bloque tarde (4pm-10pm): cancha privada puede iniciar hasta las 9:00pm pero SOLO por 1 hora (cierra 10pm). Open Play puede iniciar entre 4pm y 7pm (3h continuas, termina max 10pm).
- Sabado (7am-1pm): cancha privada puede iniciar hasta las 12:00pm (1h, termina 1pm). Open Play NO cabe (requiere 3h y solo hay 6h totales validas desde 7am hasta 1pm — si cabe exactamente de 7am a 10am puede ofrecerse, valida con check_availability).
- Domingo: NUNCA ofrezcas ni reserves nada, esta cerrado.
- SIEMPRE usa check_availability para confirmar que un horario es valido antes de ofrecerlo — la herramienta ya conoce los bloques reales de cada dia.
- Si el sistema (create_court_booking o create_open_play_room) responde con un error de "fuera de operacion", informa al usuario el horario disponible que te indique el error y ofrece alternativas dentro de esos bloques.

IMPORTANTE AL INFORMAR PRECIOS:
- SIEMPRE di el precio total primero, luego el desglose
- Ejemplo correcto: "Son $450 MXN en total — $50 de anticipo online y $400 al llegar"
- NUNCA digas "$450 + $50" porque el $50 ya esta incluido en el total

CANCHAS: Cancha 1, Cancha 2, Cancha 3, Cancha 4
Si el usuario pide una cancha especifica, verifica disponibilidad con check_availability primero.
Si esta libre, incluye preferred_court en create_court_booking.
Si no esta libre, sugiere otra cancha disponible o diferente horario.

CAPACIDADES - usa las herramientas disponibles:
1. check_availability: consulta slots libres en cualquier fecha y cancha (respeta horarios reales de operacion)
2. get_open_play_rooms: ve salas activas de open play
3. create_court_booking: reserva cancha (confirma datos primero)
4. create_open_play_room: crea sala open play
5. find_booking: busca reserva existente por nombre
6. modify_booking: modifica reserva (solo PICA puede)
7. get_last_booking: consulta la ultima reserva registrada via sitio web (cualquier fecha)

FLUJO RESERVA:
1. Pregunta fecha, hora preferida, cancha y duracion
2. Verifica disponibilidad con check_availability (esto tambien confirma que el dia/fecha y horario sean validos)
3. Si disponible, pide nombre completo, celular y correo
4. Resume: "Voy a reservar [Cancha X] el [fecha] a las [hora] por [duracion]. Total: $[precio] MXN ($50 anticipo + $[resto] al llegar). Tu nombre: [nombre]. ¿Confirmas?"
5. Solo al recibir confirmacion, ejecuta create_court_booking
6. Confirma con referencia y desglose de pago

SOBRE "CODIGO DE PROMOCION" (solo Open Play, solo al CREAR sala):
- Si el usuario menciona espontaneamente que tiene un codigo de promocion (ej. "tengo el codigo VERANO2026"), incluye ese valor en promo_code al llamar create_open_play_room.
- NUNCA preguntes proactivamente si tiene un codigo.
- Esto NO aplica para unirse a una sala existente, solo para crearla.
- Si el codigo es invalido, informa al usuario y continua normalmente (ofreciendo el pago de anticipo regular).

SOBRE "ULTIMA RESERVA":
- Si te preguntan directamente "cual fue la ultima reserva?" o "se ha registrado algo recientemente?", usa get_last_booking.
- Si no te preguntan nada al respecto, NO menciones esto de forma proactiva.
- Si get_last_booking encuentra una reserva, puedes confirmar que SI existe una reserva reciente (con fecha y hora), pero NO reveles el nombre del cliente a menos que te lo pidan explicitamente.

REGLAS:
- Responde en el idioma del usuario (es/en)
- Maximo 3 oraciones por respuesta, se conciso
- SIEMPRE verifica disponibilidad antes de reservar
- SIEMPRE pide confirmacion antes de crear reserva
- Al crear reserva o sala, se cobrara $50 MXN de anticipo via Stripe y se redirigira al pago
- Al MODIFICAR una reserva (cambiar fecha/hora/cancha), NO se cobra nuevo anticipo — el ya pagado se respeta
- Si una herramienta retorna error o no puedes realizar una accion, responde EXACTAMENTE: "Te ofrezco una disculpa, esa acción aún no la aprendo a hacer correctamente. Te prometo aprender. Mientras tanto, [aquí puedes contactar a un humano que te ayude](https://wa.me/528344775287)"
- NUNCA inventes soluciones, NUNCA des numeros de telefono sin el link de WhatsApp
- Solo PICA modifica reservas existentes sin cobro adicional
- Para fechas fuera de los 3 dias del calendario, usa las herramientas normalmente`
}

async function callClaude(messages) {
  const resp = await fetch('/api/pika', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: buildSystemPrompt(),
      tools: TOOLS,
      messages,
    }),
  })
  if (!resp.ok) { const e = await resp.json(); throw new Error(e.error?.message || 'API error') }
  return resp.json()
}

export function usePika() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastBooking, setLastBooking] = useState(null)

  const sendMessage = useCallback(async (userText) => {
    const userMsg = { role: 'user', content: userText }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const apiMsgs = newMessages.map(m => ({ role: m.role, content: m.content }))
      let response = await callClaude(apiMsgs)
      let iterations = 0

      while (response.stop_reason === 'tool_use' && iterations < 6) {
        iterations++
        const toolUses = response.content.filter(b => b.type === 'tool_use')
        const toolResults = []

        for (const tu of toolUses) {
          const result = await executeTool(tu.name, tu.input)
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) })
          if ((tu.name === 'create_court_booking' || tu.name === 'create_open_play_room') && result.success) {
            setLastBooking(result)
          }
        }

        apiMsgs.push({ role: 'assistant', content: response.content })
        apiMsgs.push({ role: 'user', content: toolResults })
        response = await callClaude(apiMsgs)
      }

      const textBlock = response.content.find(b => b.type === 'text')
      const text = textBlock?.text || 'No pude procesar tu mensaje.'
      setMessages(prev => [...prev, { role: 'assistant', content: text }])
      return text
    } catch (err) {
      console.error('PICA error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}. Intenta de nuevo.` }])
    } finally {
      setLoading(false)
    }
  }, [messages])

  const reset = useCallback(() => { setMessages([]); setLastBooking(null) }, [])
  return { messages, loading, sendMessage, reset, lastBooking }
}
