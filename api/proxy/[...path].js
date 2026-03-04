export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const odooUrl = process.env.ODOO_URL?.replace(/\/+$/, '');
  if (!odooUrl) return res.status(500).json({ error: 'ODOO_URL no configurado' });

  const pathParts = req.query.path || [];
  const odooPath = '/' + (Array.isArray(pathParts) ? pathParts.join('/') : pathParts);

  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk.toString(); });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    console.log('→ Odoo URL:', `${odooUrl}${odooPath}`);
    console.log('→ Body:', body.substring(0, 200));

    const response = await fetch(`${odooUrl}${odooPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'text/xml, application/xml',
        'X-Odoo-Dbfilter': process.env.ODOO_DB || '',
      },
      body: body,
      redirect: 'manual', // Don't follow redirects — catch them
    });

    console.log('← Status:', response.status);
    console.log('← Content-Type:', response.headers.get('content-type'));

    // If Odoo redirected us, it means wrong URL or session issue
    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get('location');
      console.log('← Redirect to:', location);
      return res.status(502).json({ error: `Odoo redirigió a: ${location}. Verifica ODOO_URL y ODOO_DB.` });
    }

    const text = await response.text();
    console.log('← Response preview:', text.substring(0, 300));

    // If Odoo returned HTML instead of XML, surface a clear error
    if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
      return res.status(502).json({
        error: 'Odoo devolvió HTML en vez de XML. Verifica que ODOO_DB sea correcto.',
        hint: `DB configurado: "${process.env.ODOO_DB}". Prueba con el subdominio exacto de tu Odoo.`,
        htmlPreview: text.substring(0, 200),
      });
    }

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(text);

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
}
