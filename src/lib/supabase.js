import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export const COURTS = ['Cancha 1', 'Cancha 2', 'Cancha 3', 'Cancha 4']
export const PRICES = { 60: 400, 90: 600, 120: 750, 150: 950 }
export const OPEN_PLAY_PRICE = 200
export const DEPOSIT = 50

// Convierte "Cancha 1" o 0 (index) -> numero 1,2,3,4
function toCourtNum(court) {
  if (typeof court === 'number' && court <= 4) return court
  if (typeof court === 'string') return parseInt(court.replace(/\D/g, '')) || 1
  return 1
}

// Slots ocupados para una cancha y fecha
export async function getOccupiedSlots(courtIndex, dateStr) {
  const courtNum = courtIndex + 1

  const [{ data: bookings }, { data: drills }, { data: tours }] = await Promise.all([
    supabase.from('bookings')
      .select('hour, start_minute, duration')
      .eq('date', dateStr).eq('court', courtNum)
      .in('status', ['reserved', 'playing']),
    supabase.from('drills')
      .select('hour')
      .eq('date', dateStr).eq('court', courtNum)
      .neq('status', 'cancelled'),
    supabase.from('tour_bookings')
      .select('hour')
      .eq('date', dateStr).eq('court', courtNum)
      .neq('status', 'cancelled'),
  ])

  const occupied = new Set()
  ;(bookings || []).forEach(b => {
    const slots = Math.ceil((b.duration || 1) * 2)
    for (let i = 0; i < slots; i++) {
      const mins = b.hour * 60 + (b.start_minute || 0) + i * 30
      const h = Math.floor(mins / 60)
      const m = mins % 60
      occupied.add(`${h}:${m === 0 ? '00' : '30'}`)
    }
  })
  ;(drills || []).forEach(d => occupied.add(`${d.hour}:00`))
  ;(tours || []).forEach(t => occupied.add(`${t.hour}:00`))
  return occupied
}

// Salas open play por fecha
export async function getOpenPlayRooms(dateStr) {
  const { data } = await supabase
    .from('bookings')
    .select('id, hour, name, people, notes, court')
    .eq('date', dateStr)
    .eq('modality', 'openplay')
    .in('status', ['reserved', 'playing'])
    .order('hour', { ascending: true })
  return data || []
}

// Crear reserva cancha privada
export async function createPublicBooking({ date, hour, startMinute, court, duration, name, phone, email }) {
  const courtNum = toCourtNum(court)
  const revenue = PRICES[duration] || 400
  const durationHours = duration / 60

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      date,
      hour,
      start_minute: startMinute || 0,
      court: courtNum,
      modality: 'privada',
      name,
      notes: `Tel: ${phone} | Email: ${email} | SITIO WEB PUBLICO`,
      status: 'reserved',
      revenue,
      duration: durationHours,
      people: 1,
      gender_m: 0,
      gender_f: 0,
      gender_k: 0,
      city: 'Web',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Crear sala open play
export async function createOpenPlayRoom({ date, hour, court, roomName, hostName, phone, email, members }) {
  const courtNum = toCourtNum(court)
  const peopleCount = (members || []).length + 1
  const revenue = OPEN_PLAY_PRICE * peopleCount
  const membersStr = (members || []).join(', ')

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      date,
      hour,
      start_minute: 0,
      court: courtNum,
      modality: 'openplay',
      name: hostName,
      notes: `Sala: ${roomName} | Miembros: ${membersStr} | Tel: ${phone} | Email: ${email} | SITIO WEB PUBLICO`,
      status: 'reserved',
      revenue,
      duration: 3,
      people: peopleCount,
      gender_m: 0,
      gender_f: 0,
      gender_k: 0,
      city: 'Web',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Unirse a sala existente
export async function joinOpenPlayRoom(bookingId, newMemberName, phone, email) {
  const { data: current, error: fetchErr } = await supabase
    .from('bookings')
    .select('people, notes, revenue')
    .eq('id', bookingId)
    .single()

  if (fetchErr || !current) throw new Error('Sala no encontrada')

  const newPeople = (current.people || 1) + 1
  const newRevenue = OPEN_PLAY_PRICE * newPeople
  const newNotes = `${current.notes} | +${newMemberName} (${phone}, ${email}) | SITIO WEB PUBLICO`

  const { error } = await supabase
    .from('bookings')
    .update({ people: newPeople, revenue: newRevenue, notes: newNotes })
    .eq('id', bookingId)

  if (error) throw error
  return { bookingId, newMember: newMemberName, totalPeople: newPeople }
}
