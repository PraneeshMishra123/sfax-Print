// App logic with no Electron code, so it can be tested on its own.
const C = require('./crypto');
function client(base, version) {
  let token = '';
  const call = async (method, p, body) => {
    const r = await fetch(base.replace(/\/$/, '') + p, { method, headers: { 'Content-Type': 'application/json', 'X-SFAX-App': version, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'Request failed (' + r.status + ')'); e.status = r.status; throw e; }
    return j;
  };
  return {
    async login(pin, pw, create) {
      let j;
      if (create) { try { j = await call('POST', '/api/po/register', { code: pin, password: pw }); } catch (e) { if (e.status !== 409) throw e; } }
      if (!j) j = await call('POST', '/api/po/login', { code: pin, password: pw });
      token = j.token; return j;
    },
    inbox: () => call('GET', '/api/inbox'),
    cipher: (id) => call('GET', '/api/inbox/' + id + '/cipher'),
    printed: (id) => call('POST', '/api/inbox/' + id + '/printed'),
    escrowKey: () => call('GET', '/api/escrow-key'),
    setKey: (publicKey, escrow) => call('POST', '/api/po/key', { publicKey, escrow }),
    clear() { token = ''; },
  };
}
// Create this post office's keys. Refuses to continue unless the server's backup key matches the fingerprint built into the app.
async function setupKeys(cl, pin, expectedFp) {
  if (!expectedFp) throw new Error('This app is not configured yet: set escrowFingerprint in config.json.');
  const esc = await cl.escrowKey();
  if (!esc.publicKey) throw new Error('The server has no backup key configured.');
  if (esc.fingerprint !== expectedFp) throw new Error('The server backup key does not match this app. Do not continue.');
  const keys = await C.genKeys();
  await cl.setKey(keys.publicKey, await C.seal(esc.publicKey, Buffer.from(keys.privateKey), 'escrow|' + pin));
  return keys;
}
async function decrypt(priv, c) {
  return JSON.parse(Buffer.from(await C.open(priv, c.enc, c.code + '|' + c.fromPin)).toString('utf8'));
}
module.exports = { client, setupKeys, decrypt };
