import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  return response.json()
}

export default async function handler(req, res) {
  const { therapistId, timeMin, timeMax } = req.query

  if (!therapistId || !timeMin || !timeMax) {
    return res.status(400).json({ error: 'Paramètres manquants' })
  }

  try {
    const { data: therapist, error } = await supabase
      .from('therapists')
      .select('google_access_token, google_refresh_token, google_token_expiry, google_calendar_connected')
      .eq('id', therapistId)
      .single()

    if (error || !therapist || !therapist.google_calendar_connected) {
      return res.status(200).json({ busy: [], debug: 'agenda non connecté ou thérapeute introuvable' })
    }

    let accessToken = therapist.google_access_token
    const expiry = new Date(therapist.google_token_expiry)

    if (expiry.getTime() < Date.now() + 2 * 60 * 1000) {
      const refreshed = await refreshAccessToken(therapist.google_refresh_token)
      if (refreshed.error) {
        return res.status(200).json({ busy: [], warning: 'Jeton Google expiré' })
      }
      accessToken = refreshed.access_token
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      await supabase
        .from('therapists')
        .update({ google_access_token: accessToken, google_token_expiry: newExpiry })
        .eq('id', therapistId)
    }

    const fbResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: 'primary' }],
      }),
    })

    const fbData = await fbResponse.json()
    const busy = fbData.calendars?.primary?.busy || []

    return res.status(200).json({ busy })
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
}
