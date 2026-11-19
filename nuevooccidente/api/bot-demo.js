// Website chat demo: same answers as the WhatsApp bot, returned as JSON.
//   POST { text } or { id }  ->  { messages: [...], handoff }
const { reply } = require('../bot-engine');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const input = b.id ? { id: String(b.id).slice(0, 64) } : { text: String(b.text || '').slice(0, 500) };
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(reply(input));
};
