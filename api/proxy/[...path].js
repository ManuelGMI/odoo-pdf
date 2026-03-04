export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const odooUrl = process.env.ODOO_URL?.replace(/\/+$/, '');
  if (!odooUrl) return res.status(500).json({ error: 'ODOO_URL no configurado' });

  // Build Odoo path from query params
  const pathParts = req.query.path || [];
  const odooPath = '/' + (Array.isArray(pathParts) ? pathParts.join('/') : pathParts);

  try {
    // Read raw body manually
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk.toString(); });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    const response = await fetch(`${odooUrl}${odooPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'User-Agent': 'OdooPDFProxy/1.0',
      },
      body: body,
    });

    const text = await response.text();
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(text);

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
}
