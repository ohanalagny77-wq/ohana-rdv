import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { buildGoogleAuthUrl } from '../googleAuthConfig'

const ADMIN_PASSWORD = 'ohana2026'

export default function Admin() {
  const [auth, setAuth] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdError, setPwdError] = useState(false)
  const [tab, setTab] = useState('bookings')

  function login() {
    if (pwd === ADMIN_PASSWORD) { setAuth(true); setPwdError(false) }
    else setPwdError(true)
  }

  if (!auth) {
    return (
      <div className="app-container" style={{ maxWidth: 400, paddingTop: '3rem' }}>
        <header className="ohana-header">
          <img src="/logo.jpg" alt="Logo Ohana" className="ohana-logo" />
          <div><h1>OHANA</h1><p>Administration</p></div>
        </header>
        <div className="card">
          <div className="card-header"><h2>Accès administration</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Mot de passe</label>
              <input className="form-input" type="password" value={pwd}
                onChange={e => setPwd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="••••••••" />
            </div>
            {pwdError && <p style={{ color: 'var(--ohana-error)', fontSize: '12px', marginBottom: '10px' }}>Mot de passe incorrect.</p>}
            <button className="btn-primary" onClick={login}>Se connecter</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="ohana-header">
        <img src="/logo.jpg" alt="Logo Ohana" className="ohana-logo" />
        <div><h1>OHANA — Admin</h1><p>Espace de gestion</p></div>
      </header>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[['bookings', '📅 Réservations'], ['blocked', '🚫 Indisponibilités'], ['services', '💆 Prestations'], ['google', '📆 Agenda Google']].map(([key, label]) => (
          <button key={key}
            className={`toggle-btn ${tab === key ? 'selected' : ''}`}
            style={{ flex: 'none' }}
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'bookings' && <BookingsTab />}
      {tab === 'blocked' && <BlockedTab />}
      {tab === 'services' && <ServicesTab />}
      {tab === 'google' && <GoogleTab />}
    </div>
  )
}

function BookingsTab() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => { loadBookings() }, [filter])

  async function loadBookings() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    let query = supabase.from('bookings')
      .select('*, therapists(name), services(name)')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })

    if (filter === 'upcoming') query = query.gte('booking_date', today).eq('status', 'confirmed')
    else if (filter === 'past') query = query.lt('booking_date', today)

    const { data } = await query
    setBookings(data || [])
    setLoading(false)
  }

  async function cancelBooking(id) {
    if (!confirm('Annuler ce rendez-vous ?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    loadBookings()
  }

  return (
    <div>
      <div className="toggle-group" style={{ marginBottom: '1rem' }}>
        <button className={`toggle-btn ${filter === 'upcoming' ? 'selected' : ''}`} onClick={() => setFilter('upcoming')}>À venir</button>
        <button className={`toggle-btn ${filter === 'past' ? 'selected' : ''}`} onClick={() => setFilter('past')}>Passés</button>
        <button className={`toggle-btn ${filter === 'all' ? 'selected' : ''}`} onClick={() => setFilter('all')}>Tous</button>
      </div>

      {loading ? <div className="loading">Chargement…</div> : bookings.length === 0 ? (
        <div className="info-note">Aucun rendez-vous trouvé.</div>
      ) : bookings.map(b => (
        <div key={b.id} className="card" style={{ marginBottom: '8px' }}>
          <div className="card-body" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '13px', color: 'var(--ohana-wood)' }}>
                  {b.client_first_name} {b.client_last_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ohana-muted)', marginTop: '2px' }}>
                  {new Date(b.booking_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {b.booking_time?.slice(0, 5)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ohana-muted)', marginTop: '2px' }}>
                  {b.services?.name} · {b.tarif_type} · {b.format === 'visio' ? 'Visio' : 'Cabinet'} · {b.price} €
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ohana-muted)' }}>
                  {b.therapists?.name} · {b.client_email} · {b.client_phone}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '500',
                  background: b.status === 'confirmed' ? '#E8F8F2' : '#FFE8E8',
                  color: b.status === 'confirmed' ? 'var(--ohana-success)' : 'var(--ohana-error)'
                }}>{b.status === 'confirmed' ? 'Confirmé' : b.status === 'cancelled' ? 'Annulé' : 'Terminé'}</span>
                {b.status === 'confirmed' && (
                  <button onClick={() => cancelBooking(b.id)}
                    style={{ fontSize: '11px', color: 'var(--ohana-error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function BlockedTab() {
  const [therapists, setTherapists] = useState([])
  const [blocked, setBlocked] = useState([])
  const [form, setForm] = useState({ therapist_id: '', blocked_date: '', start_time: '', end_time: '', reason: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('therapists').select('*').order('name').then(({ data }) => setTherapists(data || []))
    loadBlocked()
  }, [])

  async function loadBlocked() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('blocked_slots')
      .select('*, therapists(name)')
      .gte('blocked_date', today)
      .order('blocked_date')
    setBlocked(data || [])
  }

  async function addBlocked() {
    if (!form.therapist_id || !form.blocked_date) return
    setSaving(true)
    await supabase.from('blocked_slots').insert(form)
    setForm({ therapist_id: '', blocked_date: '', start_time: '', end_time: '', reason: '' })
    loadBlocked()
    setSaving(false)
  }

  async function deleteBlocked(id) {
    await supabase.from('blocked_slots').delete().eq('id', id)
    loadBlocked()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header"><h2>Ajouter une indisponibilité</h2><p>Journée entière ou créneau spécifique</p></div>
        <div className="card-body">
          <div className="form-group">
            <label>Thérapeute</label>
            <select className="form-input" value={form.therapist_id} onChange={e => setForm(f => ({ ...f, therapist_id: e.target.value }))}>
              <option value="">Choisir…</option>
              {therapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input className="form-input" type="date" value={form.blocked_date} onChange={e => setForm(f => ({ ...f, blocked_date: e.target.value }))} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Heure début (optionnel)</label>
              <input className="form-input" type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Heure fin (optionnel)</label>
              <input className="form-input" type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Motif (optionnel)</label>
            <input className="form-input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Congés, formation…" />
          </div>
          <button className="btn-primary" onClick={addBlocked} disabled={saving || !form.therapist_id || !form.blocked_date}>
            {saving ? 'Enregistrement…' : 'Ajouter'}
          </button>
        </div>
      </div>

      <p className="section-label">Indisponibilités à venir</p>
      {blocked.length === 0 ? <div className="info-note">Aucune indisponibilité programmée.</div>
        : blocked.map(b => (
          <div key={b.id} className="card" style={{ marginBottom: '6px' }}>
            <div className="card-body" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ohana-wood)' }}>{b.therapists?.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--ohana-muted)' }}>
                  {new Date(b.blocked_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {b.start_time && ` · ${b.start_time.slice(0, 5)} – ${b.end_time?.slice(0, 5) || '...'}`}
                  {b.reason && ` · ${b.reason}`}
                </div>
              </div>
              <button onClick={() => deleteBlocked(b.id)} style={{ fontSize: '11px', color: 'var(--ohana-error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
    </div>
  )
}

function ServicesTab() {
  const [therapists, setTherapists] = useState([])
  const [services, setServices] = useState([])
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('therapists').select('*').order('name').then(({ data }) => setTherapists(data || []))
    loadServices()
  }, [])

  async function loadServices() {
    const { data } = await supabase.from('services').select('*, therapists(name)').order('name')
    setServices(data || [])
  }

  async function saveService() {
    setSaving(true)
    if (editing.id) {
      await supabase.from('services').update(editing).eq('id', editing.id)
    } else {
      await supabase.from('services').insert(editing)
    }
    setEditing(null)
    loadServices()
    setSaving(false)
  }

  async function toggleActive(service) {
    await supabase.from('services').update({ active: !service.active }).eq('id', service.id)
    loadServices()
  }

  return (
    <div>
      <button className="btn-primary" style={{ marginBottom: '1rem' }}
        onClick={() => setEditing({ therapist_id: '', name: '', duration_minutes: 60, price_adult: 0, price_child: null, price_visio: null, price_animal: null, active: true })}>
        + Ajouter une prestation
      </button>

      {editing && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header"><h2>{editing.id ? 'Modifier' : 'Nouvelle prestation'}</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Thérapeute</label>
              <select className="form-input" value={editing.therapist_id} onChange={e => setEditing(s => ({ ...s, therapist_id: e.target.value }))}>
                <option value="">Choisir…</option>
                {therapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Nom de la prestation</label>
              <input className="form-input" value={editing.name} onChange={e => setEditing(s => ({ ...s, name: e.target.value }))} placeholder="Ex: Sophrologie" />
            </div>
            <div className="form-group">
              <label>Durée (minutes)</label>
              <input className="form-input" type="number" value={editing.duration_minutes} onChange={e => setEditing(s => ({ ...s, duration_minutes: parseInt(e.target.value) }))} />
            </div>
            <div className="form-grid-2">
              <div className="form-group"><label>Tarif adulte (€)</label><input className="form-input" type="number" value={editing.price_adult || ''} onChange={e => setEditing(s => ({ ...s, price_adult: parseFloat(e.target.value) }))} /></div>
              <div className="form-group"><label>Tarif enfant (€)</label><input className="form-input" type="number" value={editing.price_child || ''} onChange={e => setEditing(s => ({ ...s, price_child: parseFloat(e.target.value) || null }))} /></div>
              <div className="form-group"><label>Tarif visio (€)</label><input className="form-input" type="number" value={editing.price_visio || ''} onChange={e => setEditing(s => ({ ...s, price_visio: parseFloat(e.target.value) || null }))} /></div>
              <div className="form-group"><label>Tarif animal (€)</label><input className="form-input" type="number" value={editing.price_animal || ''} onChange={e => setEditing(s => ({ ...s, price_animal: parseFloat(e.target.value) || null }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" onClick={saveService} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button className="btn-secondary" onClick={() => setEditing(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {services.map(s => (
        <div key={s.id} className="card" style={{ marginBottom: '6px', opacity: s.active ? 1 : 0.5 }}>
          <div className="card-body" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ohana-wood)' }}>{s.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--ohana-muted)' }}>
                {s.therapists?.name} · {s.duration_minutes} min · Adulte {s.price_adult}€
                {s.price_child && ` · Enfant ${s.price_child}€`}
                {s.price_visio && ` · Visio ${s.price_visio}€`}
                {s.price_animal && ` · Animal ${s.price_animal}€`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => setEditing(s)} style={{ fontSize: '11px', color: 'var(--ohana-gold)', background: 'none', border: 'none', cursor: 'pointer' }}>Modifier</button>
              <button onClick={() => toggleActive(s)} style={{ fontSize: '11px', color: 'var(--ohana-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>{s.active ? 'Désactiver' : 'Activer'}</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function GoogleTab() {
  const [therapists, setTherapists] = useState([])

  useEffect(() => {
    supabase.from('therapists').select('*').order('name').then(({ data }) => setTherapists(data || []))
  }, [])

  async function disconnect(id) {
    await supabase.from('therapists').update({ google_access_token: null, google_refresh_token: null, google_token_expiry: null, google_calendar_connected: false }).eq('id', id)
    supabase.from('therapists').select('*').order('name').then(({ data }) => setTherapists(data || []))
  }

  return (
    <div>
      <div className="info-note gold" style={{ marginBottom: '1rem' }}>
        📆 Connectez votre Google Agenda pour que vos créneaux personnels (médecin, école, etc.) bloquent automatiquement les disponibilités sur Ohana RDV.
      </div>
      {therapists.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: '8px' }}>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ohana-wood)' }}>{t.name}</div>
              <div style={{ fontSize: '11px', color: t.google_calendar_connected ? 'var(--ohana-success)' : 'var(--ohana-muted)' }}>
                {t.google_calendar_connected ? '✓ Agenda connecté' : 'Agenda non connecté'}
              </div>
            </div>
            {t.google_calendar_connected
              ? <button className="btn-secondary" style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }} onClick={() => disconnect(t.id)}>Déconnecter</button>
              : <button className="btn-primary" style={{ width: 'auto', padding: '9px 14px', fontSize: '12px' }} onClick={() => window.location.href = buildGoogleAuthUrl(t.id)}>Connecter mon agenda</button>
            }
          </div>
        </div>
      ))}
    </div>
  )
}
