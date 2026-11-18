// Run: node test/unit.js
const assert = require('assert'), L = require('../lib/layout');
const d = { to: 'Priya', message: 'Dear Priya,\n\nThank you for always listening this year. It meant a great deal to me and I wanted to say so in person, but a letter will do for now.\n\nRahul', senderEmail: 'rahul@example.com', receiverEmail: 'priya@example.com', senderAddress: '8-2-120, Park Lane, Banjara Hills, Hyderabad, Telangana 500034', toAddress: '12-4-56, Gandhi Road, Ameerpet, Hyderabad, Telangana 500016' };
const s = L.buildSheets(d, { name: 'Rahul', code: '500016', at: Date.now() }, { cols: 76, rows: 30 });
assert.strictEqual(s.length, 3, '3 sheets');
for (const sh of s) for (const line of sh.split('\n')) assert(line.length <= 76, 'line too long: ' + line);
const l1 = s[0].split('\n');
assert.strictEqual(l1.length, 60, 'sheet 1 fills the page');
assert(/TO \(RECEIVER\).*FROM \(SENDER\)/.test(l1.join('\n')), 'receiver left, sender right');
assert(l1.findIndex(x => x.includes('ACKNOWLEDGMENT')) > l1.findIndex(x => x.includes('FROM (SENDER)')), 'acknowledgment below');
assert(/^(- )+/.test(l1[l1.findIndex(x => x.includes('ACKNOWLEDGMENT')) - 2]), 'dotted tear line above acknowledgment');
assert(/Post Officer Sign\s+Receiver Sign/.test(l1[l1.length - 1]), 'signature labels at the bottom');
assert(!/FROM \(SENDER\)[\s\S]*Post office PIN: 500034/.test(s[0]) && (s[0].match(/Post office PIN/g) || []).length === 1, 'only the destination PIN is printed');
assert(!s[0].includes('Thank you for always'), 'message not on sheet 1');
assert(s[1].includes('Thank you for always') && s[1].includes('Rahul'), 'message on sheet 2');
assert.strictEqual(s[2].trim(), '', 'sheet 3 blank');
assert(!/[^\x20-\x7E\n]/.test(L.clean('caf\u00e9 \u2019quote\u2019 \u0c24\u0c46')), 'ASCII only');
const words = Array.from({ length: 200 }, (_, i) => 'word' + i).join(' ');
const long = L.buildSheets({ ...d, message: words }, { name: 'Rahul', code: '500016', at: Date.now() }, { cols: 76, rows: 60 });
assert(long.length >= 4, 'long message has several message sheets: ' + long.length);
assert.strictEqual(long[0], s[0], 'first sheet is unchanged by message length');
assert.strictEqual(long[long.length - 1].trim(), '', 'last sheet is still blank');
const mid = long.slice(1, -1); mid.forEach((sh, i) => { assert(sh.split('\n').length <= 60, 'a message sheet fits one page'); assert(sh.includes('sheet ' + (i + 1) + ' of ' + mid.length), 'sheet numbers'); });
assert.strictEqual(mid.join(' ').match(/word\d+/g).length, 200, 'no word is lost');
assert.strictEqual(s.length, 3, 'a short message stays on one sheet (3 sheets in all)');
assert(!/sheet 1 of/.test(s[1]), 'no sheet numbers on a one-sheet message');

// ---- printer identification
const I = require('../lib/printer-info');
const c = (p, cfg) => I.classify(p, I.DB, cfg);
assert.deepStrictEqual(I.parse1284('MFG:EPSON;CMD:ESCP2;MDL:FX-890;CLS:PRINTER;'), { manufacturer: 'EPSON', model: 'FX-890', commands: 'ESCP2', cls: 'PRINTER', description: '' });
assert.deepStrictEqual(I.usbIds('USB\\VID_04b8&PID_0005\\X1'), { vid: '04B8', pid: '0005' });
let r = c({ name: 'Dot 1', ieee1284: 'MFG:EPSON;CMD:ESCP2;MDL:FX-890;CLS:PRINTER;' }); assert(r.allowed && r.level === 'verified' && /FX-890/.test(r.model) && /IEEE 1284/.test(r.via), 'IEEE 1284 match');
r = c({ name: 'Printer on USB001', driver: 'Generic / Text Only', hardwareIds: ['USBPRINT\\EPSONLX-350_Series3E3C'] }); assert(r.allowed && /LX-350/.test(r.model), 'device id behind a generic driver');
r = c({ name: 'Front desk', usb: { vid: '04B8', pid: '0005', manufacturer: 'EPSON', product: 'EPSON LQ-350' } }); assert(r.allowed && /USB/.test(r.via), 'USB details match');
r = c({ name: 'TVS MSP 250 Star' }); assert(r.allowed && /MSP 250/.test(r.model), 'TVS by name');
r = c({ name: 'EPSON LX-9999' }); assert(r.allowed && r.level === 'probable', 'unknown model of a known series is probable');
r = c({ name: 'Counter printer' }, { allowedPrinters: ['^Counter printer$'] }); assert(r.allowed && r.level === 'approved', 'administrator approval');
for (const n of ['HP LaserJet Pro M404', 'Canon PIXMA G3000', 'Microsoft Print to PDF', 'EPSON L3150 Series', 'Brother HL-L2350DW']) { r = c({ name: n }); assert(!r.allowed && /laser|inkjet|virtual/i.test(r.reason), n + ' blocked'); }
r = c({ name: 'Generic / Text Only', driver: 'Generic / Text Only' }); assert(!r.allowed && /generic text driver/i.test(r.reason), 'text-only driver alone is not enough');
r = c({ name: 'Some printer' }); assert(!r.allowed && /Could not confirm/.test(r.reason), 'unknown printer blocked');
assert.strictEqual(I.statusText({ PrinterStatus: 3 }), 'Ready'); assert.strictEqual(I.statusText({ PrinterStatus: 3, DetectedErrorState: 8 }), 'Paper jam'); assert.strictEqual(I.statusText({ WorkOffline: true }), 'Offline');
// ---- joining Electron's list with Windows details
const W = require('../lib/win-printers');
const en = W.enrich([{ name: 'EPSON LX-350', displayName: 'EPSON LX-350' }, { name: 'Ledger' }], { printers: [{ Name: 'Ledger', DriverName: 'Generic / Text Only', PortName: 'USB001', PrinterStatus: 3 }], pnp: [
  { PNPDeviceID: 'USBPRINT\\EPSONLX-350\\7&1D&0&USB001', HardwareID: ['USBPRINT\\EPSONLX-350_Series3E3C'], Parent: 'USB\\VID_04B8&PID_0005\\ABC' }, { PNPDeviceID: 'USB\\VID_04B8&PID_0005\\ABC', Name: 'USB Printing Support', Manufacturer: 'EPSON' }] });
assert.strictEqual(en[1].driver, 'Generic / Text Only'); assert.strictEqual(en[1].usb.vid, '04B8'); assert(en[1].hardwareIds.some(h => /LX-350/.test(h)));
r = c(en[1]); assert(r.allowed && /LX-350/.test(r.model), 'queue on USB001 is identified through its USB printer device');
console.log('unit tests passed');
