import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Home() {
  const [therapists, setTherapists] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('therapists')
        .select('*, services(*)')
        .order('name')
      setTherapists(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading">Chargement…</div>

  return (
    <div className="app-container">
      <header className="ohana-header">
        <img src="/logo.jpg" alt="Logo Ohana" className="ohana-logo" />
        <div>
          <h1>OHANA</h1>
          <p>Bien-être &amp; thérapies · Lagny-sur-Marne</p>
        </div>
      </header>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--ohana-wood)', marginBottom: '6px' }}>
          Prenez rendez-vous en ligne
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--ohana-muted)' }}>
          Choisissez votre thérapeute et réservez votre séance en quelques clics
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {therapists.map(t => (
          <TherapistCard key={t.id} therapist={t} onBook={() => navigate(`/booking/${t.id}`)} />
        ))}
      </div>
    </div>
  )
}

function TherapistCard({ therapist, onBook }) {
  const activeServices = therapist.services?.filter(s => s.active) || []

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            overflow: 'hidden', border: '2px solid var(--ohana-gold-border)',
            flexShrink: 0, background: 'var(--ohana-gold-pale)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {therapist.photo_url
              ? <img src={therapist.photo_url} alt={therapist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '28px', fontWeight: '500', color: 'var(--ohana-gold)' }}>{therapist.name[0]}</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ohana-wood)', marginBottom: '4px' }}>
              {therapist.name}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ohana-muted)', lineHeight: '1.5' }}>
              {therapist.bio || 'Thérapeute spécialisée en bien-être et soins énergétiques. Séances disponibles au cabinet à Lagny-sur-Marne ou en visio.'}
            </p>
          </div>
        </div>

        {activeServices.length > 0 && (
          <>
            <p className="section-label">Prestations proposées</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
              {activeServices.map(s => (
                <span key={s.id} style={{
                  padding: '4px 10px', borderRadius: '20px',
                  background: 'var(--ohana-gold-pale)', border: '0.5px solid var(--ohana-gold-border)',
                  fontSize: '11px', color: 'var(--ohana-wood)', fontWeight: '500'
                }}>
                  {s.name}
                </span>
              ))}
            </div>
          </>
        )}

        <button className="btn-primary" onClick={onBook}>
          Prendre rendez-vous avec {therapist.name} →
        </button>
      </div>
    </div>
  )
}
