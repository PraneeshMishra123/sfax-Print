// Only printers whose name/description looks like a dot matrix (impact) printer are allowed.
// This is a name check: it cannot prove the hardware (a renamed printer could pass).
const DEFAULTS = ['LX-?\\d{3}', 'FX-?\\d{3,4}', 'LQ-?\\d{3,4}', '\\bMSP\\b', '\\bTVS\\b', 'dot[\\s-]?matrix', 'text only', 'ESC/?P'];
function allowed(p, patterns) {
  const re = (patterns && patterns.length ? patterns : DEFAULTS).map(s => new RegExp(s, 'i'));
  const hay = [p.name, p.displayName, p.description].filter(Boolean).join(' | ');
  return re.some(r => r.test(hay));
}
module.exports = { allowed, DEFAULTS };
