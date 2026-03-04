export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const odooUrl = process.env.ODOO_URL?.replace(/\/+$/, '');
  if (!odooUrl) return res.status(500).json({ error: 'ODOO_URL no configurado en Variables de Entorno de Vercel' });

  // path after /api/proxy → becomes Odoo endpoint
  // e.g. /api/proxy/xmlrpc/2/common → odooUrl/xmlrpc/2/common
  const odooPath = '/' + (req.query.path || []).join('/');

  try {
    const body = await getRawBody(req);

    const response = await fetch(`${odooUrl}${odooPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body,
    });

    const text = await response.text();
    res.setHeader('Content-Type', 'text/xml');
    res.status(response.status).send(text);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
