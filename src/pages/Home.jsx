import { useState, useEffect, useRef, useCallback } from 'react'
import {
  supabase, COURTS, PRICES, OPEN_PLAY_PRICE, DEPOSIT,
  getOccupiedSlots, getOpenPlayRooms,
  createPublicBooking, createOpenPlayRoom, joinOpenPlayRoom
} from '../lib/supabase'
import { usePika } from '../hooks/usePika'


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
    hora: 'Hora',
    crearSala: 'CREAR SALA',
    joinTitle: 'UNIRSE A SALA',
    joinBtn: 'UNIRME Y GARANTIZAR ESPACIO',
    sideTitle: 'SALAS OPEN PLAY',
    chatTitle: 'PIKA · ASISTENTE 24/7',
    chatSub: 'Acceso al calendario completo · Puede hacer reservas',
    chatWelcome: '¡Hola! 👋 Soy PIKA, tu asistente de PICABOL. Tengo acceso al calendario completo — puedo consultarte disponibilidad en cualquier fecha y hacer reservas por ti. ¿En qué te ayudo?',
    chatMod: '💡 ¿Ya tienes reserva? Dime y yo hago cualquier cambio por ti',
    chatPlaceholder: 'Escribe a PIKA...',
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
    pikaFutureHint: '¿Quieres reservar en otra fecha? Escríbele a PIKA — puede revisar el calendario y reservar en cualquier fecha disponible.',
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
    hora: 'Time',
    crearSala: 'CREATE ROOM',
    joinTitle: 'JOIN ROOM',
    joinBtn: 'JOIN & SECURE MY SPOT',
    sideTitle: 'OPEN PLAY ROOMS',
    chatTitle: 'PIKA · 24/7 ASSISTANT',
    chatSub: 'Full calendar access · Can make bookings',
    chatWelcome: 'Hi! 👋 I\'m PIKA, your PICABOL assistant. I have full calendar access — I can check availability on any date and make bookings for you. How can I help?',
    chatMod: '💡 Already have a booking? Tell me and I\'ll make any changes for you',
    chatPlaceholder: 'Message PIKA...',
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
    pikaFutureHint: 'Want to book for a different date? Message PIKA — she can check the calendar and book any available date.',
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
    return {
      label: t.days[i],
      num: d.getDate(),
      mon: t.months[d.getMonth()],
      iso: d.toISOString().split('T')[0]
    }
  })
}

function formatRef() {
  return 'PBL-' + Date.now().toString().slice(-6)
}

