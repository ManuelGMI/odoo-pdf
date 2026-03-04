export const config = { api: { bodyParser: false } };

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
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk.toString(); });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    console.log('→ POST', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'text/xml',
      },
      body: body,
      redirect: 'follow',
    });

    const text = await response.text();
    console.log('← Status:', response.status);
    console.log('← ContentType:', response.headers.get('content-type'));
    console.log('← Preview:', text.substring(0, 150));

    // Detect HTML error page
    if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) {
      return res.status(502).json({
        error: `Odoo devolvió HTML (status ${response.status}). URL: ${fullUrl}`,
      });
    }

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(text);

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
