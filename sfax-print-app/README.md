# SFAX Print (post office app)

Decrypts and prints SFAX messages. Without this app a message cannot be opened or printed.

## What it does
- Creates the post office's secret key on THIS computer (kept encrypted by Windows) and sends only the public key and an
  encrypted backup (for the SFAX owner) to the server.
- Downloads the encrypted message, decrypts it in memory, and sends it straight to a dot matrix printer.
  The message is never shown on screen, never saved to disk, and the window blocks screenshots.
- Prints only on printers whose name looks like a dot matrix printer (Epson LX/FX/LQ, TVS MSP, "Generic / Text Only", ...).
  This is a name check, so it is a rule, not a proof of the hardware. Change the list in `config.json` -> `allowedPrinters`.
- Prints 3 sheets: (1) receiver left / sender right, dotted tear line, ACKNOWLEDGMENT with Post Officer Sign and Receiver Sign;
  (2) the message; (3) blank. Plain text only (English letters; other scripts print as "?").
- Keeps a print log (no message content) in the app's data folder.

## Before building: edit config.json
- `server`: your site address, e.g. https://sfax-xxxx.onrender.com
- `escrowFingerprint`: the fingerprint printed by `node tools/owner-tool.js keygen`. The app refuses to set up keys if the
  server's backup key does not match it (protects against a swapped backup key).

## Build the Windows installer (on a computer with internet)
1. Install Node.js 20 or newer.
2. In this folder: `npm install`
3. Try it: `npm start`
4. Installer: `npm run dist` -> `dist/SFAX Print Setup 1.0.0.exe`
5. Auto-update: set your GitHub name in package.json (`build.publish`), then `npx electron-builder --win --publish always`
   with a GITHUB_TOKEN. For public rollout, sign the installer with a code-signing certificate, otherwise Windows shows
   an "unknown publisher" warning.
6. In Render > Environment set `MIN_APP_VERSION=1.0.0` (raise it when you release a newer app). From then on the server
   only releases messages to this app (version header). That header can be faked, so the real protection is that only the
   app's key can decrypt.

## Printing on cyclostyle (stencil) sheets
- A dot matrix printer cuts a stencil only with the ribbon removed (or a spare ribbon-less pass). Follow your stencil
  maker's instructions; the app cannot detect the ribbon or the paper.
- Windows keeps a temporary copy of print jobs. In the printer's Properties > Advanced choose "Print directly to the
  printer" (no spooling), and use the "Generic / Text Only" driver if available: it is fast and prints plain text.
- A cut stencil keeps the text cut through the sheet. It can be read against light and can be used to run copies, so seal
  it immediately and hand it over; do not keep or reuse it.

## Tests
`npm test` checks the sheet layout and the printer allow-list.
