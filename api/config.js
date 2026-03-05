export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Only expose what the browser actually needs:
  // - oaiKey: to call OpenAI directly from browser
  // - odooUrl: to build the "open in Odoo" link
  // Odoo DB, user and API key NEVER leave the server
  res.status(200).json({
    oaiKey:  process.env.OPENAI_API_KEY || '',
    odooUrl: (process.env.ODOO_URL || '').replace(/\/+$/, ''),
    odooOk:  !!(process.env.ODOO_URL && process.env.ODOO_DB && process.env.ODOO_USER && process.env.ODOO_API_KEY),
  });
}
