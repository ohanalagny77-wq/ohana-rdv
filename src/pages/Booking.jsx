import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './Booking.css'

const STEPS = ['Thérapeute', 'Prestation', 'Date & heure', 'Paiement']

export default function Booking() {
  const [step, setStep] = useState(0)
  const [therapists, setTherapists] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  // Sélections du client
  const [selectedTherapist, setSelectedTherapist] = useState(null) // null, 'unknown', ou objet thérapeute
  const [selectedService, setSelectedService] = useState(null)
  const [tarifType, setTarifType] = useState('adulte')
  const [format, setFormat] = useState('cabinet')
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)

  useEffect(() => {
    async function loadData() {
      const { data: therapistsData } = await supabase
        .from('therapists')
        .select('*')
        .order('name')

      const { data: servicesData } = await supabase
        .from('services')
        .select('*, therapists(name)')
        .eq('active', true)

      setTherapists(therapistsData || [])
      setServices(servicesData || [])
      setLoading(false)
    }
    loadData()
  }, [])

  function goTo(newStep) {
    setStep(newStep)
  }

  function handlePickTherapist(therapist) {
    setSelectedTherapist(therapist)
    setSelectedService(null)
  }

  function handlePickService(service) {
    setSelectedService(service)
  }

  // Filtrer les prestations selon la thérapeute choisie
  const visibleServices = selectedTherapist === 'unknown'
    ? services
    : selectedTherapist
      ? services.filter(s => s.therapist_id === selectedTherapist.id)
      : []

  if (loading) {
    return <div className="booking-loading">Chargement…</div>
  }

  return (
    <div className="booking-page">
      <header className="ohana-header">
        <img src="/logo.jpg" alt="Logo Ohana" className="ohana-logo" />
        <div>
          <h1>OHANA</h1>
          <p>Bien-être &amp; thérapies · Lagny-sur-Marne</p>
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
        <TherapistStep
          therapists={therapists}
          selected={selectedTherapist}
          onPick={handlePickTherapist}
          onNext={() => goTo(1)}
        />
      )}

      {step === 1 && (
        <ServiceStep
          showTherapistName={selectedTherapist === 'unknown'}
          services={visibleServices}
          selectedService={selectedService}
          tarifType={tarifType}
          format={format}
          onPickService={handlePickService}
          onTarifChange={setTarifType}
          onFormatChange={setFormat}
          onBack={() => goTo(0)}
          onNext={() => goTo(2)}
        />
      )}

      {step === 2 && (
        <DateTimeStep
          therapist={selectedTherapist}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          onSelect={(date, slot) => { setSelectedDate(date); setSelectedSlot(slot) }}
          onBack={() => goTo(1)}
          onNext={() => goTo(3)}
        />
      )}

      {step === 3 && (
        <PaymentStep
          therapist={selectedTherapist}
          service={selectedService}
          tarifType={tarifType}
          format={format}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          onBack={() => goTo(2)}
        />
      )}
    </div>
  )
}

function TherapistStep({ therapists, selected, onPick, onNext }) {
  const canContinue = selected !== null
  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Avec qui souhaitez-vous travailler ?</h2>
        <p>Choisissez votre thérapeute ou laissez-vous guider</p>
      </div>
      <div className="screen-body">
        <p className="section-label">Nos thérapeutes</p>
        <div className="thera-cards">
          {therapists.map(t => (
            <div
              key={t.id}
              className={`thera-card ${selected?.id === t.id ? 'selected' : ''}`}
              onClick={() => onPick(t)}
            >
              <div className="thera-avatar">
                {t.photo_url
                  ? <img src={t.photo_url} alt={t.name} />
                  : <span className="thera-avatar-placeholder">{t.name[0]}</span>}
              </div>
              <div className="thera-name">{t.name}</div>
              {t.bio && <div className="thera-desc">{t.bio}</div>}
            </div>
          ))}
          <div
            className={`thera-card unknown ${selected === 'unknown' ? 'selected' : ''}`}
            onClick={() => onPick('unknown')}
          >
            <div className="thera-avatar thera-avatar-placeholder">?</div>
            <div>
              <div className="thera-name">Je ne sais pas encore</div>
              <div className="thera-desc">On vous propose toutes les prestations et vous choisissez selon vos besoins</div>
            </div>
          </div>
        </div>
        <button className="cta" disabled={!canContinue} onClick={onNext}>
          Choisir une prestation →
        </button>
      </div>
    </div>
  )
}

