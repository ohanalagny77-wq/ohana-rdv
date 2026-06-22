import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { buildGoogleAuthUrl } from '../googleAuthConfig'
import '../pages/Booking.css'
import './Admin.css'

export default function Admin() {
  const [therapists, setTherapists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTherapists()
  }, [])

  async function loadTherapists() {
    const { data } = await supabase.from('therapists').select('*').order('name')
    setTherapists(data || [])
    setLoading(false)
  }

  function connectGoogle(therapistId) {
    window.location.href = buildGoogleAuthUrl(therapistId)
  }

  async function disconnectGoogle(therapistId) {
    await supabase
      .from('therapists')
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
        google_calendar_connected: false,
      })
      .eq('id', therapistId)
    loadTherapists()
  }

  if (loading) return <div className="booking-loading">Chargement…</div>

  return (
    <div className="booking-page">
      <header className="ohana-header">
        <img src="/logo.jpg" alt="Logo Ohana" className="ohana-logo" />
        <div>
          <h1>OHANA — Administration</h1>
          <p>Gestion des thérapeutes et des agendas</p>
        </div>
      </header>

      <div className="screen">
        <div className="screen-header">
          <h2>Connexion Google Agenda</h2>
          <p>Chaque thérapeute connecte son propre agenda personnel</p>
        </div>
        <div className="screen-body">
          {therapists.map(t => (
            <div key={t.id} className="admin-therapist-row">
              <div>
                <div className="thera-name">{t.name}</div>
                <div className="thera-desc">
                  {t.google_calendar_connected ? '✓ Agenda connecté' : 'Agenda non connecté'}
                </div>
              </div>
              {t.google_calendar_connected ? (
                <button className="back-btn" onClick={() => disconnectGoogle(t.id)}>
                  Déconnecter
                </button>
              ) : (
                <button className="cta" style={{ width: 'auto' }} onClick={() => connectGoogle(t.id)}>
                  Connecter mon agenda Google
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
