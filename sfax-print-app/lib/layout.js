// Builds the 3 sheets as plain fixed-width text for an impact (dot matrix) printer.
// Sheet 1: receiver (left) + sender (right), tear line, ACKNOWLEDGMENT. Sheet 2: the message. Sheet 3: blank.
const clean = (s) => String(s == null ? '' : s).replace(/\r/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x20-\x7E\n]/g, '?');
function wrap(text, w) {
  const out = [];
  for (const para of clean(text).split('\n')) {
    if (!para.trim()) { out.push(''); continue; }
    let line = '';
    for (const word of para.trim().split(/\s+/)) {
      let wd = word;
      while (wd.length > w) { if (line) { out.push(line); line = ''; } out.push(wd.slice(0, w)); wd = wd.slice(w); }
      if (!line) line = wd; else if ((line + ' ' + wd).length <= w) line += ' ' + wd; else { out.push(line); line = wd; }
    }
    if (line) out.push(line);
  }
  return out;
}
const center = (s, w) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
function buildSheets(d, m, o = {}) {
  const cols = o.cols || 76, rows = o.rows || 60, cw = Math.floor((cols - 1) / 2), inner = cw - 4;
  const lines = (title, name, email, addr, pin) => [title, '', ...wrap(name, inner), ...wrap('Email: ' + email, inner), ...wrap(addr, inner), '', 'Post office PIN: ' + pin].flatMap(x => x === '' ? [''] : wrap(x, inner));
  const L = lines('TO (RECEIVER)', d.to, d.receiverEmail, d.toAddress, m.code), R = lines('FROM (SENDER)', m.name, d.senderEmail, d.senderAddress, m.fromPin);
  const h = Math.max(L.length, R.length), edge = '+' + '-'.repeat(cw - 2) + '+';
  const row = (a, i) => '| ' + pad(a[i] || '', inner) + ' |';
  const top = [center('PERSONAL MESSAGE BY POST', cols), '', edge + ' ' + edge];
  for (let i = 0; i < h; i++) top.push(row(L, i) + ' ' + row(R, i));
  top.push(edge + ' ' + edge, '', 'Date: ' + new Date(m.at).toLocaleString('en-IN'), 'Do not open: the message is on the next sheet.');
  const sig = '_'.repeat(Math.min(26, cw - 2));
  const bottom = [('- '.repeat(cols)).slice(0, cols), '', center('ACKNOWLEDGMENT', cols), ...wrap('Message from ' + m.name + ' to ' + d.to + ' received.', cols), '', '', '',
    pad(sig, cw + 1) + sig, pad('Post Officer Sign', cw + 1) + 'Receiver Sign'];
  const fill = Math.max(1, rows - top.length - bottom.length);
  return [[...top, ...Array(fill).fill(''), ...bottom].join('\n'), wrap(d.message, cols).join('\n'), ''];
}
module.exports = { buildSheets, wrap, clean };
