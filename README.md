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
- `escrowFingerprint`: the fingerprint printed by `node tools/owner-tool.js keygen` (run it once on YOUR computer; it also prints the
  ESCROW_PUBLIC_KEY value for Render and saves `escrow-private.json`, which you must keep safe and never upload).
- `escrowFingerprint`, details: The app refuses to set up keys if the
  server's backup key does not match it (protects against a swapped backup key).

## Build the Windows installer (on a computer with internet)
1. Install Node.js 20 or newer.
2. In this folder: `npm install`
3. Try it: `npm start`
4. Installer: `npm run dist` -> `dist/SFAX-Print-Setup.exe` (the name stays the same for every version)
5. Auto-update: set your GitHub name in package.json (`build.publish`), then `npx electron-builder --win --publish always`
   with a GITHUB_TOKEN. For public rollout, sign the installer with a code-signing certificate, otherwise Windows shows
   an "unknown publisher" warning.
6. In Render > Environment set `MIN_APP_VERSION=1.0.1` (raise it when you release a newer app). From then on the server
   only releases messages to this app (version header). That header can be faked, so the real protection is that only the
   app's key can decrypt.

## Printing on cyclostyle (stencil) sheets
- A dot matrix printer cuts a stencil only with the ribbon removed (or a spare ribbon-less pass). Follow your stencil
  maker's instructions; the app cannot detect the ribbon or the paper.
- Windows keeps a temporary copy of print jobs. In the printer's Properties > Advanced choose "Print directly to the
  printer" (no spooling), and use the "Generic / Text Only" driver if available: it is fast and prints plain text.
- A cut stencil keeps the text cut through the sheet. It can be read against light and can be used to run copies, so seal
  it immediately and hand it over; do not keep or reuse it.

## Recovering a post office that lost its key
`node tools/owner-tool.js recover <PIN>` (needs OWNER_TOKEN set on Render and your escrow-private.json). It writes
`sfax-recovery-<PIN>.json`; send it to the post office with its passphrase.

## Tests
`npm test` checks the sheet layout and the printer allow-list.

## How post offices get the app
You do not send a link. After a post office registers on the website, a popup shows the download button. Publish the
installer as a GitHub release and set `APP_DOWNLOAD_URL` on Render (see the website README, "Download popup").

## Using a second computer (version 1.0.1+)
The secret key is created on the first computer and stays there. To use the same post office on another computer:
1. First computer: open SFAX Print > "Use this post office on another computer" > choose a passphrase > "Create key file".
2. Copy the file to the other computer (USB stick or email) and tell the passphrase by phone.
3. Other computer: install SFAX Print, login with the same PIN and password, click "Choose key file", enter the passphrase.
If the first computer is lost or still on version 1.0.0, ask the SFAX owner for a recovery file instead (same screen).
