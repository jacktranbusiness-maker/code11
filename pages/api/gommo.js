const GOMMO_BASE = 'https://api.gommo.net'

const ALLOWED_ENDPOINTS = {
  'create-video': '/ai/create-video',
  'check-video': '/ai/video',
  'list-videos': '/ai/videos',
  'list-models': '/ai/models',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { endpoint, ...body } = req.body

  const apiPath = ALLOWED_ENDPOINTS[endpoint]
  if (!apiPath) {
    return res.status(400).json({ error: `Unknown endpoint: ${endpoint}` })
  }

  const params = new URLSearchParams()
  Object.entries(body).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      params.append(k, String(v))
    }
  })

  try {
    const response = await fetch(`${GOMMO_BASE}${apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SeedanceQueueManager/1.0',
      },
      body: params.toString(),
    })

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('[Gommo Proxy Error]', err.message)
    return res.status(502).json({ error: 'Failed to reach Gommo API', detail: err.message })
  }
}
