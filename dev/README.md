# Dev tooling (agent / CI browser verification)

Not part of the app. This is how to visually verify changes from a sandboxed
agent environment where the headless browser can't reach `*.supabase.co`
directly. On a real device or normal machine you don't need any of this — the
app talks to Supabase directly.

## Verify a change in the browser

1. **Install once:** `npm install`, plus `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright-core`
   (Chromium is pre-installed at `/opt/pw-browsers/chromium-*/chrome-linux/chrome`).
2. **Bridge:** `node dev/supabase-bridge.mjs` → listens on `http://localhost:8443`.
3. **Metro (web):** `CI=1 EXPO_PUBLIC_SUPABASE_URL=http://localhost:8443 npx expo start --web --port 8081`
   - CI mode serves a stale bundle after edits — restart Metro after changing code.
   - If Metro won't bind (`/proc/net/tcp` has no `:1F91`): `pkill -9 node`, then
     `rm -rf .expo/web/cache node_modules/.cache/metro`, then start again. This
     dev server flakes on bind; a clean restart fixes it.
4. **Drive with Playwright** (launch with the agent proxy + `ignoreHTTPSErrors`):
   ```js
   chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
     proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
   // context: { ignoreHTTPSErrors: true }
   ```
   Two `browser.newContext()`s = two paired users (both hit the same real
   Supabase via the bridge). Onboarding → name → create/join by 6-char code.

## Notes

- The node live test `node scripts/live-test.mjs` exercises the backend
  (auth, pairing, RLS, realtime) directly — no browser needed.
- `node -e` with `@supabase/supabase-js` reaches Supabase directly from node —
  handy for checking whether a table exists, RPCs work, etc.
