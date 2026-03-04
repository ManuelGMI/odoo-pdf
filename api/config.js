export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const odooUrl  = process.env.ODOO_URL?.replace(/\/+$/, '') || '';
  const odooDb   = process.env.ODOO_DB   || '';
  const odooUser = process.env.ODOO_USER || '';
  const odooKey  = process.env.ODOO_API_KEY || '';
  const oaiKey   = process.env.OPENAI_API_KEY || '';

  res.status(200).json({
    oaiKey,                          // needed in browser for OpenAI calls
    odooUrl,                         // needed to build the "open in Odoo" link
    odooDb,                          // needed for XML-RPC calls
    odooUser,                        // needed for XML-RPC auth
    odooKey,                         // needed for XML-RPC calls
    odooOk: !!(odooUrl && odooDb && odooUser && odooKey),
  });
}
