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
  const body     = req.body || {};

  let xmlBody;
  try {
    if (body.rpc === 'authenticate') {
      xmlBody = `<?xml version="1.0"?><methodCall><methodName>authenticate</methodName><params>
        <param>${xs(db)}</param>
        <param>${xs(user)}</param>
        <param>${xs(apiKey)}</param>
        <param><value><struct></struct></value></param>
      </params></methodCall>`;

    } else if (body.rpc === 'execute_kw') {
      const { uid, model, method, args = [], kwargs = {} } = body;
      xmlBody = `<?xml version="1.0"?><methodCall><methodName>execute_kw</methodName><params>
        <param>${xs(db)}</param>
        <param><value><int>${uid}</int></value></param>
        <param>${xs(apiKey)}</param>
        <param>${xs(model)}</param>
        <param>${xs(method)}</param>
        <param>${xval(args)}</param>
        <param>${xval(kwargs)}</param>
      </params></methodCall>`;
    } else {
      return res.status(400).json({ error: 'rpc must be authenticate or execute_kw' });
    }
  } catch(e) {
    return res.status(500).json({ error: 'XML build error: ' + e.message });
  }

  try {
    console.log('→', fullUrl, '|', body.rpc, body.model||'', body.method||'');
    console.log('→ XML:', xmlBody.replace(/\s+/g,' ').substring(0, 300));

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Accept': 'text/xml' },
      body: xmlBody,
      redirect: 'follow',
    });

    const text = await response.text();
    console.log('←', response.status, '|', text.substring(0, 150));

    if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html'))
      return res.status(502).json({ error: `Odoo devolvió HTML (${response.status})` });

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Serialize a plain string value
function xs(s) {
  return `<value><string>${String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</string></value>`;
}

// Serialize any JS value to XML-RPC
function xval(v) {
  if (v === null || v === false || v === undefined) {
    return '<value><boolean>0</boolean></value>';
  }
  if (typeof v === 'boolean') {
    return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  }
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? `<value><int>${v}</int></value>`
      : `<value><double>${v}</double></value>`;
  }
  if (typeof v === 'string') {
    return xs(v);
  }
  if (Array.isArray(v)) {
    return `<value><array><data>${v.map(xval).join('')}</data></array></value>`;
  }
  if (typeof v === 'object') {
    const members = Object.entries(v)
      .map(([k, vv]) => `<member><n>${k}</n>${xval(vv)}</member>`)
      .join('');
    return `<value><struct>${members}</struct></value>`;
  }
  return xs(String(v));
}
