# App store submission — Zero Glutes Given

Everything needed to put the PWA on Google Play and the Apple App Store.
The app is a web app; both store apps are thin wrappers that load
`https://zeroglutes.culebramaps.com`.

## Files here
| File | What it's for |
|---|---|
| `listing.md` | Titles, descriptions, keywords, privacy-form answers for both stores |
| `screenshots/*.png` | 1290×2796 (iPhone 6.7"/6.9", also fine for Play phone). 6 shots. |
| `../public/privacy.html` | Privacy policy → served at `/privacy.html` |
| `../public/.well-known/assetlinks.json` | Android TWA domain verification — **needs the signing fingerprint pasted in** |

---

## Google Play (Trusted Web Activity)

**One-time setup**
1. Create a Google Play Console account — **$25 one-time**, needs a government ID. (Google, Inc. sign-up.)
2. Go to https://www.pwabuilder.com → enter `https://zeroglutes.culebramaps.com` → **Package for stores → Android**.
   - Package ID: `com.culebramaps.zeroglutes` (must match `assetlinks.json`)
   - Let PWABuilder generate a new signing key. **Download and back up the `.keystore` + its passwords** — losing it means you can never update the app.
3. PWABuilder shows a **SHA-256 fingerprint**. Paste it into `public/.well-known/assetlinks.json`, replacing the placeholder. Commit + push + wait for deploy.
   - Verify: `curl https://zeroglutes.culebramaps.com/.well-known/assetlinks.json`
4. In Play Console: create the app, upload the `.aab` from PWABuilder.
5. Fill in: store listing (from `listing.md`), Data safety form (answers in `listing.md`), content rating questionnaire, target audience (13+), privacy policy URL `https://zeroglutes.culebramaps.com/privacy.html`.
6. Add screenshots (min 2 phone). Add a 512×512 icon (`public/pwa-512.png`) and a 1024×500 feature graphic (needs to be made).
7. Submit. Review is usually 1–3 days.

**Updates:** the wrapper loads the live site, so normal web deploys ship instantly. Only re-upload the `.aab` if you change the icon, name, or package config.

---

## Apple App Store (Capacitor wrapper)

A bare web-view wrapper gets rejected under guideline 4.2. Capacitor gives a real
native project you can add one or two native capabilities to.

**One-time setup**
1. Apple Developer Program — **$99/year**, needs a government ID. (You.)
2. In the repo:
   ```bash
   npm i @capacitor/core @capacitor/ios
   npm i -D @capacitor/cli
   npx cap init "Zero Glutes Given" com.culebramaps.zeroglutes --web-dir=dist
   npm run build
   npx cap add ios
   npx cap sync
   ```
3. Point the wrapper at the live site (in `capacitor.config.json`):
   ```json
   { "server": { "url": "https://zeroglutes.culebramaps.com" } }
   ```
   Or bundle `dist/` and skip the server URL — either works; bundling is friendlier to review.
4. Add at least one native capability so it's not "just a website":
   - `@capacitor/geolocation` (native location prompt instead of the web one), or
   - `@capacitor/share` (native share sheet), or
   - `@capacitor/camera` (native photo capture for posts)
5. `npx cap open ios` → in Xcode set the bundle ID, team, app icon, launch screen.
6. Archive → upload with Xcode Organizer or Transporter.
7. In App Store Connect: listing (from `listing.md`), screenshots (min 1 for 6.9"),
   App Privacy answers (in `listing.md`), privacy policy URL, age rating.
8. Submit. Budget for 1–2 rejection rounds; each review is ~1–2 days.

**Updates:** if pointed at the live URL, web deploys ship instantly. A new binary
is only needed for native-layer changes or to satisfy "what's new".

---

## Still to make (not blockers, but Play/Apple ask for them)
- **Feature graphic** 1024×500 (Play) — simple branded banner
- **App preview video** (optional, both stores)
- A dedicated support email (both listings show it publicly — `huntergray99@gmail.com` works but a `@culebramaps.com` address is cleaner)
