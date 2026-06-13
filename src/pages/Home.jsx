import { useState, useEffect, useRef, useCallback } from 'react'
import {
  supabase, COURTS, PRICES, OPEN_PLAY_PRICE, DEPOSIT,
  getOccupiedSlots, getOpenPlayRooms,
  createPublicBooking, createOpenPlayRoom, joinOpenPlayRoom, checkPromoCode,
  getReservationBlocks, isWithinOperatingHours
} from '../lib/supabase'
import { usePika } from '../hooks/usePika'
import { downloadBookingPDF } from '../hooks/useDownload'
import { initiateStripeCheckout, checkStripeReturn, checkStripeCancelled } from '../hooks/useStripe'


// ── Traducciones ──────────────────────────────────────────────────────────────
const T = {
  es: {
    heroTitle: ['RESERVA', 'TU CANCHA'],
    heroSub: '4 canchas premium en Cancún · Reserva en segundos',
    gbar: ['Garantiza tu espacio con ', '$50 MXN', ' — 10 min de tolerancia para llegar'],
    tabPriv: 'CANCHA PRIVADA',
    tabOpen: 'OPEN PLAY',
    labFecha: 'Fecha',
    labCancha: 'Cancha',
    labHora: 'Horario disponible',
    labDur: 'Duración',
    labDatos: 'Tus datos',
    nombre: 'Nombre completo',
    celular: 'Celular / WhatsApp',
    correo: 'Correo electrónico',
    reservar: 'RESERVAR',
    deposit: '+ $50 MXN depósito garantía',
    opIntro: ['Puedes ', 'crear tu sala', ' para que más personas se unan, o unirte a una existente. ¡Sin límite de integrantes!'],
    opJoin: 'Unirme a sala',
    opJoinSub: 'Elige una sala del panel →',
    opCreate: 'Crear mi sala',
    opCreateSub: 'Crea y que más se unan',
    salaName: 'Nombre de tu sala',
    salaHost: 'Tu nombre (titular)',
    jugadores: 'Jugadores (sin límite)',
    addPlayer: 'Nombre del jugador',
    promoLabel: 'Código de promoción (opcional)',
    promoPlaceholder: 'Si tienes uno',
    hora: 'Hora',
    crearSala: 'CREAR SALA',
    joinTitle: 'UNIRSE A SALA',
    joinBtn: 'UNIRME Y GARANTIZAR ESPACIO',
    sideTitle: 'SALAS OPEN PLAY',
    chatTitle: 'PICA · ASISTENTE 24/7',
    chatSub: 'Acceso al calendario completo · Puede hacer reservas',
    chatWelcome: '¡Hola! 👋 Soy PICA, tu asistente de PICABOL. Tengo acceso al calendario completo — puedo consultarte disponibilidad en cualquier fecha y hacer reservas por ti. ¿En qué te ayudo?',
    chatMod: '💡 ¿Ya tienes reserva? Dime y yo hago cualquier cambio por ti',
    chatPlaceholder: 'Escribe a PICA...',
    createRoomSide: '+ CREAR NUEVA SALA',
    visits: 'visitas hoy',
    available: 'Disponible',
    occupied: 'Ocupada',
    host: 'Titular',
    spots: 'jugadores',
    noRooms: 'No hay salas para este día. ¡Crea la tuya!',
    loading: 'Cargando...',
    success: '¡RESERVADO!',
    successSub: 'Tu lugar está garantizado. Recibirás confirmación por WhatsApp muy pronto.',
    successNote: 'Tienes 10 minutos de tolerancia desde la hora reservada.',
    backHome: '← Volver al inicio',
    days: ['Hoy', 'Mañana', 'Pasado'],
    months: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    joinHint: 'Selecciona una sala del panel derecho para unirte 👉',
    joinHintDate: 'Selecciona un día para ver las salas disponibles',
    pikaFutureHint: '¿Quieres reservar en otra fecha? Escríbele a PICA — puede revisar el calendario y reservar en cualquier fecha disponible.',
    modalHost: 'Titular',
    modalPlayers: 'Integrantes actuales',
    modalGuar: 'Garantiza tu espacio · $50 MXN',
    modalGuarSub: 'Tendrás 10 min de tolerancia para llegar. Pago seguro por Stripe.',
  },
  en: {
    heroTitle: ['BOOK', 'YOUR COURT'],
    heroSub: '4 premium courts in Cancún · Book in seconds',
    gbar: ['Secure your spot for ', '$50 MXN', ' — 10 min grace period to arrive'],
    tabPriv: 'PRIVATE COURT',
    tabOpen: 'OPEN PLAY',
    labFecha: 'Date',
    labCancha: 'Court',
    labHora: 'Available times',
    labDur: 'Duration',
    labDatos: 'Your info',
    nombre: 'Full name',
    celular: 'Phone / WhatsApp',
    correo: 'Email address',
    reservar: 'BOOK NOW',
    deposit: '+ $50 MXN guarantee deposit',
    opIntro: ['You can ', 'create your room', ' so more people can join, or join an existing one. No player limit!'],
    opJoin: 'Join a room',
    opJoinSub: 'Pick a room from the panel →',
    opCreate: 'Create my room',
    opCreateSub: 'Create and let others join',
    salaName: 'Room name',
    salaHost: 'Your name (host)',
    jugadores: 'Players (no limit)',
    addPlayer: 'Player name',
    promoLabel: 'Promo code (optional)',
    promoPlaceholder: 'If you have one',
    hora: 'Time',
    crearSala: 'CREATE ROOM',
    joinTitle: 'JOIN ROOM',
    joinBtn: 'JOIN & SECURE MY SPOT',
    sideTitle: 'OPEN PLAY ROOMS',
    chatTitle: 'PICA · 24/7 ASSISTANT',
    chatSub: 'Full calendar access · Can make bookings',
    chatWelcome: 'Hi! 👋 I\'m PICA, your PICABOL assistant. I have full calendar access — I can check availability on any date and make bookings for you. How can I help?',
    chatMod: '💡 Already have a booking? Tell me and I\'ll make any changes for you',
    chatPlaceholder: 'Message PICA...',
    createRoomSide: '+ CREATE NEW ROOM',
    visits: 'visits today',
    available: 'Available',
    occupied: 'Occupied',
    host: 'Host',
    spots: 'players',
    noRooms: 'No rooms for this day. Create yours!',
    loading: 'Loading...',
    success: 'BOOKED!',
    successSub: 'Your spot is guaranteed. You\'ll receive a WhatsApp confirmation shortly.',
    successNote: 'You have 10 minutes of grace period from your booking time.',
    backHome: '← Back to home',
    days: ['Today', 'Tomorrow', 'Day after'],
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    joinHint: 'Select a room from the right panel to join 👉',
    joinHintDate: 'Select a day to see available rooms',
    pikaFutureHint: 'Want to book for a different date? Message PICA — she can check the calendar and book any available date.',
    modalHost: 'Host',
    modalPlayers: 'Current players',
    modalGuar: 'Secure your spot · $50 MXN',
    modalGuarSub: '10 min grace period to arrive. Secure payment via Stripe.',
  }
}

