const $ = (i) => document.getElementById(i);
let timer = null, printers = [];
const show = (v) => ['vLogin', 'vSetup', 'vMain'].forEach(x => $(x).classList.toggle('hide', x !== v));
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.remove('hide'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.add('hide'), 3000); }
$('bLogin').onclick = async () => {
  $('eLogin').textContent = '';
  const r = await sfax.login($('pin').value.trim(), $('pw').value, $('create').checked);
  if (!r.ok) return $('eLogin').textContent = r.error;
  $('pw').value = ''; $('hTitle').textContent = 'SFAX Print · Post office ' + r.pin;
  if (!r.hasKey) return show('vSetup');
  enter();
};
$('bSetup').onclick = async () => {
  $('eSetup').textContent = ''; $('oSetup').textContent = '';
  const r = await sfax.setup();
  if (!r.ok) return $('eSetup').textContent = r.status === 409 ? 'A key already exists for this post office. Use the recovery file from the SFAX owner.' : r.error;
  $('oSetup').textContent = 'Done. Key fingerprint: ' + r.fingerprint; setTimeout(enter, 1500);
};
$('bRecover').onclick = async () => {
  $('eSetup').textContent = '';
  const r = await sfax.recover($('rp').value);
  if (!r.ok) return $('eSetup').textContent = r.error;
  if (r.canceled) return; $('rp').value = ''; enter();
};
sfax.info().then(i => { if (i.ok) $('diag').textContent = 'SFAX Print v' + i.version + ' · server: ' + i.server; });
$('bExport').onclick = async () => {
  $('xmsg').textContent = '';
  const x = await sfax.exportKey($('xp').value);
  $('xmsg').textContent = !x.ok ? x.error : x.canceled ? '' : 'Key file saved.';
  if (x.ok && !x.canceled) $('xp').value = '';
};
$('bOut').onclick = async () => { clearInterval(timer); await sfax.logout(); show('vLogin'); };
async function enter() {
  show('vMain');
  const p = await sfax.printers(); printers = p.ok ? p.printers : [];
  $('sel').innerHTML = ''; printers.forEach(n => { const o = document.createElement('option'); o.textContent = n; $('sel').appendChild(o); });
  const note = $('note');
  note.className = printers.length ? 'note' : 'note on';
  note.textContent = printers.length ? '' : 'No dot matrix printer found. Printers on this computer: ' + ((p.blockedNames || []).join(', ') || 'none') + '. Only dot matrix printers are allowed. If yours is one, tell the SFAX team its exact name. Printing is disabled.';
  refresh(); clearInterval(timer); timer = setInterval(refresh, 5000);
}
async function refresh() {
  const r = await sfax.inbox(); if (!r.ok) return;
  const tb = $('rows'); tb.innerHTML = '';
  r.items.forEach(m => {
    const tr = document.createElement('tr'), cell = (t) => { const td = document.createElement('td'); td.textContent = t; tr.appendChild(td); return td; };
    cell(m.name); cell(m.code); cell(new Date(m.at).toLocaleString('en-IN'));
    const st = cell(''), sp = document.createElement('span'); sp.className = 'pill ' + (m.printed ? 'done' : 'go'); sp.textContent = m.printed ? 'PRINTED' : 'TO PRINT'; st.appendChild(sp);
    const td = cell(''), b = document.createElement('button'); b.className = 'btn sm'; b.textContent = m.printed ? 'Print again' : 'Print 3 sheets'; b.disabled = !printers.length;
    b.onclick = async () => { b.disabled = true; const x = await sfax.print(m.id, $('sel').value); toast(x.ok ? 'Printed.' : x.error); b.disabled = !printers.length; refresh(); };
    td.appendChild(b); tb.appendChild(tr);
  });
  $('empty').textContent = r.items.length ? '' : 'No messages yet.';
}
