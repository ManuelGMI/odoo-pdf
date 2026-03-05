export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const odooUrl = (process.env.ODOO_URL || '').replace(/\/+$/, '');
  const db      = process.env.ODOO_DB      || '';
  const user    = process.env.ODOO_USER    || '';
  const apiKey  = process.env.ODOO_API_KEY || '';

  if (!odooUrl || !db || !user || !apiKey)
    return res.status(500).json({ error: 'Credenciales Odoo no configuradas en Vercel' });

  const odooPath = req.url.replace(/^\/api\/proxy/, '').split('?')[0] || '/';
  const fullUrl  = odooUrl + odooPath;

  // Frontend sends: { rpc: 'authenticate' } or { rpc: 'execute_kw', uid, model, method, args, kwargs }
  const body = req.body || {};
  let xmlBody;

  if (body.rpc === 'authenticate') {
    xmlBody = xmlCall('authenticate', [db, user, apiKey, {}]);
  } else if (body.rpc === 'execute_kw') {
    const { uid, model, method, args = [], kwargs = {} } = body;
    xmlBody = xmlCall('execute_kw', [db, uid, apiKey, model, method, args, kwargs]);
  } else {
    return res.status(400).json({ error: 'rpc field required: authenticate | execute_kw' });
  }

  try {
    console.log('→', fullUrl, body.rpc, body.model||'', body.method||'');
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'text/xml' },
      body: xmlBody,
      redirect: 'follow',
    });

    const text = await response.text();
    console.log('←', response.status, text.substring(0, 100));

    if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html'))
      return res.status(502).json({ error: `Odoo devolvió HTML (${response.status})` });

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function xmlCall(method, params) {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${
    params.map(p => `<param>${xval(p)}</param>`).join('')
  }</params></methodCall>`;
}

function xval(v) {
  if (v === false || v === null) return '<value><boolean>0</boolean></value>';
  if (typeof v === 'number' && Number.isInteger(v)) return `<value><int>${v}</int></value>`;
  if (typeof v === 'number') return `<value><double>${v}</double></value>`;
  if (typeof v === 'boolean') return `<value><boolean>${v?1:0}</boolean></value>`;
  if (Array.isArray(v)) return `<value><array><data>${v.map(xval).join('')}</data></array></value>`;
  if (typeof v === 'object') return `<value><struct>${
    Object.entries(v).map(([k,vv]) => `<member><n>${k}</n>${xval(vv)}</member>`).join('')
  }</struct></value>`;
  return `<value><string>${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</string></value>`;
}
