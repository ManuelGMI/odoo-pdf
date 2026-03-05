export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const odooUrl = (process.env.ODOO_URL || '').replace(/\/+$/, '');
  if (!odooUrl) return res.status(500).json({ error: 'ODOO_URL no configurado' });

  const odooPath = req.url.replace(/^\/api\/proxy/, '').split('?')[0] || '/';
  const fullUrl  = odooUrl + odooPath;

  const body = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  console.log('→ POST', fullUrl);

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'text/xml' },
    body,
    redirect: 'follow',
  });

  const text = await response.text();
  console.log('←', response.status, text.substring(0, 150));

  if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html'))
    return res.status(502).json({ error: `Odoo devolvió HTML (${response.status})` });

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(text);
}
