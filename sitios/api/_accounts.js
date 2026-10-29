// Student accounts and class settings, stored encrypted (the repo is public)
// in <dir>/accounts.json on the drafts branch: { classCode, users: [...] }.
const crypto = require('crypto');
const G = require('./_github');
const C = require('./_crypto');

const path = () => `${G.DIR}/accounts.json`;

async function read() {
  const buf = await G.readRaw(path(), G.DRAFTS).catch(() => null);
  if (!buf) return { classCode: '', users: [] };
  return JSON.parse(C.decrypt(buf.toString('utf8').trim()));
}

// Applies change(accounts) and saves it in one commit (retried on races).
async function update(message, change) {
  if (!C.hasKey()) throw G.userError('Falta configurar TOKEN_KEY en Vercel.', 500);
  await G.ensureDrafts();
  let result;
  await G.commit(G.DRAFTS, message, async () => {
    const acc = await read();
    result = await change(acc);
    return [{ path: path(), content: C.encrypt(JSON.stringify(acc)) + '\n', encoding: 'utf-8' }];
  });
  return result;
}

const newId = () => crypto.randomBytes(6).toString('hex');
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt });

module.exports = { read, update, newId, publicUser };