const AV_COLORS = ['#d4e84a','#a8d08d','#f0c975','#b8d0f5','#f5b8d0','#b8f5d0']

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDates(lang) {
  const t = T[lang]
  const now = new Date()
  return [0, 1, 2].map(i => {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    // Usar fecha local, NO toISOString() que usa UTC y puede dar día +1
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return {
      label: t.days[i],
      num: d.getDate(),
      mon: t.months[d.getMonth()],
      iso
    }
  })
}

function formatRef() {
  return 'PBL-' + Date.now().toString().slice(-6)
}

function extractRoomInfo(booking) {
  const notes = booking.notes || ''
  // Nombre de sala
  const salaMatch = notes.match(/Sala: ([^|]+)/)
  const roomName = salaMatch ? salaMatch[1].trim() : `Open Play ${booking.court}`

  // Miembros originales: "Miembros: Ana, Luis"
  const membersMatch = notes.match(/Miembros: ([^|]+)/)
  const membersRaw = membersMatch ? membersMatch[1].trim() : ''
  const originalMembers = membersRaw
    ? membersRaw.split(',').map(m => m.trim()).filter(Boolean)
    : []

  // Miembros que se unieron después: "+ Nombre (tel, email)"
  const joinedMembers = []
  const joinPattern = /\+([^(|]+)\s*\(/g
  let match
  while ((match = joinPattern.exec(notes)) !== null) {
    const name = match[1].trim()
    if (name) joinedMembers.push(name)
  }

  return { roomName, members: [...originalMembers, ...joinedMembers] }
}

// ── Componentes pequeños ──────────────────────────────────────────────────────
function LiveDot() {
  return <span style={{
    display: 'inline-block', width: 7, height: 7, background: '#5cb85c',
    borderRadius: '50%', marginRight: 6,
    animation: 'pulse 1.5s infinite'
  }} />
}

function Spinner() {
  return <span style={{
    display: 'inline-block', width: 16, height: 16,
    border: '2px solid #d4e84a', borderTopColor: 'transparent',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite'
  }} />
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Home() {
  const [lang, setLangState] = useState('es')
  const [mode, setMode] = useState('cancha') // 'cancha' | 'open'
  const [opMode, setOpMode] = useState('join') // 'join' | 'create'

  // Fechas
  const dates = getDates(lang)
  const [selDateIdx, setSelDateIdx] = useState(0)
  const [opDateIdx, setOpDateIdx] = useState(0)
  const [createDateIdx, setCreateDateIdx] = useState(0)
  const [sideDateIdx, setSideDateIdx] = useState(0)
  const [allRooms, setAllRooms] = useState([])
  const [sideFilter, setSideFilter] = useState('all') // 'all' | 0 | 1 | 2

  // Cancha privada
  const [selCourt, setSelCourt] = useState(0)
  const [selSlot, setSelSlot] = useState(null)
  const [selDur, setSelDur] = useState(60)
  const [occupiedSlots, setOccupiedSlots] = useState(new Set())
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [courtAvailability, setCourtAvailability] = useState([null, null, null, null])
  const [openOccupiedSlots, setOpenOccupiedSlots] = useState(new Set())
  const [loadingOpenSlots, setLoadingOpenSlots] = useState(false)
  const [bkName, setBkName] = useState('')
  const [bkPhone, setBkPhone] = useState('')
  const [bkEmail, setBkEmail] = useState('')

  // Open play
  const [openRooms, setOpenRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [salaName, setSalaName] = useState('')
  const [salaHost, setSalaHost] = useState('')
  const [salaTel, setSalaTel] = useState('')
  const [salaEmail, setSalaEmail] = useState('')
  const [salaHour, setSalaHour] = useState('10:00')
  const [salaPromo, setSalaPromo] = useState('')
  const [players, setPlayers] = useState([])
  const [playerInput, setPlayerInput] = useState('')

  // Modal unirse
  const [joinRoom, setJoinRoom] = useState(null)
  const [joinName, setJoinName] = useState('')
  const [joinPhone, setJoinPhone] = useState('')
  const [joinEmail, setJoinEmail] = useState('')

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null) // { ref, type, details }
  const [visitCount] = useState(() => Math.floor(900 + Math.random() * 300))

  // Pika chat
  const { messages: chatMessages, loading: chatLoading, sendMessage } = usePika()
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)
  const t = T[lang]

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Detectar retorno de Stripe
  useEffect(() => {
    const stripeReturn = checkStripeReturn()
    if (stripeReturn) handlePostPayment(stripeReturn)
    if (checkStripeCancelled()) {
      alert(lang === 'es' ? 'Pago cancelado. Tu reserva no fue creada.' : 'Payment cancelled. Your booking was not created.')
    }
  }, [])

  useEffect(() => {
    loadSlots()
    loadAllCourtsAvailability()
  }, [selDateIdx, selCourt])

  useEffect(() => {
    setSelSlot(null)
  }, [selDur])

  useEffect(() => {
    loadRooms(sideDateIdx)
    // Realtime — actualizar salas cuando cambia cualquier booking de openplay
    const channel = supabase
      .channel('public-openplay')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: 'modality=eq.openplay'
      }, () => loadRooms(sideDateIdx))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [sideDateIdx])

  useEffect(() => {
    loadOpenSlots()
  }, [createDateIdx, lang])

  async function loadSlots() {
    setLoadingSlots(true)
    setSelSlot(null)
    try {
      const occupied = await getOccupiedSlots(selCourt, dates[selDateIdx].iso)
      setOccupiedSlots(occupied)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSlots(false)
    }
  }

  async function loadAllCourtsAvailability() {
    const now = new Date()
    const isToday = selDateIdx === 0
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const dateIso = dates[selDateIdx].iso
    const blocks = getReservationBlocks(dateIso)
    try {
      const results = await Promise.all(
        COURTS.map((_, i) => getOccupiedSlots(i, dateIso))
      )
      const availability = results.map(occupied => {
        // Check if there's at least one available slot in the future
        for (const b of blocks) {
          for (let mins = b.startMin; mins < b.endMin; mins += 30) {
            const h = Math.floor(mins / 60)
            const m = mins % 60 === 0 ? '00' : '30'
            if (isToday && mins < nowMins + 120) continue
            if (!occupied.has(`${h}:${m}`)) return true
          }
        }
        return false
      })
      setCourtAvailability(availability)
    } catch (e) {
      console.error(e)
      setCourtAvailability([true, true, true, true])
    }
  }

  async function loadRooms(dateIdx) {
    setLoadingRooms(true)
    try {
      const idx = dateIdx !== undefined ? dateIdx : sideDateIdx
      // Load selected day rooms
      const rooms = await getOpenPlayRooms(dates[idx]?.iso || dates[0].iso)
      setOpenRooms(rooms)
      // Load all 3 days for the side panel
      const [r0, r1, r2] = await Promise.all(
        dates.map(d => getOpenPlayRooms(d.iso))
      )
      // Merge, add dateIdx, sort by date+hour
      const merged = [
        ...r0.map(r => ({...r, _dateIdx: 0, _dateIso: dates[0].iso})),
        ...r1.map(r => ({...r, _dateIdx: 1, _dateIso: dates[1].iso})),
        ...r2.map(r => ({...r, _dateIdx: 2, _dateIso: dates[2].iso})),
      ].sort((a, b) => {
        if (a._dateIso !== b._dateIso) return a._dateIso.localeCompare(b._dateIso)
        return a.hour - b.hour
      })
      setAllRooms(merged)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRooms(false)
    }
  }

  // Horas de inicio validas para Open Play (3h continuas, inicio en punto) en una fecha dada
  function getOpenPlayStartHours(dateIso) {
    const hours = []
    for (let h = 0; h < 24; h++) {
      if (isWithinOperatingHours(dateIso, h, 0, 180)) hours.push(h)
    }
    return hours
  }

  async function loadOpenSlots() {
    // Open Play no requiere cancha específica — el admin asigna al llegar
    // Solo calculamos los horarios válidos según hora actual
    const now = new Date()
    const isToday = createDateIdx === 0
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const dateIso = dates[createDateIdx].iso
    const validHours = getOpenPlayStartHours(dateIso)
    // Auto-select first valid slot
    let picked = false
    for (const h of validHours) {
      const slotMins = h * 60
      if (isToday && slotMins < nowMins + 120) continue
      setSalaHour(`${h}:00`)
      picked = true
      break
    }
    if (!picked && validHours.length > 0) setSalaHour(`${validHours[0]}:00`)
    setOpenOccupiedSlots(new Set()) // no bloqueamos horarios para open play
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function setLang(l) {
    setLangState(l)
    document.documentElement.lang = l
  }

  // ── Post-payment: crea reserva en Supabase tras pago exitoso ────────────────
  async function handlePostPayment({ type, bookingData }) {
    setSubmitting(true)
    try {
      if (type === 'cancha') {
        const result = await createPublicBooking(bookingData)
        setSuccess({
          ref: 'PBL-' + String(result.id).slice(-6).toUpperCase(),
          type: 'cancha',
          details: {
            name: bookingData.name, phone: bookingData.phone, email: bookingData.email,
            court: result.courtName || `Cancha ${result.court}`,
            date: bookingData.date, time: bookingData.time,
            duration: bookingData.duration, price: PRICES[bookingData.duration],
          }
        })
      } else if (type === 'open_create') {
        const result = await createOpenPlayRoom(bookingData)
        setSuccess({
          ref: 'OPL-' + String(result.id).slice(-6).toUpperCase(),
          type: 'open',
          details: {
            name: bookingData.hostName, phone: bookingData.phone, email: bookingData.email,
            roomName: bookingData.roomName,
            court: result.courtName || `Cancha ${result.court}`,
            date: bookingData.date, time: bookingData.time, price: OPEN_PLAY_PRICE,
          }
        })
        setTimeout(() => loadRooms(createDateIdx), 500)
      } else if (type === 'open_join') {
        await joinOpenPlayRoom(bookingData.bookingId, bookingData.name, bookingData.phone, bookingData.email)
        setSuccess({
          ref: 'OPL-' + Date.now().toString().slice(-6),
          type: 'open',
          details: {
            name: bookingData.name, phone: bookingData.phone, email: bookingData.email,
            roomName: bookingData.roomName, date: bookingData.date,
            time: bookingData.time, price: OPEN_PLAY_PRICE,
          }
        })
        setTimeout(() => loadRooms(sideDateIdx), 300)
      }
      sessionStorage.removeItem('pending_booking')
    } catch (e) {
      console.error(e)
      alert(lang === 'es' ? `Error al crear reserva: ${e.message}` : `Booking error: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReserve() {
    if (!bkName || !bkPhone || !bkEmail || !selSlot) {
      alert(lang === 'es' ? 'Completa todos los campos y selecciona un horario' : 'Fill all fields and select a time slot')
      return
    }
    setSubmitting(true)
    try {
      const [h, m] = selSlot.split(':').map(Number)
      await initiateStripeCheckout({
        type: 'cancha',
        bookingData: {
          date: dates[selDateIdx].iso, hour: h, startMinute: m,
          duration: selDur, name: bkName, phone: bkPhone, email: bkEmail,
          time: selSlot,
        }
      })
    } catch (e) {
      alert(lang === 'es' ? `Error: ${e.message}` : `Error: ${e.message}`)
      setSubmitting(false)
    }
  }

  async function handleCreateRoom() {
    if (!salaName || !salaHost || !salaTel || !salaEmail) {
      alert(lang === 'es' ? 'Completa todos los campos obligatorios' : 'Fill all required fields')
      return
    }
    setSubmitting(true)
    try {
      const [h] = salaHour.split(':').map(Number)

      // Si hay codigo de promocion valido, crear la sala directo sin pasar por Stripe
      if (salaPromo.trim()) {
        const isValid = await checkPromoCode(salaPromo)
        if (isValid) {
          const result = await createOpenPlayRoom({
            date: dates[createDateIdx].iso, hour: h,
            roomName: salaName, hostName: salaHost,
            phone: salaTel, email: salaEmail, members: players,
            promoApplied: true,
          })
          setSuccess({
            ref: 'OPL-' + String(result.id).slice(-6).toUpperCase(),
            type: 'open',
            details: {
              name: salaHost, phone: salaTel, email: salaEmail,
              roomName: salaName,
              court: result.courtName || `Cancha ${result.court}`,
              date: dates[createDateIdx].iso, time: salaHour, price: 0,
              promoApplied: true,
            }
          })
          setTimeout(() => loadRooms(createDateIdx), 500)
          setSubmitting(false)
          return
        } else {
          alert(lang === 'es' ? 'Código de promoción no válido' : 'Invalid promo code')
          setSubmitting(false)
          return
        }
      }

      await initiateStripeCheckout({
        type: 'open_create',
        bookingData: {
          date: dates[createDateIdx].iso, hour: h,
          roomName: salaName, hostName: salaHost,
          phone: salaTel, email: salaEmail, members: players,
          time: salaHour,
        }
      })
    } catch (e) {
      alert(lang === 'es' ? `Error: ${e.message}` : `Error: ${e.message}`)
      setSubmitting(false)
    }
  }

  async function handleJoin() {
    if (!joinName || !joinPhone || !joinEmail || !joinRoom) {
      alert(lang === 'es' ? 'Completa todos los campos' : 'Fill all fields')
      return
    }
    setSubmitting(true)
    try {
      const { roomName } = extractRoomInfo(joinRoom)
      await initiateStripeCheckout({
        type: 'open_join',
        bookingData: {
          bookingId: joinRoom.id, name: joinName,
          phone: joinPhone, email: joinEmail,
          roomName, date: joinRoom._dateIso || dates[sideDateIdx].iso,
          time: `${String(joinRoom.hour).padStart(2,'0')}:00`,
        }
      })
    } catch (e) {
      console.error(e)
      alert(lang === 'es' ? `Error al unirse: ${e.message}` : `Error joining: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChat() {
    const q = chatInput.trim()
    if (!q || chatLoading) return
    setChatInput('')
    await sendMessage(q, { date: dates[selDateIdx].iso, court: selCourt })
  }

  function addPlayer() {
    if (!playerInput.trim()) return
    setPlayers(p => [...p, playerInput.trim()])
    setPlayerInput('')
  }

  function resetSuccess() {
    setSuccess(null)
    setBkName(''); setBkPhone(''); setBkEmail('')
    setSalaName(''); setSalaHost(''); setSalaTel(''); setSalaEmail('')
    setPlayers([]); setSelSlot(null)
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  function renderDateStrip(activeIdx, onSelect, id) {
    return (
      <div className="date-strip" id={id}>
        {dates.map((d, i) => (
          <button
            key={i}
            className={`date-chip ${i === activeIdx ? 'on' : ''}`}
            onClick={() => onSelect(i)}
          >
            <span className="dn">{d.mon}</span>
            <span className="dd">{d.num}</span>
            <span className="dl">{d.label}</span>
          </button>
        ))}
      </div>
    )
  }

  function renderSlots() {
    if (loadingSlots) return <div className="loading-row"><Spinner /> <span style={{marginLeft:8,color:'var(--gray-500)'}}>Consultando disponibilidad...</span></div>
    const now = new Date()
    const isToday = selDateIdx === 0
    const dateIso = dates[selDateIdx].iso
    const blocks = getReservationBlocks(dateIso)
    const slots = []
    let hasAvailable = false
    for (const b of blocks) {
      for (let mins = b.startMin; mins < b.endMin; mins += 30) {
        const h = Math.floor(mins / 60)
        const m = mins % 60 === 0 ? '00' : '30'
        const nowMins = now.getHours() * 60 + now.getMinutes()
        const isPast = isToday && mins < nowMins + 120
        const taken = occupiedSlots.has(`${h}:${m}`)
        // Verifica que la duracion seleccionada quepa dentro del bloque desde este slot
        const fitsDuration = isWithinOperatingHours(dateIso, h, m === '30' ? 30 : 0, selDur)
        if (isPast || taken || !fitsDuration) continue
        hasAvailable = true
        const key = `${h}:${m}`
        slots.push(
          <button
            key={key}
            className={`slot ${selSlot === key ? 'on' : ''}`}
            onClick={() => setSelSlot(key)}
          >
            {String(h).padStart(2,'0')}:{m}
          </button>
        )
      }
    }
    if (!hasAvailable) return (
      <p style={{fontSize:12,color:'var(--gray-500)',fontStyle:'italic',padding:'8px 0'}}>
        {lang==='es' ? 'No hay horarios disponibles para esta duración en este día. Prueba otra duración u otro día.' : 'No available slots for this duration on this day. Try another duration or day.'}
      </p>
    )
    return slots
  }

  function renderRooms() {
    if (loadingRooms) return <div className="loading-row"><Spinner /></div>
    const filtered = sideFilter === 'all'
      ? allRooms
      : allRooms.filter(r => r._dateIdx === sideFilter)
    if (!filtered.length) return <p className="no-rooms">{t.noRooms}</p>
    return filtered.map(r => {
      const { roomName, members } = extractRoomInfo(r)
      const allMembers = [r.name, ...members]
      const dateLabel = r._dateIdx === 0
        ? (lang==='es'?'Hoy':'Today')
        : r._dateIdx === 1
          ? (lang==='es'?'Mañana':'Tomorrow')
          : dates[2]?.mon + ' ' + dates[2]?.num
      return (
        <div key={r.id} className="rcard" onClick={() => { setJoinRoom({...r, _dateIso: r._dateIso}); setJoinName(''); setJoinPhone(''); setJoinEmail('') }}>
          <div className="rtop">
            <div>
              <div className="rname">{roomName}</div>
              <div className="rhost">{t.host}: {r.name}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
              <span className="rtime">⏰ {String(r.hour).padStart(2,'0')}:00</span>
              <span style={{fontSize:10,background:'var(--lime)',color:'var(--green)',borderRadius:10,padding:'1px 7px',fontWeight:700}}>{dateLabel}</span>
            </div>
          </div>
          <div className="rbot">
            <div className="avs">
              {allMembers.slice(0,5).map((m, i) => (
                <div key={i} className="av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>
                  {m.slice(0,2).toUpperCase()}
                </div>
              ))}
              {allMembers.length > 5 && <div className="av" style={{background:'#e4e3de'}}>+{allMembers.length-5}</div>}
            </div>
            <button className="jbtn" onClick={e => { e.stopPropagation(); setJoinRoom({...r, _dateIso: r._dateIso}); setJoinName(''); setJoinPhone(''); setJoinEmail('') }}>
              {t.opJoin.toUpperCase()}
            </button>
          </div>
        </div>
      )
    })
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="pb-app">
      {/* HERO */}
      <div className="hero">
        <img className="hero-img" src="/foto.jpeg" alt="PICABOL canchas Cancún"/>
        <div className="hero-fade" />
        <div className="hero-inner">
          <nav className="hnav">
            <div className="logo-area">
              <img className="logo-img" src="/picabol22.png" alt="PICABOL"/>
              <span className="logo-badge">CANCÚN</span>
            </div>
            <div className="nav-r">
              <button className={`lbtn ${lang==='es'?'on':''}`} onClick={() => setLang('es')}>ES</button>
              <button className={`lbtn ${lang==='en'?'on':''}`} onClick={() => setLang('en')}>EN</button>
              <span className="vbadge"><b>{visitCount.toLocaleString()}</b> {t.visits}</span>
            </div>
          </nav>
          <h1 className="htitle">
            {t.heroTitle[0]}<br/><em>{t.heroTitle[1]}</em>
          </h1>
          <p className="hsub">{t.heroSub}</p>
          <div className="gbar">
            🔒 {t.gbar[0]}<strong>{t.gbar[1]}</strong>{t.gbar[2]}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button className={`tab ${mode==='cancha'?'on':''}`} onClick={() => setMode('cancha')}>
          🎾 {t.tabPriv}
        </button>
        <button className={`tab ${mode==='open'?'on':''}`} onClick={() => setMode('open')}>
          🏓 {t.tabOpen}
          {mode!=='open' && <span className="tab-hint">↓</span>}
        </button>
      </div>

      {/* LAYOUT */}
      <div className="lay">
        {/* MAIN */}
        <div className="mc">

          {/* CANCHA PRIVADA */}
          {mode === 'cancha' && (
            <div className="fade-in">
              <p className="slbl">{t.labFecha}</p>
              {renderDateStrip(selDateIdx, i => { setSelDateIdx(i); setSelSlot(null) }, 'ds')}

              <p className="slbl">{t.labCancha}</p>
              <div className="cgrid">
                {COURTS.map((c, i) => {
                  const isAvail = courtAvailability[i]
                  const isLoading = courtAvailability[i] === null
                  return (
                    <div key={i} className={`cc ${selCourt===i?'on':''}`} onClick={() => setSelCourt(i)}>
                      <div className="cname">{lang === 'en' ? `Court ${i+1}` : c}</div>
                      <div className="cst">
                        {isLoading ? (
                          <span style={{color:'var(--gray-300)',fontSize:11}}>···</span>
                        ) : (
                          <>
                            <span className={`cdot ${isAvail ? '' : 'off'}`}/>
                            <span style={{color: isAvail ? '#5cb85c' : '#e05e3a'}}>
                              {isAvail ? t.available : t.occupied}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="slbl">{t.labHora}</p>
              <div className="slots-wrap">{renderSlots()}</div>

              <p className="slbl">{t.labDur}</p>
              <div className="dur-row">
                {Object.entries(PRICES).map(([min, price]) => (
                  <button
                    key={min}
                    className={`dc ${selDur===Number(min)?'on':''}`}
                    onClick={() => setSelDur(Number(min))}
                  >
                    {min === '60' ? '60 min' : min === '90' ? '90 min' : min === '120' ? '2 hrs' : '2.5 hrs'} · ${price}
                  </button>
                ))}
              </div>

              <p className="slbl">{t.labDatos}</p>
              <div className="fgrid">
                <input className="finp" placeholder={t.nombre} value={bkName} onChange={e => setBkName(e.target.value)} />
                <input className="finp" placeholder={t.celular} type="tel" value={bkPhone} onChange={e => setBkPhone(e.target.value)} />
              </div>
              <input className="finp" style={{marginBottom:0}} placeholder={t.correo} type="email" value={bkEmail} onChange={e => setBkEmail(e.target.value)} />

              <div className="ctarow">
                <div>
                  <div className="pbig">${PRICES[selDur]}</div>
                  <div className="pnote">
                    {lang==='es'
                      ? `$50 anticipo online · $${PRICES[selDur]-50} al llegar`
                      : `$50 deposit online · $${PRICES[selDur]-50} on arrival`}
                  </div>
                </div>
                <button className="rbtn" onClick={handleReserve} disabled={submitting}>
                  {submitting ? <Spinner /> : <>{t.reservar} ›</>}
                </button>
              </div>
            </div>
          )}

          {/* OPEN PLAY */}
          {mode === 'open' && (
            <div className="fade-in">
              <div className="opintr">
                🏓 <strong>Open Play — ${OPEN_PLAY_PRICE} MXN {lang==='es'?'por persona':'per person'} · 3 {lang==='es'?'horas':'hours'}</strong><br/>
                {t.opIntro[0]}<strong>{t.opIntro[1]}</strong>{t.opIntro[2]}
              </div>

              <div className="opopts">
                <button className={`opopt ${opMode==='join'?'on':''}`} onClick={() => setOpMode('join')}>
                  <span className="opopt-ico">🤝</span>
                  <span className="opopt-t">{t.opJoin}</span>
                  <span className="opopt-s">{t.opJoinSub}</span>
                </button>
                <button className={`opopt ${opMode==='create'?'on':''}`} onClick={() => setOpMode('create')}>
                  <span className="opopt-ico">✨</span>
                  <span className="opopt-t">{t.opCreate}</span>
                  <span className="opopt-s">{t.opCreateSub}</span>
                </button>
              </div>

              {opMode === 'join' && (
                <div>
                  <p className="slbl">{t.labFecha}</p>
                  {renderDateStrip(opDateIdx, i => { setOpDateIdx(i); setSideDateIdx(i) }, 'opds')}

                  {/* Salas del día — panel central completo */}
                  <div style={{marginTop:14}}>
                    {loadingRooms ? (
                      <div className="loading-row"><Spinner /><span style={{marginLeft:8,color:'var(--gray-500)',fontSize:12}}>Cargando salas...</span></div>
                    ) : openRooms.length === 0 ? (
                      <div style={{textAlign:'center',padding:'24px 16px',background:'var(--offwhite)',borderRadius:'var(--r)',border:'1.5px dashed var(--gray-100)'}}>
                        <div style={{fontSize:32,marginBottom:8}}>🏓</div>
                        <p style={{fontSize:13,color:'var(--gray-500)',marginBottom:6}}>{t.noRooms}</p>
                        <button className="rbtn" style={{fontSize:14,padding:'10px 20px',margin:'0 auto'}} onClick={() => setOpMode('create')}>
                          ✨ {t.opCreate}
                        </button>
                      </div>
                    ) : (
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        {openRooms.map(r => {
                          const {roomName, members} = extractRoomInfo(r)
                          const allMembers = [r.name, ...members]
                          return (
                            <div key={r.id} style={{
                              background:'var(--white)',
                              border:'1.5px solid var(--gray-100)',
                              borderRadius:'var(--r)',
                              overflow:'hidden',
                              transition:'all 0.2s',
                              cursor:'pointer',
                            }}
                            onClick={() => { setJoinRoom(r); setJoinName(''); setJoinPhone(''); setJoinEmail('') }}
                            onMouseEnter={e => e.currentTarget.style.borderColor='var(--green)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor='var(--gray-100)'}
                            >
                              {/* Header sala */}
                              <div style={{background:'var(--green)',padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                <div>
                                  <div style={{fontFamily:'var(--font-d)',fontSize:17,fontWeight:800,color:'#fff',letterSpacing:'0.5px'}}>{roomName}</div>
                                  <div style={{fontSize:11,color:'rgba(255,255,255,0.65)',marginTop:1}}>{lang==='es'?'Titular':'Host'}: {r.name}</div>
                                </div>
                                <div style={{textAlign:'right'}}>
                                  <div style={{background:'var(--lime)',color:'var(--green)',padding:'3px 10px',borderRadius:20,fontFamily:'var(--font-d)',fontSize:12,fontWeight:800}}>
                                    ⏰ {String(r.hour).padStart(2,'0')}:00
                                  </div>
                                  <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',marginTop:3}}>3 {lang==='es'?'horas':'hours'}</div>
                                </div>
                              </div>

                              {/* Body sala */}
                              <div style={{padding:'12px 14px'}}>
                                {/* Jugadores */}
                                <div style={{marginBottom:10}}>
                                  <div style={{fontSize:10,letterSpacing:'2px',color:'var(--gray-500)',textTransform:'uppercase',fontFamily:'var(--font-d)',fontWeight:700,marginBottom:7}}>
                                    {lang==='es'?'JUGADORES':'PLAYERS'} ({allMembers.length})
                                  </div>
                                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                                    {allMembers.map((m,i) => (
                                      <div key={i} style={{
                                        display:'flex',alignItems:'center',gap:5,
                                        background:'var(--lime-soft)',border:'1px solid var(--lime-bright)',
                                        borderRadius:20,padding:'4px 10px',fontSize:12,color:'var(--green)',fontWeight:500
                                      }}>
                                        <div style={{
                                          width:20,height:20,borderRadius:'50%',
                                          background:AV_COLORS[i%AV_COLORS.length],
                                          display:'flex',alignItems:'center',justifyContent:'center',
                                          fontSize:8,fontWeight:800,color:'var(--green)',flexShrink:0
                                        }}>{m.slice(0,2).toUpperCase()}</div>
                                        {m}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Precio y accion */}
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:10,borderTop:'1px solid var(--gray-100)'}}>
                                  <div>
                                    <div style={{fontFamily:'var(--font-d)',fontSize:22,fontWeight:800,color:'var(--green)'}}>
                                      ${OPEN_PLAY_PRICE} MXN
                                    </div>
                                    <div style={{fontSize:11,color:'var(--gray-500)'}}>
                                      {lang==='es'?'por persona · anticipo':'per person · deposit'} $50 MXN
                                    </div>
                                  </div>
                                  <button className="rbtn" style={{fontSize:14,padding:'10px 20px'}}
                                    onClick={e => { e.stopPropagation(); setJoinRoom(r); setJoinName(''); setJoinPhone(''); setJoinEmail('') }}>
                                    🤝 {lang==='es'?'UNIRME':'JOIN'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pikatip" style={{marginTop:14}}>
                    💬 {t.pikaFutureHint}
                  </div>
                </div>
              )}

              {opMode === 'create' && (
                <div>
                  <p className="slbl">{t.salaName}</p>
                  <input className="finp" placeholder="Ej: Lobos del Caribe 🌊" value={salaName} onChange={e => setSalaName(e.target.value)} style={{marginBottom:7}}/>
                  <p className="slbl">{t.salaHost}</p>
                  <input className="finp" placeholder={t.nombre} value={salaHost} onChange={e => setSalaHost(e.target.value)} style={{marginBottom:7}}/>
                  <div className="fgrid">
                    <input className="finp" placeholder={t.celular} type="tel" value={salaTel} onChange={e => setSalaTel(e.target.value)}/>
                    <input className="finp" placeholder={t.correo} type="email" value={salaEmail} onChange={e => setSalaEmail(e.target.value)}/>
                  </div>
                  <p className="slbl">{t.jugadores}</p>
                  <div className="ptags-wrap">
                    {players.map((p, i) => (
                      <span key={i} className="ptag">
                        {p} <span className="rm" onClick={() => setPlayers(pl => pl.filter((_,j)=>j!==i))}>×</span>
                      </span>
                    ))}
                  </div>
                  <div className="apr">
                    <input className="finp" placeholder={t.addPlayer} value={playerInput} onChange={e => setPlayerInput(e.target.value)} onKeyDown={e => e.key==='Enter' && addPlayer()}/>
                    <button className="abtn" onClick={addPlayer}>+</button>
                  </div>
                  <p className="slbl" style={{marginTop:12}}>{t.promoLabel}</p>
                  <input className="finp" placeholder={t.promoPlaceholder} value={salaPromo} onChange={e => setSalaPromo(e.target.value)} style={{marginBottom:7}}/>
                  <p className="slbl" style={{marginTop:12}}>{t.labFecha}</p>
                  {renderDateStrip(createDateIdx, i => { setCreateDateIdx(i) }, 'crds')}
                  <p className="slbl">{t.hora}</p>
                  {loadingOpenSlots ? (
                    <div className="loading-row"><Spinner /> <span style={{marginLeft:8,color:'var(--gray-500)',fontSize:12}}>Consultando...</span></div>
                  ) : (
                    <div className="slots-wrap">
                      {(() => {
                        const now = new Date()
                        const isToday = createDateIdx === 0
                        const nowMins = now.getHours() * 60 + now.getMinutes()
                        const dateIso = dates[createDateIdx].iso
                        const slots = []
                        let hasAny = false
                        for (const h of getOpenPlayStartHours(dateIso)) {
                          const slotMins = h * 60
                          if (isToday && slotMins < nowMins + 120) continue
                          if (openOccupiedSlots.has(`${h}:00`)) continue
                          hasAny = true
                          const key = `${h}:00`
                          slots.push(
                            <button
                              key={key}
                              className={`slot ${salaHour === key ? 'on' : ''}`}
                              onClick={() => setSalaHour(key)}
                            >
                              {String(h).padStart(2,'0')}:00
                            </button>
                          )
                        }
                        if (!hasAny) return (
                          <p style={{fontSize:12,color:'var(--gray-500)',fontStyle:'italic',padding:'8px 0'}}>
                            {lang==='es' ? 'No hay horarios disponibles. Prueba otro día.' : 'No slots available. Try another day.'}
                          </p>
                        )
                        return slots
                      })()}
                    </div>
                  )}

                  <div className="ctarow" style={{marginTop:12}}>
                    <div>
                      <div className="pbig" style={{fontSize:22}}>
                        ${OPEN_PLAY_PRICE * (players.length + 1)}
                        <span style={{fontSize:13,fontWeight:400}}> · {players.length + 1} {lang==='es'?'persona':'person'}{players.length > 0 ? 's' : ''}</span>
                      </div>
                      <div style={{fontSize:11,color:'var(--gray-500)'}}>
                        ${OPEN_PLAY_PRICE} × {players.length + 1} · {lang==='es'
                          ? `$50 anticipo por reserva · $${OPEN_PLAY_PRICE * (players.length + 1) - 50} al llegar en total`
                          : `$50 deposit per booking · $${OPEN_PLAY_PRICE * (players.length + 1) - 50} total on arrival`}
                      </div>
                    </div>
                    <button className="rbtn" onClick={handleCreateRoom} disabled={submitting}>
                      {submitting ? <Spinner /> : <>{t.crearSala} ›</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="sc">
          {/* Salas */}
          <div className="stitle"><LiveDot/>{t.sideTitle}</div>
          <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
            {['all',0,1,2].map((f,i) => {
              const labels = lang==='es'
                ? ['Todas','Hoy','Mañana',dates[2]?.mon+' '+dates[2]?.num]
                : ['All','Today','Tomorrow',dates[2]?.mon+' '+dates[2]?.num]
              return (
                <button key={f} onClick={() => setSideFilter(f)}
                  style={{
                    fontSize:11,padding:'4px 10px',borderRadius:20,border:'1.5px solid',
                    cursor:'pointer',fontWeight:600,
                    background: sideFilter===f ? 'var(--green)' : 'transparent',
                    color: sideFilter===f ? '#fff' : 'var(--gray-500)',
                    borderColor: sideFilter===f ? 'var(--green)' : 'var(--gray-100)',
                  }}
                >{labels[i]}</button>
              )
            })}
          </div>
          <div className="rooms-list">{renderRooms()}</div>
          <button className="crbtn" onClick={() => { setMode('open'); setOpMode('create') }}>
            {t.createRoomSide}
          </button>

          {/* PICA */}
          <div className="stitle"><LiveDot/>{t.chatTitle}</div>
          <div className="cbox">
            <div className="chdr">
              <div className="cav">P</div>
              <div className="chinfo">
                <div className="chname" style={{display:'flex',alignItems:'center',gap:6}}>
                  PICA
                  {/* Gatito kawaii */}
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="11" cy="13" rx="7" ry="6" fill="#1a1916"/>
                    <polygon points="5,8 7,3 9,8" fill="#1a1916"/>
                    <polygon points="13,8 15,3 17,8" fill="#1a1916"/>
                    <polygon points="5.5,8 7,4.5 8.5,8" fill="#d4e84a" opacity="0.7"/>
                    <polygon points="13.5,8 15,4.5 16.5,8" fill="#d4e84a" opacity="0.7"/>
                    <ellipse cx="8.5" cy="13" rx="1.8" ry="2.2" fill="#3d5a2e"/>
                    <ellipse cx="13.5" cy="13" rx="1.8" ry="2.2" fill="#3d5a2e"/>
                    <circle cx="8.5" cy="13" r="1" fill="black"/>
                    <circle cx="13.5" cy="13" r="1" fill="black"/>
                    <circle cx="9" cy="12.5" r="0.4" fill="white"/>
                    <circle cx="14" cy="12.5" r="0.4" fill="white"/>
                    <ellipse cx="11" cy="15.5" rx="1" ry="0.6" fill="#d4e84a" opacity="0.8"/>
                    <line x1="7" y1="15" x2="4" y2="14.5" stroke="#d4e84a" strokeWidth="0.5" opacity="0.6"/>
                    <line x1="7" y1="15.5" x2="4" y2="15.5" stroke="#d4e84a" strokeWidth="0.5" opacity="0.6"/>
                    <line x1="15" y1="15" x2="18" y2="14.5" stroke="#d4e84a" strokeWidth="0.5" opacity="0.6"/>
                    <line x1="15" y1="15.5" x2="18" y2="15.5" stroke="#d4e84a" strokeWidth="0.5" opacity="0.6"/>
                  </svg>
                </div>
                <div className="chsub">{t.chatSub}</div>
              </div>
              <div className="chst"/>
            </div>
            <div className="cmsgs">
              <div className="mbot">{t.chatWelcome}</div>
              <div className="pnot">{t.chatMod}</div>
              {chatMessages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'musr' : 'mbot'}>
                  {m.content}
                </div>
              ))}
              {chatLoading && <div className="mbot"><Spinner /></div>}
              <div ref={chatEndRef}/>
            </div>
            <div className="cinrow">
              <input
                className="cinp"
                placeholder={t.chatPlaceholder}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleChat()}
              />
              <button className="csend" onClick={handleChat} disabled={chatLoading}>›</button>
            </div>
          </div>

          {/* Garantia strip */}
          <div className="gstrip-side">
            <span className="gstrip-ico">🔒</span>
            <div>
              <strong>${DEPOSIT} MXN</strong> {lang==='es'?'garantiza tu espacio':'secures your spot'}<br/>
              <span style={{color:'var(--gray-500)',fontSize:11}}>
                {lang==='es'?'Pago seguro · Stripe':'Secure payment · Stripe'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL UNIRSE */}
      {joinRoom && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setJoinRoom(null)}>
          <div className="modal fade-in">
            <div className="mhdr">
              <span className="mtitle">🏓 {t.joinTitle}</span>
              <button className="mclose" onClick={() => setJoinRoom(null)}>✕</button>
            </div>
            <div className="mbody">
              {(() => {
                const { roomName, members } = extractRoomInfo(joinRoom)
                const all = [joinRoom.name, ...members]
                return <>
                  <div className="mrname">{roomName}</div>
                  <div className="mrinfo">{t.modalHost}: {joinRoom.name} · ⏰ {String(joinRoom.hour).padStart(2,'0')}:00 · {all.length} {t.spots}</div>
                  <div className="mmems">
                    <div className="mmtitle">{t.modalPlayers}</div>
                    {all.map((m,i) => (
                      <div key={i} className="mrow">
                        <div className="mav" style={{background:AV_COLORS[i%AV_COLORS.length]}}>{m.slice(0,2).toUpperCase()}</div>
                        {m}
                      </div>
                    ))}
                  </div>
                </>
              })()}
              <input className="finp" style={{marginBottom:7}} placeholder={t.nombre} value={joinName} onChange={e => setJoinName(e.target.value)}/>
              <input className="finp" style={{marginBottom:7}} placeholder={t.celular} type="tel" value={joinPhone} onChange={e => setJoinPhone(e.target.value)}/>
              <input className="finp" style={{marginBottom:11}} placeholder={t.correo} type="email" value={joinEmail} onChange={e => setJoinEmail(e.target.value)}/>
              <div className="mguar">
                <span className="mgico">🔒</span>
                <div><strong>{t.modalGuar}</strong><br/><span style={{fontSize:11}}>{t.modalGuarSub}</span></div>
              </div>
              <button className="mbtn" onClick={handleJoin} disabled={submitting}>
                {submitting ? <Spinner /> : `${t.joinBtn} ›`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div className="sov fade-in">
          <div className="sico">✓</div>
          <div className="st">{t.success}</div>
          {success.details && (
            <div style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(212,232,74,0.3)',borderRadius:12,padding:'16px 24px',width:'100%',maxWidth:340,textAlign:'left',margin:'4px 0'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{color:'var(--lime)',fontFamily:'var(--font-d)',fontSize:11,letterSpacing:2}}>
                  {success.type==='cancha'?'RESERVA DE CANCHA':'OPEN PLAY'}
                </span>
                <span style={{color:'rgba(255,255,255,0.4)',fontSize:11}}>{success.ref}</span>
              </div>
              <div style={{fontSize:13,color:'#fff',marginBottom:4}}>👤 <strong>{success.details.name}</strong></div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:2}}>📱 {success.details.phone}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:8}}>✉️ {success.details.email}</div>
              <div style={{borderTop:'1px solid rgba(255,255,255,0.1)',paddingTop:8}}>
                {success.type==='cancha' ? <>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginBottom:2}}>🎾 {success.details.court} · {success.details.time}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginBottom:2}}>📅 {success.details.date}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.8)'}}>⏱ {success.details.duration} min · <strong style={{color:'var(--lime)'}}>${success.details.price} MXN</strong></div>
                </> : <>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginBottom:2}}>🏓 {success.details.roomName}</div>
                  {success.details.court && <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginBottom:2}}>🎾 {success.details.court}</div>}
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginBottom:2}}>📅 {success.details.date} · {success.details.time}</div>
                  {success.details.promoApplied ? (
                    <div style={{fontSize:12,color:'var(--lime)'}}>🎁 {lang==='es' ? 'Código de promoción aplicado — anticipo exento' : 'Promo code applied — deposit waived'}</div>
                  ) : (
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.8)'}}>💰 <strong style={{color:'var(--lime)'}}>${success.details.price} MXN</strong> {lang==='es'?'por persona':'per person'}</div>
                  )}
                </>}
              </div>
            </div>
          )}
          <div style={{background:'rgba(212,232,74,0.1)',border:'1px solid rgba(212,232,74,0.2)',borderRadius:8,padding:'8px 16px',fontSize:12,color:'var(--lime)',maxWidth:340,textAlign:'center'}}>
            🔒 {lang==='es'?'Depósito $50 MXN · 10 min de tolerancia para llegar':'$50 MXN deposit · 10 min grace period'}
          </div>
          <p className="ss">{t.successSub}</p>
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button
              onClick={() => downloadBookingPDF(success, lang)}
              style={{
                background:'var(--lime)',color:'var(--green)',border:'none',
                borderRadius:'var(--rs)',padding:'10px 20px',
                fontFamily:'var(--font-d)',fontSize:16,fontWeight:800,
                letterSpacing:'1px',cursor:'pointer',display:'flex',
                alignItems:'center',gap:6
              }}
            >
              ⬇ {lang==='es'?'DESCARGAR COMPROBANTE':'DOWNLOAD RECEIPT'}
            </button>
            <button className="dis" onClick={resetSuccess}>{t.backHome}</button>
          </div>
        </div>
      )}
    </div>
  )
}
