import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export const COURTS = ['Cancha 1', 'Cancha 2', 'Cancha 3', 'Cancha 4']
export const PRICES = { 60: 400, 90: 600, 120: 750, 150: 950 }
export const OPEN_PLAY_PRICE = 200
export const DEPOSIT = 50

// ── Horarios de operacion ────────────────────────────────────────────────────
// Devuelve los bloques de horario disponibles para RESERVAR (no de apertura del lugar)
// segun el dia de la semana. Cada bloque: { startMin, endMin } en minutos desde 00:00.
// endMin es el limite MAXIMO de fin de una reserva (no de inicio).
export function getReservationBlocks(dateStr) {
  const day = new Date(dateStr + 'T12:00:00').getDay() // 0=domingo...6=sabado
  if (day === 0) return [] // domingo cerrado
  if (day === 6) return [{ startMin: 7 * 60, endMin: 13 * 60 }] // sabado 7am-1pm
  // lunes a viernes: dos bloques
  return [
    { startMin: 7 * 60,  endMin: 10 * 60 }, // 7am-10am
    { startMin: 16 * 60, endMin: 22 * 60 }, // 4pm-10pm (ultimo inicio 9pm, max 1h)
  ]
}

// Verifica si una reserva (inicio + duracion) cabe dentro de algun bloque de operacion
export function isWithinOperatingHours(dateStr, hour, startMinute, durationMinutes) {
  const startTotal = hour * 60 + (startMinute || 0)
  const endTotal   = startTotal + durationMinutes
  const blocks = getReservationBlocks(dateStr)
  return blocks.some(b => startTotal >= b.startMin && endTotal <= b.endMin)
}

