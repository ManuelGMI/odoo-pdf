export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    oaiKey:   process.env.OPENAI_API_KEY || '',
    odooUrl:  (process.env.ODOO_URL || '').replace(/\/+$/, ''),
    odooDb:   process.env.ODOO_DB       || '',
    odooUser: process.env.ODOO_USER     || '',
    odooKey:  process.env.ODOO_API_KEY  || '',
    odooOk:   !!(process.env.ODOO_URL && process.env.ODOO_DB && process.env.ODOO_USER && process.env.ODOO_API_KEY),
  });
}
