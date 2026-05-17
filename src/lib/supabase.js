import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Horas de operacion
export const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 8 a 22
export const COURTS = ['Cancha 1', 'Cancha 2', 'Cancha 3', 'Cancha 4']
export const COURT_IDS = [1, 2, 3, 4]

// Precios canchas privadas
export const PRICES = { 60: 400, 90: 600, 120: 750, 150: 950 }
export const OPEN_PLAY_PRICE = 200 // por persona
export const DEPOSIT = 50 // garantia

// Obtener slots ocupados para una cancha y fecha dada
// Consulta bookings + tour_bookings + drills del calendario general
export async function getOccupiedSlots(courtIndex, dateStr) {
  const court = COURTS[courtIndex]

  // Reservas normales (privada, openplay)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('hour, start_minute, duration, modality')
    .eq('date', dateStr)
    .eq('court', court)
    .in('status', ['reserved', 'playing'])

  // Drills
  const { data: drills } = await supabase
    .from('drills')
    .select('hour')
    .eq('date', dateStr)
    .eq('court', court)
    .neq('status', 'cancelled')

  // Tours (usan cancha tambien)
  const { data: tours } = await supabase
    .from('tour_bookings')
    .select('hour, court')
    .eq('date', dateStr)
    .eq('court', court)
    .neq('status', 'cancelled')

  const occupied = new Set()

  // Marcar horas ocupadas por bookings (considerando duracion)
  ;(bookings || []).forEach(b => {
    const startHour = b.hour
    const durationHours = b.duration || 1
    const slots = Math.ceil(durationHours * 2) // en medias horas
    for (let i = 0; i < slots; i++) {
      const totalMins = startHour * 60 + (b.start_minute || 0) + i * 30
      const h = Math.floor(totalMins / 60)
      const m = totalMins % 60
      occupied.add(`${h}:${m === 0 ? '00' : '30'}`)
    }
  })

  ;(drills || []).forEach(d => occupied.add(`${d.hour}:00`))
  ;(tours || []).forEach(t => occupied.add(`${t.hour}:00`))

  return occupied
}

// Obtener salas de open play por fecha
export async function getOpenPlayRooms(dateStr) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, hour, start_minute, name, people, gender_m, gender_f, gender_k, notes, court')
    .eq('date', dateStr)
    .eq('modality', 'openplay')
    .in('status', ['reserved', 'playing'])
    .order('hour', { ascending: true })

  if (error) return []
  return data || []
}

// Crear reserva de cancha privada (desde sitio publico)
export async function createPublicBooking({ date, hour, startMinute, court, duration, name, phone, email }) {
  const durationHours = duration / 60
  const prices = { 60: 400, 90: 600, 120: 750, 150: 950 }
  const revenue = prices[duration] || 400

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      date,
      hour,
      start_minute: startMinute,
      court,
      modality: 'privada',
      name,
      notes: `Tel: ${phone} | Email: ${email} | SITIO WEB PUBLICO`,
      status: 'reserved',
      revenue,
      duration: durationHours,
      people: 1,
      city: 'Web',
      created_by: 'publico',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Crear o unirse a sala open play (desde sitio publico)
export async function createOpenPlayRoom({ date, hour, court, roomName, hostName, phone, email, members }) {
  const peopleCount = members.length + 1 // titular + jugadores
  const revenue = OPEN_PLAY_PRICE * peopleCount

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      date,
      hour,
      start_minute: 0,
      court,
      modality: 'openplay',
      name: hostName,
      notes: `Sala: ${roomName} | Miembros: ${members.join(', ')} | Tel: ${phone} | Email: ${email} | SITIO WEB PUBLICO`,
      status: 'reserved',
      revenue,
      duration: 3,
      people: peopleCount,
      gender_m: 0,
      gender_f: 0,
      gender_k: 0,
      city: 'Web',
      created_by: 'publico',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Unirse a sala existente (incrementa people en la reserva)
export async function joinOpenPlayRoom(bookingId, newMemberName, phone, email) {
  // Leer la reserva actual
  const { data: current } = await supabase
    .from('bookings')
    .select('people, notes, revenue')
    .eq('id', bookingId)
    .single()

  if (!current) throw new Error('Sala no encontrada')

  const newPeople = (current.people || 1) + 1
  const newRevenue = OPEN_PLAY_PRICE * newPeople
  const newNotes = current.notes + ` | +${newMemberName} (${phone}, ${email})`

  const { error } = await supabase
    .from('bookings')
    .update({ people: newPeople, revenue: newRevenue, notes: newNotes })
    .eq('id', bookingId)

  if (error) throw error
  return { bookingId, newMember: newMemberName }
}