// Texto legible de horarios para un dia dado (para mensajes de error)
export function describeOperatingHours(dateStr) {
  const blocks = getReservationBlocks(dateStr)
  if (blocks.length === 0) return 'Cerrado este dia (domingo)'
  return blocks.map(b => {
    const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
    return `${fmt(b.startMin)} - ${fmt(b.endMin)}`
  }).join(' y ')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCourtNum(court) {
  if (typeof court === 'number' && court <= 4) return court
  if (typeof court === 'string') return parseInt(court.replace(/\D/g, '')) || 1
  return 1
}

// Verifica si una cancha específica está libre en una fecha/hora/duración
async function isCourtFree(courtNum, dateStr, hour, startMinute, durationHours) {
  const slotsNeeded = Math.ceil(durationHours * 2) // en medias horas

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
  ;(drills || []).forEach(d => {
    occupied.add(`${d.hour}:00`)
    occupied.add(`${d.hour}:30`)
  })
  ;(tours || []).forEach(t => {
    for (let i = 0; i < 6; i++) { // tours duran 3hrs = 6 medias horas
      const mins = t.hour * 60 + i * 30
      const h = Math.floor(mins / 60)
      const m = mins % 60
      occupied.add(`${h}:${m === 0 ? '00' : '30'}`)
    }
  })

  // Verificar que todos los slots necesarios estén libres
  for (let i = 0; i < slotsNeeded; i++) {
    const mins = hour * 60 + (startMinute || 0) + i * 30
    const h = Math.floor(mins / 60)
    const m = mins % 60
    const key = `${h}:${m === 0 ? '00' : '30'}`
    if (occupied.has(key)) return false
  }
  return true
}

// Encuentra la primera cancha disponible para una fecha/hora/duración
// Revisa las 4 canchas en orden y retorna el número de la primera libre
export async function findAvailableCourt(dateStr, hour, startMinute, durationHours) {
  // Revisar las 4 canchas en paralelo
  const results = await Promise.all(
    [1, 2, 3, 4].map(n => isCourtFree(n, dateStr, hour, startMinute, durationHours))
  )
  const availableIndex = results.findIndex(free => free)
  if (availableIndex === -1) {
    throw new Error('No hay canchas disponibles para ese horario. Por favor elige otro.')
  }
  return availableIndex + 1 // retorna 1, 2, 3 o 4
}

// ── Consultas públicas ────────────────────────────────────────────────────────

// Slots ocupados para display (para mostrar en UI cuáles están tomados)
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

// ── Creación de reservas ──────────────────────────────────────────────────────

// ── Codigo de promocion (Open Play, solo al crear sala) ──────────────────────
// Devuelve el codigo activo actual (string) o null si no hay ninguno configurado
export async function getActivePromoCode() {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('code')
    .eq('active', true)
    .limit(1)
  if (error || !data || data.length === 0) return null
  return data[0].code || null
}

// Compara (case-insensitive, trim) un codigo ingresado contra el activo
export async function checkPromoCode(inputCode) {
  if (!inputCode || !inputCode.trim()) return false
  const active = await getActivePromoCode()
  if (!active) return false
  return active.trim().toLowerCase() === inputCode.trim().toLowerCase()
}

// Cancha privada — asigna automáticamente o usa preferencia si está libre
export async function createPublicBooking({ date, hour, startMinute, duration, name, phone, email, preferredCourt }) {
  const durationHours = duration / 60
  const revenue = PRICES[duration] || 400

  if (!isWithinOperatingHours(date, hour, startMinute || 0, duration)) {
    throw new Error(`Ese horario esta fuera de operacion. Horario disponible para ${date}: ${describeOperatingHours(date)}`)
  }

  let courtNum
  if (preferredCourt) {
    // Verificar si la cancha preferida está libre
    const free = await isCourtFree(preferredCourt, date, hour, startMinute || 0, durationHours)
    courtNum = free ? preferredCourt : await findAvailableCourt(date, hour, startMinute || 0, durationHours)
  } else {
    courtNum = await findAvailableCourt(date, hour, startMinute || 0, durationHours)
  }

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
  return { ...data, courtNum, courtName: `Cancha ${courtNum}` }
}

// Crear sala open play — asigna automáticamente la primera cancha libre
// promoApplied: true si el creador uso un codigo de promocion valido (exento de anticipo)
export async function createOpenPlayRoom({ date, hour, roomName, hostName, phone, email, members, promoApplied }) {
  if (!isWithinOperatingHours(date, hour, 0, 180)) {
    throw new Error(`Ese horario esta fuera de operacion para Open Play (requiere 3h continuas). Horario disponible para ${date}: ${describeOperatingHours(date)}`)
  }

  const allMembers = [hostName, ...(members || [])]
  const peopleCount = allMembers.length
  const revenue = OPEN_PLAY_PRICE * peopleCount
  const membersStr = (members || []).join(', ')

  // Buscar primera cancha disponible para 3 horas
  const courtNum = await findAvailableCourt(date, hour, 0, 3)

  const promoTag = promoApplied ? ' | PROMO: anticipo exento' : ''

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      date,
      hour,
      start_minute: 0,
      court: courtNum,
      modality: 'openplay',
      name: hostName,
      notes: `Sala: ${roomName} | Miembros: ${membersStr} | Tel: ${phone} | Email: ${email} | SITIO WEB PUBLICO${promoTag}`,
      notes_players: JSON.stringify(allMembers),
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
  return { ...data, courtNum, courtName: `Cancha ${courtNum}` }
}

// Unirse a sala existente
export async function joinOpenPlayRoom(bookingId, newMemberName, phone, email) {
  const { data: current, error: fetchErr } = await supabase
    .from('bookings')
    .select('people, notes, revenue, notes_players')
    .eq('id', bookingId)
    .single()

  if (fetchErr || !current) throw new Error('Sala no encontrada')

  const newPeople = (current.people || 1) + 1
  const newRevenue = OPEN_PLAY_PRICE * newPeople
  const newNotes = `${current.notes} | +${newMemberName} (${phone}, ${email}) | SITIO WEB PUBLICO`

  let players = []
  try { players = JSON.parse(current.notes_players || '[]') } catch { players = [] }
  players.push(newMemberName)

  const { error } = await supabase
    .from('bookings')
    .update({
      people: newPeople,
      revenue: newRevenue,
      notes: newNotes,
      notes_players: JSON.stringify(players),
    })
    .eq('id', bookingId)

  if (error) throw error
  return { bookingId, newMember: newMemberName, totalPeople: newPeople }
}

// Ultima reserva registrada desde el sitio web (cualquier fecha, futura o pasada)
// Util para que PICA sepa si hubo actividad reciente, sin importar que tan lejos sea la fecha
export async function getLastWebBooking() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, date, hour, start_minute, court, modality, name, status, created_at')
    .ilike('notes', '%SITIO WEB PUBLICO%')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  if (!data || data.length === 0) return { found: false }
  const b = data[0]
  return {
    found: true,
    id: b.id,
    date: b.date,
    hour: b.hour,
    start_minute: b.start_minute || 0,
    court: b.court,
    modality: b.modality,
    name: b.name,
    status: b.status,
    created_at: b.created_at,
  }
}

