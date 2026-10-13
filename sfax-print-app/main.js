// SFAX Print - main process. Keys and decrypted messages never reach the screen (renderer).
const { app, BrowserWindow, ipcMain, safeStorage, dialog, Menu } = require('electron');
const fs = require('fs'), path = require('path');
const C = require('./lib/crypto'), K = require('./lib/core'), L = require('./lib/layout'), P = require('./lib/printers');
const cfg = require('./config.json');
const cl = K.client(cfg.server, app.getVersion());
let win, pin = null, priv = null;   // priv lives in memory only while logged in

if (!app.requestSingleInstanceLock()) app.quit();
const keyPath = (p) => path.join(app.getPath('userData'), 'key-' + p + '.bin');
const logPath = () => path.join(app.getPath('userData'), 'print-log.jsonl');
function store(p, key) {   // key at rest is encrypted by the OS (Windows DPAPI), tied to this Windows user
  if (!safeStorage.isEncryptionAvailable()) throw new Error('This computer cannot protect keys (OS encryption is unavailable).');
  fs.writeFileSync(keyPath(p), safeStorage.encryptString(key), { mode: 0o600 });
}
const load = (p) => fs.existsSync(keyPath(p)) ? safeStorage.decryptString(fs.readFileSync(keyPath(p))) : null;
const h = (fn) => async (_e, ...a) => { try { return { ok: true, ...(await fn(...a)) }; } catch (e) { return { ok: false, error: e.message, status: e.status }; } };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function printSheets(sheets, deviceName) {
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    const html = '<meta charset="utf-8"><style>body{margin:0}pre{font:12pt "Courier New",monospace;margin:0;white-space:pre;page-break-after:always}pre:last-child{page-break-after:auto}</style>'
      + sheets.map(s => '<pre>' + (esc(s) || '&nbsp;') + '</pre>').join('');
    await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await new Promise((ok, no) => w.webContents.print({ silent: true, deviceName, printBackground: false, margins: { marginType: 'none' } }, (done, why) => done ? ok() : no(new Error('Printer error: ' + why))));
  } finally { w.destroy(); }
}

ipcMain.handle('login', h(async (p, pw, create) => { await cl.login(p, pw, create); pin = p; priv = load(p); return { pin: p, hasKey: !!priv }; }));
ipcMain.handle('setup', h(async () => {
  if (!pin) throw new Error('Please login first.');
  const keys = await K.setupKeys(cl, pin, cfg.escrowFingerprint);
  store(pin, keys.privateKey); priv = keys.privateKey;
  return { fingerprint: await C.fingerprint(keys.publicKey) };
}));
ipcMain.handle('recover', h(async (pass) => {   // use a recovery file sent by the SFAX owner
  if (!pin) throw new Error('Please login first.');
  const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Recovery file', extensions: ['json'] }], properties: ['openFile'] });
  if (r.canceled) return { canceled: true };
  const o = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'));
  if (o.code !== pin) throw new Error('This recovery file is for post office ' + o.code + ', not ' + pin + '.');
  let k; try { k = C.unlock(o, pass); } catch (e) { throw new Error('Wrong recovery passphrase.'); }
  store(pin, k); priv = k;
  return { fingerprint: await C.fingerprint(o.publicKey) };
}));
ipcMain.handle('inbox', h(async () => ({ items: await cl.inbox() })));
ipcMain.handle('printers', h(async () => {
  const all = await win.webContents.getPrintersAsync(), ok = all.filter(p => P.allowed(p, cfg.allowedPrinters));
  return { printers: ok.map(p => p.name), blocked: all.length - ok.length };
}));
ipcMain.handle('print', h(async (id, printer) => {
  if (!priv) throw new Error('This computer has no key yet. Set it up first.');
  const p = (await win.webContents.getPrintersAsync()).find(x => x.name === printer);
  if (!p || !P.allowed(p, cfg.allowedPrinters)) throw new Error('Printing is only allowed on a dot matrix printer.');
  const c = await cl.cipher(id), d = await K.decrypt(priv, c);   // decrypted in memory only
  await printSheets(L.buildSheets(d, { name: c.name, fromPin: c.fromPin, code: c.code, at: c.at }, cfg.layout), printer);
  await cl.printed(id);
  fs.appendFileSync(logPath(), JSON.stringify({ id, at: Date.now(), printer }) + '\n');   // audit log: no message content
  return {};
}));
ipcMain.handle('logout', h(async () => { pin = null; priv = null; cl.clear(); return {}; }));

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ width: 1100, height: 760, title: 'SFAX Print', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged } });
  win.setContentProtection(true);                 // blocks screenshots / screen capture of this window
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, 'renderer.html'));
  try { require('electron-updater').autoUpdater.checkForUpdatesAndNotify(); } catch (e) { /* updates need the publish settings in package.json */ }
});
app.on('window-all-closed', () => app.quit());
