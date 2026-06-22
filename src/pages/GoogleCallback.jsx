import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { GOOGLE_REDIRECT_URI } from '../googleAuthConfig'

export default function GoogleCallback() {
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('Connexion à Google Agenda en cours…')

  useEffect(() => {
    async function exchangeCode() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const therapistId = params.get('state')
      const error = params.get('error')

      if (error) {
        setStatus('error')
        setMessage("Vous avez annulé l'autorisation, ou une erreur Google est survenue.")
        return
      }

      if (!code || !therapistId) {
        setStatus('error')
        setMessage('Informations manquantes pour finaliser la connexion.')
        return
      }

      try {
        const response = await fetch('/api/google-oauth-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri: GOOGLE_REDIRECT_URI }),
        })
        const tokenData = await response.json()

        if (tokenData.error) {
          setStatus('error')
          setMessage('Erreur lors de la connexion : ' + tokenData.error)
          return
        }

        const expiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

        const { error: dbError } = await supabase
          .from('therapists')
          .update({
            google_access_token: tokenData.access_token,
            google_refresh_token: tokenData.refresh_token,
            google_token_expiry: expiry,
            google_calendar_connected: true,
          })
          .eq('id', therapistId)

        if (dbError) {
          setStatus('error')
          setMessage('Erreur lors de l\'enregistrement : ' + dbError.message)
          return
        }

        setStatus('success')
        setMessage('Votre Google Agenda est connecté avec succès !')
      } catch (err) {
        setStatus('error')
        setMessage('Erreur inattendue : ' + err.message)
      }
    }

    exchangeCode()
  }, [])

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      {status === 'loading' && <p>{message}</p>}
      {status === 'success' && (
        <>
          <h2 style={{ color: '#1D9E75' }}>✓ {message}</h2>
          <a href="/admin">Retour à l'administration</a>
        </>
      )}
      {status === 'error' && (
        <>
          <h2 style={{ color: '#c0392b' }}>✗ Connexion impossible</h2>
          <p>{message}</p>
          <a href="/admin">Retour à l'administration</a>
        </>
      )}
    </div>
  )
}
