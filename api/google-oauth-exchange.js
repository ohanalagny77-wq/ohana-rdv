// Fonction serverless Vercel : échange le "code" OAuth Google contre des jetons d'accès
// Le Client Secret reste ici, côté serveur, jamais exposé au navigateur.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { code, redirectUri } = req.body

  if (!code) {
    return res.status(400).json({ error: 'Code manquant' })
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || tokenData.error })
    }

    // tokenData contient : access_token, refresh_token, expires_in, etc.
    return res.status(200).json(tokenData)
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
}