function ServiceStep({ services, selectedService, tarifType, format, onPickService, onTarifChange, onFormatChange, onBack, onNext, showTherapistName }) {
  const canContinue = selectedService !== null

  function priceFor(service) {
    if (format === 'visio') return service.price_visio
    if (tarifType === 'enfant') return service.price_child
    if (tarifType === 'animal') return service.price_animal
    return service.price_adult
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Quelle prestation vous intéresse ?</h2>
        <p>Sélectionnez une prestation puis votre tarif</p>
      </div>
      <div className="screen-body">
        <button className="back-btn" onClick={onBack}>← Retour</button>

        <p className="section-label">Prestations disponibles</p>
        <div className="presta-list">
          {services.map(s => (
            <div
              key={s.id}
              className={`presta-row ${selectedService?.id === s.id ? 'selected' : ''}`}
              onClick={() => onPickService(s)}
            >
              <div className="presta-left">
                <div className="presta-dot" />
                <div>
                  <div className="p-name">{s.name}</div>
                  <div className="p-sub">
                    {showTherapistName ? s.therapists?.name : `${s.duration_minutes} min`}
                  </div>
                </div>
              </div>
              <div className="presta-right">{priceFor(s)} €</div>
            </div>
          ))}
          {services.length === 0 && (
            <p className="empty-note">Aucune prestation disponible pour le moment.</p>
          )}
        </div>

        {selectedService && (
          <>
            <p className="section-label">Tarif</p>
            <div className="tarif-row">
              <button
                className={`tarif-btn ${tarifType === 'adulte' ? 'selected' : ''}`}
                onClick={() => onTarifChange('adulte')}
              >Adulte</button>
              {selectedService.price_child != null && (
                <button
                  className={`tarif-btn ${tarifType === 'enfant' ? 'selected' : ''}`}
                  onClick={() => onTarifChange('enfant')}
                >Enfant</button>
              )}
              {selectedService.price_animal != null && (
                <button
                  className={`tarif-btn ${tarifType === 'animal' ? 'selected' : ''}`}
                  onClick={() => onTarifChange('animal')}
                >Animal</button>
              )}
            </div>
          </>
        )}

        <p className="section-label">Format de séance</p>
        <div className="format-row">
          <button
            className={`format-btn ${format === 'cabinet' ? 'selected' : ''}`}
            onClick={() => onFormatChange('cabinet')}
          >🏠 Cabinet</button>
          <button
            className={`format-btn ${format === 'visio' ? 'selected' : ''}`}
            onClick={() => onFormatChange('visio')}
          >🎥 Visio</button>
        </div>
        <div className={`format-note ${format === 'visio' ? 'visio-note' : ''}`}>
          {format === 'visio'
            ? 'Séance en visio : le paiement en ligne est obligatoire pour confirmer votre réservation.'
            : 'Au cabinet, vous pouvez régler en espèces ou par carte le jour de la séance.'}
        </div>

        <button className="cta" disabled={!canContinue} onClick={onNext}>
          Choisir une date →
        </button>
      </div>
    </div>
  )
}

// Horaires d'ouverture par défaut (modifiable plus tard en admin)
const OPENING_HOURS = { start: 9, end: 18 } // 9h à 18h
const SLOT_DURATION_MIN = 60 // créneaux toutes les heures, ajustable

function generateDays(numDays = 21) {
  const days = []
  const today = new Date()
  for (let i = 0; i < numDays; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    // On exclut le dimanche (0) — à ajuster selon les jours d'ouverture réels
    if (d.getDay() !== 0) {
      days.push(d)
    }
  }
  return days
}

