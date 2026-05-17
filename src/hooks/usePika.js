import { useState, useCallback } from 'react'
import {
  supabase, COURTS, PRICES, OPEN_PLAY_PRICE,
  getOccupiedSlots, getOpenPlayRooms,
  createPublicBooking, createOpenPlayRoom
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
    description: 'Crea una reserva de cancha privada. Solo usar cuando el usuario haya confirmado todos los datos.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        hour: { type: 'number' },
        start_minute: { type: 'number', description: '0 o 30' },
        court: { type: 'string', description: 'Cancha 1, 2, 3 o 4' },
        duration: { type: 'number', description: '60, 90, 120 o 150 minutos' },
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' }
      },
      required: ['date', 'hour', 'start_minute', 'court', 'duration', 'name', 'phone', 'email']
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
        members: { type: 'array', items: { type: 'string' } }
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
    name: 'modify_booking',
    description: 'Modifica una reserva existente. Solo PIKA puede hacer esto.',
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
        const available = []
        const taken = []
        for (let h = 8; h <= 22; h++) {
          for (const m of ['00', '30']) {
            if (h === 22 && m === '30') continue
            const key = `${h}:${m}`
            occupied.has(key) ? taken.push(key) : available.push(key)
          }
        }
        return { court: COURTS[toolInput.court_index], date: toolInput.date, available_slots: available, occupied_slots: taken }
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
        const prices = { 60: 450, 90: 650, 120: 800, 150: 1050 }
        const result = await createPublicBooking({
          date: toolInput.date, hour: toolInput.hour, startMinute: toolInput.start_minute || 0,
          court: toolInput.court, duration: toolInput.duration,
          name: toolInput.name, phone: toolInput.phone, email: toolInput.email
        })
        return {
          success: true, booking_id: result.id,
          reference: 'PBL-' + String(result.id).slice(-6).toUpperCase(),
          court: toolInput.court, date: toolInput.date,
          time: `${String(toolInput.hour).padStart(2,'0')}:${String(toolInput.start_minute||0).padStart(2,'0')}`,
          duration_min: toolInput.duration, price_mxn: prices[toolInput.duration] || 450
        }
      }
      case 'create_open_play_room': {
        const result = await createOpenPlayRoom({
          date: toolInput.date, hour: toolInput.hour, court: COURTS[0],
          roomName: toolInput.room_name, hostName: toolInput.host_name,
          phone: toolInput.phone, email: toolInput.email, members: toolInput.members || []
        })
        return {
          success: true, booking_id: result.id,
          reference: 'OPL-' + String(result.id).slice(-6).toUpperCase(),
          room_name: toolInput.room_name, date: toolInput.date,
          time: `${String(toolInput.hour).padStart(2,'0')}:00`, price_per_person: 250
        }
      }
      case 'find_booking': {
        const { data } = await supabase
          .from('bookings').select('id, date, hour, court, modality, name, notes, status, duration')
          .ilike('name', `%${toolInput.name}%`).in('status', ['reserved', 'playing'])
          .order('date', { ascending: false }).limit(5)
        return { found: (data||[]).length, bookings: data || [] }
      }
      case 'modify_booking': {
        const updates = {}
        if (toolInput.new_hour !== undefined) updates.hour = toolInput.new_hour
        if (toolInput.new_court) updates.court = toolInput.new_court
        if (toolInput.new_date) updates.date = toolInput.new_date
        const { error } = await supabase.from('bookings').update(updates).eq('id', toolInput.booking_id)
        if (error) throw error
        return { success: true, booking_id: toolInput.booking_id, changes: updates }
      }
      default: return { error: `Tool ${toolName} not found` }
    }
  } catch (err) {
    return { error: err.message || 'Error executing tool' }
  }
}

const SYSTEM_PROMPT = `Eres PIKA, la asistente inteligente de PICABOL en Cancun, Mexico.

PRECIOS:
- Cancha privada: 60min=$450, 90min=$650, 2hrs=$800, 2.5hrs=$1,050 MXN
- Open Play: $250 MXN por persona, 3 horas
- Deposito garantia: $50 MXN, tolerancia 10 min
- Cancelacion: hasta 2 horas antes
- Horario: 8am a 10pm todos los dias
- 4 canchas disponibles: Cancha 1, 2, 3 y 4

CAPACIDADES - usa las herramientas disponibles:
1. check_availability: consulta slots libres en cualquier fecha y cancha
2. get_open_play_rooms: ve salas activas de open play
3. create_court_booking: reserva cancha (confirma datos primero)
4. create_open_play_room: crea sala open play
5. find_booking: busca reserva existente por nombre
6. modify_booking: modifica reserva (solo PIKA puede)

FLUJO RESERVA:
1. Pregunta fecha, hora preferida, cancha y duracion
2. Verifica disponibilidad con check_availability
3. Si disponible, pide nombre, celular y correo
4. Confirma todo con el usuario
5. Ejecuta create_court_booking
6. Informa referencia y detalles

REGLAS:
- Responde en el idioma del usuario (es/en)
- Maximo 3 oraciones por respuesta, se conciso
- SIEMPRE verifica disponibilidad antes de reservar
- SIEMPRE confirma datos antes de ejecutar create_court_booking
- Solo PIKA modifica reservas existentes
- Para fechas fuera de los 3 dias del calendario, usaras las herramientas normalmente`

async function callClaude(messages) {
  const resp = await fetch('/.netlify/functions/pika', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
      console.error('PIKA error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}. Intenta de nuevo.` }])
    } finally {
      setLoading(false)
    }
  }, [messages])

  const reset = useCallback(() => { setMessages([]); setLastBooking(null) }, [])
  return { messages, loading, sendMessage, reset, lastBooking }
}
