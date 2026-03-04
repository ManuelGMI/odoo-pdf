export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const odooUrl = (process.env.ODOO_URL || '').replace(/\/+$/, '');
  if (!odooUrl) return res.status(500).json({ error: 'ODOO_URL no configurado' });

  const pathParts = req.query.path || [];
  const odooPath = '/' + (Array.isArray(pathParts) ? pathParts.join('/') : pathParts);
  const fullUrl = odooUrl + odooPath;

  try {
    console.log('→ POST', fullUrl);
    console.log('→ Body:', JSON.stringify(req.body).substring(0, 200));

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    console.log('← Status:', response.status);
    console.log('← Result:', JSON.stringify(data).substring(0, 200));

    res.status(200).json(data);

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