function extractRoomInfo(booking) {
  const notes = booking.notes || ''
  const salaMatch = notes.match(/Sala: ([^|]+)/)
  const roomName = salaMatch ? salaMatch[1].trim() : `Open Play ${booking.court}`
  const membersMatch = notes.match(/Miembros: ([^|]+)/)
  const membersRaw = membersMatch ? membersMatch[1].trim() : ''
  const members = membersRaw ? membersRaw.split(',').map(m => m.trim()).filter(Boolean) : []
  return { roomName, members }
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

  // Cancha privada
  const [selCourt, setSelCourt] = useState(0)
  const [selSlot, setSelSlot] = useState(null)
  const [selDur, setSelDur] = useState(60)
  const [occupiedSlots, setOccupiedSlots] = useState(new Set())
  const [loadingSlots, setLoadingSlots] = useState(false)
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
  const [players, setPlayers] = useState([])
  const [playerInput, setPlayerInput] = useState('')

  // Modal unirse
  const [joinRoom, setJoinRoom] = useState(null)
  const [joinName, setJoinName] = useState('')
  const [joinPhone, setJoinPhone] = useState('')
  const [joinEmail, setJoinEmail] = useState('')

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null) // { ref, type }
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

  useEffect(() => {
    loadSlots()
  }, [selDateIdx, selCourt])

  useEffect(() => {
    loadRooms()
  }, [sideDateIdx])

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

  async function loadRooms() {
    setLoadingRooms(true)
    try {
      const rooms = await getOpenPlayRooms(dates[sideDateIdx]?.iso || dates[0].iso)
      setOpenRooms(rooms)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRooms(false)
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function setLang(l) {
    setLangState(l)
    document.documentElement.lang = l
  }

  async function handleReserve() {
    if (!bkName || !bkPhone || !bkEmail || !selSlot) {
      alert(lang === 'es' ? 'Completa todos los campos y selecciona un horario' : 'Fill all fields and select a time slot')
      return
    }
    setSubmitting(true)
    try {
      const [h, m] = selSlot.split(':').map(Number)
      await createPublicBooking({
        date: dates[selDateIdx].iso,
        hour: h,
        startMinute: m,
        court: COURTS[selCourt],
        duration: selDur,
        name: bkName,
        phone: bkPhone,
        email: bkEmail,
      })
      setSuccess({ ref: formatRef(), type: 'cancha' })
    } catch (e) {
      alert(lang === 'es' ? 'Error al crear la reserva. Intenta de nuevo.' : 'Booking error. Please try again.')
      console.error(e)
    } finally {
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
      await createOpenPlayRoom({
        date: dates[createDateIdx].iso,
        hour: h,
        court: COURTS[0], // Primera cancha disponible, ajustable
        roomName: salaName,
        hostName: salaHost,
        phone: salaTel,
        email: salaEmail,
        members: players,
      })
      setSuccess({ ref: formatRef(), type: 'open' })
      setSideDateIdx(createDateIdx)
      setTimeout(loadRooms, 500)
    } catch (e) {
      alert(lang === 'es' ? 'Error al crear la sala.' : 'Error creating room.')
      console.error(e)
    } finally {
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
      await joinOpenPlayRoom(joinRoom.id, joinName, joinPhone, joinEmail)
      setJoinRoom(null)
      setSuccess({ ref: formatRef(), type: 'open' })
      setTimeout(loadRooms, 500)
    } catch (e) {
      alert(lang === 'es' ? 'Error al unirse.' : 'Error joining room.')
      console.error(e)
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
    const slots = []
    for (let h = 8; h <= 22; h++) {
      for (const m of ['00', '30']) {
        if (h === 22 && m === '30') continue
        const key = `${h}:${m}`
        const taken = occupiedSlots.has(key)
        slots.push(
          <button
            key={key}
            className={`slot ${taken ? 'tk' : ''} ${selSlot === key && !taken ? 'on' : ''}`}
            onClick={() => !taken && setSelSlot(key)}
            disabled={taken}
          >
            {String(h).padStart(2,'0')}:{m}
          </button>
        )
      }
    }
    return slots
  }

  function renderRooms() {
    if (loadingRooms) return <div className="loading-row"><Spinner /></div>
    if (!openRooms.length) return <p className="no-rooms">{t.noRooms}</p>
    return openRooms.map(r => {
      const { roomName, members } = extractRoomInfo(r)
      const allMembers = [r.name, ...members]
      return (
        <div key={r.id} className="rcard" onClick={() => { setJoinRoom(r); setJoinName(''); setJoinPhone(''); setJoinEmail('') }}>
          <div className="rtop">
            <div>
              <div className="rname">{roomName}</div>
              <div className="rhost">{t.host}: {r.name}</div>
            </div>
            <span className="rtime">⏰ {String(r.hour).padStart(2,'0')}:00</span>
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
            <button className="jbtn" onClick={e => { e.stopPropagation(); setJoinRoom(r); setJoinName(''); setJoinPhone(''); setJoinEmail('') }}>
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
                {COURTS.map((c, i) => (
                  <div key={i} className={`cc ${selCourt===i?'on':''}`} onClick={() => setSelCourt(i)}>
                    <div className="cname">{c}</div>
                    <div className="cst">
                      <span className={`cdot ${selCourt===i?'':'off'}`}/>
                      {selCourt===i ? t.available : '—'}
                    </div>
                  </div>
                ))}
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
                  <div className="pnote">{t.deposit}</div>
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
                  <p className="joinhint">{t.joinHint}</p>
                  <div className="pikatip">
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
                  <p className="slbl" style={{marginTop:12}}>{t.labFecha}</p>
                  {renderDateStrip(createDateIdx, setCreateDateIdx, 'crds')}
                  <p className="slbl">{t.hora}</p>
                  <select className="finp" style={{width:'auto'}} value={salaHour} onChange={e => setSalaHour(e.target.value)}>
                    {Array.from({length:15},(_,i)=>i+8).map(h=>(
                      <option key={h} value={`${h}:00`}>{String(h).padStart(2,'0')}:00</option>
                    ))}
                  </select>

                  <div className="ctarow" style={{marginTop:12}}>
                    <div>
                      <div className="pbig" style={{fontSize:22}}>${OPEN_PLAY_PRICE} <span style={{fontSize:13,fontWeight:400}}>/{lang==='es'?'persona':'person'}</span></div>
                      <div className="pnote">{t.deposit}</div>
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
          {renderDateStrip(sideDateIdx, i => setSideDateIdx(i), 'sds')}
          <div style={{marginBottom:10}}/>
          <div className="rooms-list">{renderRooms()}</div>
          <button className="crbtn" onClick={() => { setMode('open'); setOpMode('create') }}>
            {t.createRoomSide}
          </button>

          {/* PIKA */}
          <div className="stitle"><LiveDot/>{t.chatTitle}</div>
          <div className="cbox">
            <div className="chdr">
              <div className="cav">P</div>
              <div className="chinfo">
                <div className="chname">PIKA</div>
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
          <p className="ss">{t.successSub}</p>
          <p className="ss" style={{fontSize:12,marginTop:4}}>{t.successNote}</p>
          <div className="sref">{success.ref}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:4}}>
            {lang==='es'?'Esta reserva proviene del sitio web público':'This booking came from the public website'}
          </div>
          <button className="dis" onClick={resetSuccess}>{t.backHome}</button>
        </div>
      )}
    </div>
  )
}
