// Fonction serverless Vercel : rafraîchit un access_token expiré à partir du refresh_token
// Les jetons Google access_token expirent après ~1h, il faut les renouveler régulièrement.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken manquant' })
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || tokenData.error })
    }

    return res.status(200).json(tokenData)
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
}
