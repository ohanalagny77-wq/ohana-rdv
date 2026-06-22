// Configuration pour la connexion Google Calendar (OAuth)

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export const GOOGLE_REDIRECT_URI = window.location.origin + '/admin/google-callback'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ')

// Construit l'URL vers laquelle rediriger la thérapeute pour qu'elle autorise l'accès
export function buildGoogleAuthUrl(therapistId) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline', // pour obtenir un refresh_token
    prompt: 'consent',      // force Google à toujours renvoyer un refresh_token
    state: therapistId,     // pour savoir, au retour, à quelle thérapeute associer le jeton
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
