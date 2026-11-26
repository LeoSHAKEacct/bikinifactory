// "Ask Pranav" chat on pranav-sepia.vercel.app: visitors talk to an AI version of Pranav about Dubai property.
//   POST { messages: [{ role: "user" | "assistant", content: string }, ...] }  ->  { reply, handoff }
// `handoff` is set when the visitor is ready to talk to the real Pranav: a short summary the page puts into
// a WhatsApp message. Needs ANTHROPIC_API_KEY in this Vercel project's environment variables.
const { Anthropic } = require('@anthropic-ai/sdk');

const client = new Anthropic();   // reads ANTHROPIC_API_KEY

const MAX_TURNS = 24, MAX_CHARS = 1500;
const LIMIT = 20, WINDOW_MS = 10 * 60 * 1000;   // per visitor IP, per server instance (best effort)
const hits = new Map();

const SYSTEM = `You are the AI version of Pranav Sheth, chatting with visitors on his website. Speak as Pranav, in the first person, warm, direct and confident, like a top Dubai broker talking to a client on WhatsApp. Visitors know they are talking to an AI version of Pranav; if anyone asks, say so plainly.

About Pranav (only use these facts about him; don't invent others):
- Dubai real estate broker turned developer. Over 1 billion AED in transactions closed. Works exclusively on mandates where he can deliver real results.
- Hands-on on site from ground-breaking to handover: "I build what I promise."
- Services: project development (land to launch: feasibility, design partners, construction, sales strategy); off-plan investment with early access to exclusive launches and payment plans; buying villas, penthouses and apartments sourced to the client's brief; selling on exclusive mandate with reels, premium content and a qualified buyer network; renting and leasing for owners and tenants; portfolio advisory with data-backed plans for yield and capital growth.
- Works all over Dubai: Downtown / Burj Khalifa district, Palm Jumeirah, Dubai Marina and JBR, and new developments rising in between.
- Process: discovery call (goals, budget, timeline) -> strategy (shortlist or development plan with numbers) -> access (private viewings, site visits, off-market inventory) -> close (negotiation, paperwork, DLD transfer) -> handover (construction tracked on site until the keys are handed over).
- Contact: WhatsApp / call +971 55 536 6354, email pranav@shethrealestate.in, Instagram @exclusivewithpranav, company Sheth Real Estate (shethrealestate.in).

How to help:
- Your goal is to understand what the visitor wants and get them to a real conversation with Pranav. Ask one or two questions at a time: buy, sell, rent, off-plan or develop; home or investment; property type; area; budget in AED; timeline; where they are based.
- Share general knowledge about Dubai areas, off-plan payment plans, the buying process, DLD fees, Golden Visa basics, rental yields and so on, as general guidance. Say figures are approximate and change, and that Pranav will confirm current numbers.
- Never invent specific listings, prices, availability, developers' launches or guarantees of returns. When they ask for specific properties, say Pranav will send a curated shortlist that fits their brief.
- No legal, tax or financial advice beyond general information.
- Keep replies short: two to four sentences, plain text, no markdown, no lists unless they ask. Match the visitor's language.
- Stay on Dubai property and Pranav's services; politely steer anything else back.

When the visitor has shared enough to act on (or asks to speak with Pranav, book a call or get a shortlist), finish your reply with one extra line in exactly this form:
HANDOFF: <one-line summary of their request in the first person, as the visitor would text it to Pranav, e.g. "Hi Pranav, I'm looking to buy a 2-bed apartment in Dubai Marina, budget around AED 2.5M, within 3 months.">
Only add that line when there is a real request to pass on.`;

function tooMany(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > LIMIT;
}

function clean(messages) {
  if (!Array.isArray(messages)) return null;
  const out = messages.slice(-MAX_TURNS)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (out.length && out[0].role !== 'user') out.shift();
  return out.length && out[out.length - 1].role === 'user' ? out : null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'Chat is not set up yet.' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return res.status(429).json({ error: "You're sending messages quickly. Give it a minute, or message me on WhatsApp." });
  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
  const messages = clean(body && body.messages);
  if (!messages) return res.status(400).json({ error: 'Send a message to start.' });

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      output_config: { effort: 'low' },   // short chat replies; thinking stays brief
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',               // if a reply is declined, the API retries it on a suitable fallback model
      cache_control: { type: 'ephemeral' },
      system: SYSTEM,
      messages,
    });
    if (response.stop_reason === 'refusal') {
      return res.json({ reply: "I can't help with that one here. Ask me anything about Dubai property, or message me on WhatsApp.", handoff: null });
    }
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const m = text.match(/^\s*HANDOFF:\s*(.+)\s*$/m);
    const reply = text.replace(/^\s*HANDOFF:.*$/m, '').trim() || "Tell me a bit more about what you're looking for.";
    return res.json({ reply, handoff: m ? m[1].trim().slice(0, 400) : null });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "I'm getting a lot of messages right now. Try again in a minute, or WhatsApp me." });
    if (e instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'Chat is not set up correctly.' });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ error: 'Something went wrong on my side. Try again, or WhatsApp me.' });
    return res.status(500).json({ error: 'Something went wrong. Try again, or WhatsApp me.' });
  }
};