function generateSlots() {
  const slots = []
  for (let h = OPENING_HOURS.start; h < OPENING_HOURS.end; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

function formatDayLabel(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isSlotBusy(date, slotTime, busyRanges) {
  const [h, m] = slotTime.split(':').map(Number)
  const slotStart = new Date(date)
  slotStart.setHours(h, m, 0, 0)
  const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MIN * 60000)

  return busyRanges.some(range => {
    const busyStart = new Date(range.start)
    const busyEnd = new Date(range.end)
    return slotStart < busyEnd && slotEnd > busyStart
  })
}

function DateTimeStep({ therapist, onBack, onNext, onSelect, selectedDate, selectedSlot }) {
  const [days] = useState(generateDays())
  const [busyRanges, setBusyRanges] = useState([])
  const [loadingBusy, setLoadingBusy] = useState(false)
  const [activeDay, setActiveDay] = useState(selectedDate || days[0])

  const slots = generateSlots()
  const therapistId = therapist === 'unknown' ? null : therapist?.id

  useEffect(() => {
    if (!therapistId) {
      setBusyRanges([])
      return
    }
    async function loadBusy() {
      setLoadingBusy(true)
      try {
        const timeMin = days[0].toISOString()
        const timeMax = new Date(days[days.length - 1].getTime() + 86400000).toISOString()
        const res = await fetch(
          `/api/google-freebusy?therapistId=${therapistId}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
        )
        const data = await res.json()
        setBusyRanges(data.busy || [])
      } catch (err) {
        console.error('Erreur chargement disponibilités', err)
        setBusyRanges([])
      }
      setLoadingBusy(false)
    }
    loadBusy()
  }, [therapistId])

  function handleDayClick(day) {
    setActiveDay(day)
  }

  function handleSlotClick(slotTime) {
    onSelect(activeDay, slotTime)
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Choisissez votre créneau</h2>
        <p>{therapist === 'unknown' ? 'Selon disponibilités' : therapist?.name}</p>
      </div>
      <div className="screen-body">
        <button className="back-btn" onClick={onBack}>← Retour</button>

        <p className="section-label">Date</p>
        <div className="day-scroll">
          {days.map(day => (
            <button
              key={day.toISOString()}
              className={`day-chip ${activeDay.toDateString() === day.toDateString() ? 'selected' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              {formatDayLabel(day)}
            </button>
          ))}
        </div>

        <p className="section-label">Créneaux — {formatDayLabel(activeDay)}</p>
        {loadingBusy ? (
          <p className="empty-note">Vérification des disponibilités…</p>
        ) : (
          <div className="slots">
            {slots.map(slotTime => {
              const busy = isSlotBusy(activeDay, slotTime, busyRanges)
              const isSelected = selectedSlot === slotTime && selectedDate?.toDateString() === activeDay.toDateString()
              return (
                <button
                  key={slotTime}
                  className={`slot ${busy ? 'taken' : ''} ${isSelected ? 'selected' : ''}`}
                  disabled={busy}
                  onClick={() => handleSlotClick(slotTime)}
                >
                  {slotTime}
                </button>
              )
            })}
          </div>
        )}
        {!therapistId && (
          <p className="empty-note">ℹ️ Comme vous n'avez pas encore choisi de thérapeute précise, les créneaux affichés sont indicatifs — la disponibilité réelle sera confirmée après votre choix de prestation.</p>
        )}

        <button className="cta" disabled={!selectedSlot} onClick={onNext}>
          Voir le récapitulatif →
        </button>
      </div>
    </div>
  )
}

function PaymentStep({ therapist, service, tarifType, format, selectedDate, selectedSlot, onBack }) {
  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'
  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Récapitulatif &amp; confirmation</h2>
        <p>Vérifiez les informations avant de valider</p>
      </div>
      <div className="screen-body">
        <button className="back-btn" onClick={onBack}>← Retour</button>
        <div className="recap">
          <div className="recap-row"><span className="rl">Thérapeute</span><span className="rv">{therapist === 'unknown' ? 'À déterminer' : therapist?.name}</span></div>
          <div className="recap-row"><span className="rl">Prestation</span><span className="rv">{service?.name} · {tarifType}</span></div>
          <div className="recap-row"><span className="rl">Format</span><span className="rv">{format === 'visio' ? 'Visio' : 'Cabinet'}</span></div>
          <div className="recap-row"><span className="rl">Date &amp; heure</span><span className="rv">{dateLabel} à {selectedSlot}</span></div>
        </div>
        <p className="empty-note">💳 Le formulaire de paiement Stripe sera ajouté à une prochaine étape.</p>
      </div>
    </div>
  )
}
