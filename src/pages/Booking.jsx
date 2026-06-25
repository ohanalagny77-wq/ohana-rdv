import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const STEPS = ['Prestation', 'Date & heure', 'Vos infos', 'Confirmation']

const WORKING_DAYS = [1, 2, 3, 4, 5, 6] // lundi à samedi (0=dimanche)
const OPENING_HOUR = 9
const CLOSING_HOUR = 19 // dernier créneau à 19h, séance se termine à 20h

function generateDays(numDays = 28) {
  const days = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < numDays + 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    if (WORKING_DAYS.includes(d.getDay())) days.push(d)
    if (days.length >= numDays) break
  }
  return days
}

function generateSlots(durationMin) {
  const slots = []
  for (let h = OPENING_HOUR; h <= CLOSING_HOUR; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

function formatDay(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDayLong(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function isSlotBusy(date, slotTime, busyRanges, durationMin) {
  const [h] = slotTime.split(':').map(Number)
  const slotStart = new Date(date)
  slotStart.setHours(h, 0, 0, 0)
  const slotEnd = new Date(slotStart.getTime() + durationMin * 60000)
  return busyRanges.some(range => {
    const busyStart = new Date(range.start)
    const busyEnd = new Date(range.end)
    return slotStart < busyEnd && slotEnd > busyStart
  })
}

function priceFor(service, tarifType, format) {
  if (format === 'visio') return service.price_visio
  if (tarifType === 'enfant') return service.price_child
  if (tarifType === 'animal') return service.price_animal
  return service.price_adult
}

export default function Booking() {
  const { therapistId } = useParams()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [therapist, setTherapist] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedService, setSelectedService] = useState(null)
  const [tarifType, setTarifType] = useState('adulte')
  const [format, setFormat] = useState('cabinet')
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [busyRanges, setBusyRanges] = useState([])
  const [loadingBusy, setLoadingBusy] = useState(false)
  const [bookingResult, setBookingResult] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase
        .from('therapists')
        .select('*')
        .eq('id', therapistId)
        .single()
      const { data: s } = await supabase
        .from('services')
        .select('*')
        .eq('therapist_id', therapistId)
        .eq('active', true)
        .order('name')
      setTherapist(t)
      setServices(s || [])
      setLoading(false)
    }
    load()
  }, [therapistId])

  useEffect(() => {
    if (step !== 1) return
    async function loadBusy() {
      setLoadingBusy(true)
      try {
        const days = generateDays()
        const timeMin = days[0].toISOString()
        const last = new Date(days[days.length - 1])
        last.setDate(last.getDate() + 1)
        const timeMax = last.toISOString()
        const res = await fetch(`/api/google-freebusy?therapistId=${therapistId}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
        const data = await res.json()
        setBusyRanges(data.busy || [])
      } catch (e) {
        setBusyRanges([])
      }
      setLoadingBusy(false)
    }
    loadBusy()
  }, [step, therapistId])

  function goTo(s) { setStep(s); window.scrollTo(0, 0) }

  if (loading) return <div className="loading">Chargement…</div>
  if (!therapist) return <div className="loading">Thérapeute introuvable.</div>

  const days = generateDays()
  const slots = selectedService ? generateSlots(selectedService.duration_minutes) : []
  const price = selectedService ? priceFor(selectedService, tarifType, format) : null

  return (
    <div className="app-container">
      <header className="ohana-header">
        <img src="/logo.jpg" alt="Logo Ohana" className="ohana-logo" />
        <div>
          <h1>OHANA</h1>
          <p>Rendez-vous avec {therapist.name}</p>
        </div>
      </header>

      <nav className="step-nav">
        {STEPS.map((label, i) => (
          <div className="step-item" key={label}>
            <div className={`step-dot ${i < step ? 'done' : i === step ? 'active' : 'todo'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`step-label ${i === step ? 'active' : ''}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="step-sep" />}
          </div>
        ))}
      </nav>

      {step === 0 && (
        <ServiceStep
          therapist={therapist}
          services={services}
          selectedService={selectedService}
          tarifType={tarifType}
          format={format}
          onPickService={s => { setSelectedService(s); setSelectedDay(null); setSelectedSlot(null) }}
          onTarifChange={setTarifType}
          onFormatChange={setFormat}
          onBack={() => navigate('/')}
          onNext={() => goTo(1)}
        />
      )}

      {step === 1 && (
        <DateTimeStep
          days={days}
          slots={slots}
          busyRanges={busyRanges}
          loadingBusy={loadingBusy}
          selectedDay={selectedDay}
          selectedSlot={selectedSlot}
          durationMin={selectedService?.duration_minutes || 60}
          onDayChange={d => { setSelectedDay(d); setSelectedSlot(null) }}
          onSlotChange={setSelectedSlot}
          onBack={() => goTo(0)}
          onNext={() => goTo(2)}
        />
      )}

      {step === 2 && (
        <ClientInfoStep
          therapist={therapist}
          service={selectedService}
          tarifType={tarifType}
          format={format}
          selectedDay={selectedDay}
          selectedSlot={selectedSlot}
          price={price}
          onBack={() => goTo(1)}
          onSuccess={result => { setBookingResult(result); goTo(3) }}
        />
      )}

      {step === 3 && (
        <ConfirmationStep
          bookingResult={bookingResult}
          therapist={therapist}
          onNewBooking={() => navigate('/')}
        />
      )}
    </div>
  )
}

function ServiceStep({ therapist, services, selectedService, tarifType, format, onPickService, onTarifChange, onFormatChange, onBack, onNext }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Choisissez une prestation</h2>
        <p>{therapist.name}</p>
      </div>
      <div className="card-body">
        <button className="btn-back" onClick={onBack}>← Retour</button>

        <p className="section-label">Prestations disponibles</p>
        {services.map(s => (
          <div key={s.id} className={`selectable ${selectedService?.id === s.id ? 'selected' : ''}`}
            onClick={() => onPickService(s)}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="selectable-dot" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: selectedService?.id === s.id ? 'var(--ohana-wood)' : 'var(--ohana-text)' }}>{s.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--ohana-muted)' }}>{s.duration_minutes} min</div>
              </div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: selectedService?.id === s.id ? 'var(--ohana-gold)' : 'var(--ohana-muted)' }}>
              {format === 'visio' ? s.price_visio : tarifType === 'enfant' ? s.price_child : tarifType === 'animal' ? s.price_animal : s.price_adult} €
            </div>
          </div>
        ))}

        {selectedService && (
          <>
            <p className="section-label" style={{ marginTop: '1rem' }}>Tarif</p>
            <div className="toggle-group">
              <button className={`toggle-btn ${tarifType === 'adulte' ? 'selected' : ''}`} onClick={() => onTarifChange('adulte')}>Adulte</button>
              {selectedService.price_child != null && (
                <button className={`toggle-btn ${tarifType === 'enfant' ? 'selected' : ''}`} onClick={() => onTarifChange('enfant')}>Enfant</button>
              )}
              {selectedService.price_animal != null && (
                <button className={`toggle-btn ${tarifType === 'animal' ? 'selected' : ''}`} onClick={() => onTarifChange('animal')}>Animal</button>
              )}
            </div>
          </>
        )}

        <p className="section-label">Format de séance</p>
        <div className="toggle-group">
          <button className={`toggle-btn ${format === 'cabinet' ? 'selected' : ''}`} onClick={() => onFormatChange('cabinet')}>🏠 Cabinet</button>
          <button className={`toggle-btn ${format === 'visio' ? 'selected' : ''}`} onClick={() => onFormatChange('visio')}>🎥 Visio</button>
        </div>
        <div className={`info-note ${format === 'visio' ? 'gold' : ''}`}>
          {format === 'visio'
            ? '📹 Séance en visio : le paiement en ligne est requis pour confirmer votre réservation. Le lien de connexion vous sera envoyé par email.'
            : '🏠 Au cabinet : vous pouvez régler en espèces, par carte ou en ligne le jour de la séance.'}
        </div>

        <button className="btn-primary" disabled={!selectedService} onClick={onNext}>
          Choisir une date →
        </button>
      </div>
    </div>
  )
}

function DateTimeStep({ days, slots, busyRanges, loadingBusy, selectedDay, selectedSlot, durationMin, onDayChange, onSlotChange, onBack, onNext }) {
  const activeDay = selectedDay || days[0]

  return (
    <div className="card">
      <div className="card-header">
        <h2>Choisissez votre créneau</h2>
        <p>Les créneaux grisés sont déjà réservés</p>
      </div>
      <div className="card-body">
        <button className="btn-back" onClick={onBack}>← Retour</button>

        <p className="section-label">Date</p>
        <div className="day-scroll">
          {days.map(day => (
            <button key={day.toISOString()}
              className={`day-chip ${activeDay.toDateString() === day.toDateString() ? 'selected' : ''}`}
              onClick={() => onDayChange(day)}>
              {formatDay(day)}
            </button>
          ))}
        </div>

        <p className="section-label">Créneaux — {formatDay(activeDay)}</p>
        {loadingBusy ? (
          <div className="info-note">Vérification des disponibilités…</div>
        ) : (
          <div className="slots-grid">
            {slots.map(slot => {
              const busy = isSlotBusy(activeDay, slot, busyRanges, durationMin)
              const isSelected = selectedSlot === slot && selectedDay?.toDateString() === activeDay.toDateString()
              return (
                <button key={slot}
                  className={`slot-btn ${busy ? 'taken' : ''} ${isSelected ? 'selected' : ''}`}
                  disabled={busy}
                  onClick={() => { onDayChange(activeDay); onSlotChange(slot) }}>
                  {slot}
                </button>
              )
            })}
          </div>
        )}

        <button className="btn-primary" disabled={!selectedSlot} onClick={onNext}>
          Continuer →
        </button>
      </div>
    </div>
  )
}

function ClientInfoStep({ therapist, service, tarifType, format, selectedDay, selectedSlot, price, onBack, onSuccess }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [paymentMethod, setPaymentMethod] = useState(format === 'visio' ? 'online' : 'especes')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.firstName || !form.lastName || !form.email) {
      setError('Veuillez remplir tous les champs obligatoires.')
      return
    }
    setSaving(true)
    setError(null)

    const bookingDate = selectedDay.toISOString().split('T')[0]
    const bookingTime = selectedSlot + ':00'

    const { data, error: dbError } = await supabase
      .from('bookings')
      .insert({
        therapist_id: therapist.id,
        service_id: service.id,
        client_first_name: form.firstName,
        client_last_name: form.lastName,
        client_email: form.email,
        client_phone: form.phone,
        tarif_type: tarifType,
        format,
        booking_date: bookingDate,
        booking_time: bookingTime,
        price,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'online' ? 'pending' : 'pending',
        status: 'confirmed',
      })
      .select()
      .single()

    if (dbError) {
      setError('Une erreur est survenue. Veuillez réessayer.')
      setSaving(false)
      return
    }

    onSuccess(data)
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Vos coordonnées</h2>
        <p>Plus qu'une étape pour confirmer votre séance</p>
      </div>
      <div className="card-body">
        <button className="btn-back" onClick={onBack}>← Retour</button>

        <div className="recap-box" style={{ marginBottom: '1.25rem' }}>
          <div className="recap-row"><span className="rl">Thérapeute</span><span className="rv">{therapist.name}</span></div>
          <div className="recap-row"><span className="rl">Prestation</span><span className="rv">{service.name} · {tarifType}</span></div>
          <div className="recap-row"><span className="rl">Format</span><span className="rv">{format === 'visio' ? 'Visio' : 'Cabinet'}</span></div>
          <div className="recap-row"><span className="rl">Date &amp; heure</span><span className="rv">{formatDayLong(selectedDay)} à {selectedSlot}</span></div>
          <div className="recap-total"><span>Total</span><span>{price} €</span></div>
        </div>

        <div className="form-grid-2" style={{ marginBottom: '10px' }}>
          <div className="form-group">
            <label>Prénom *</label>
            <input className="form-input" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Prénom" />
          </div>
          <div className="form-group">
            <label>Nom *</label>
            <input className="form-input" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Nom" />
          </div>
        </div>
        <div className="form-group">
          <label>Email *</label>
          <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="votre@email.fr" />
        </div>
        <div className="form-group">
          <label>Téléphone</label>
          <input className="form-input" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="06 XX XX XX XX" />
        </div>

        <p className="section-label" style={{ marginTop: '1rem' }}>Mode de règlement</p>
        {format === 'visio' ? (
          <div className="info-note gold">
            💳 Le paiement en ligne est requis pour les séances en visio. Vous serez redirigée vers notre interface de paiement sécurisé après confirmation.
          </div>
        ) : (
          <div className="toggle-group" style={{ flexDirection: 'column' }}>
            <button className={`toggle-btn ${paymentMethod === 'especes' ? 'selected' : ''}`} onClick={() => setPaymentMethod('especes')}>
              💵 Espèces ou carte le jour de la séance
            </button>
            <button className={`toggle-btn ${paymentMethod === 'online' ? 'selected' : ''}`} onClick={() => setPaymentMethod('online')}>
              💳 Payer en ligne maintenant
            </button>
          </div>
        )}

        {error && <p style={{ color: 'var(--ohana-error)', fontSize: '12px', marginBottom: '10px' }}>{error}</p>}

        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Confirmation en cours…' : paymentMethod === 'online' ? `Payer ${price} € et confirmer` : 'Confirmer ma réservation'}
        </button>

        <p className="footer-note">
          🔒 Vos données sont sécurisées · Un email de confirmation vous sera envoyé<br />
          🔔 Rappel automatique la veille avec lien de modification
        </p>
      </div>
    </div>
  )
}

function ConfirmationStep({ bookingResult, therapist, onNewBooking }) {
  return (
    <div className="card">
      <div className="card-header" style={{ background: '#E8F8F2', borderColor: '#A8D8C4' }}>
        <h2 style={{ color: 'var(--ohana-success)' }}>✓ Réservation confirmée !</h2>
        <p>Un email de confirmation vous a été envoyé</p>
      </div>
      <div className="card-body">
        <div className="recap-box">
          <div className="recap-row"><span className="rl">Numéro de réservation</span><span className="rv" style={{ fontSize: '10px' }}>{bookingResult?.id?.slice(0, 8).toUpperCase()}</span></div>
          <div className="recap-row"><span className="rl">Thérapeute</span><span className="rv">{therapist.name}</span></div>
        </div>
        <div className="info-note gold" style={{ marginBottom: '1rem' }}>
          🔔 Vous recevrez un rappel par email la veille de votre séance avec un lien pour modifier ou annuler si nécessaire.
        </div>
        <button className="btn-primary" onClick={onNewBooking}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  )
}
