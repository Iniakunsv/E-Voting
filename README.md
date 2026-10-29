# E-Voting Minimal (Next.js + Supabase)

Starter project for a small one-day election with two candidates, unique voter codes, a shared access form, and an admin dashboard.

## 1. Install and configure

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with your Supabase project URL, service role key, admin password, session secret, and schedule. Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## 2. Database setup

In Supabase SQL Editor, run `supabase/schema.sql`.

Create voter codes before election day. The database stores SHA-256 hashes, not the original codes. Example generation for each voter can be done locally with Node.js:

```js
const { createHash, randomBytes } = require("node:crypto");
const code = "VOTE-" + randomBytes(6).toString("hex").toUpperCase();
const code_hash = createHash("sha256").update(code).digest("hex");
console.log({ code, code_hash });
```

Insert each `code_hash` into `public.voter_codes` using the Supabase SQL editor or a trusted server-side script. Give the original code privately to the corresponding voter. Never publish a list of unused codes.

## 3. Shared login behavior

- The main form says only “Masuk” and “Kode akses”; it does not label the user as voter or admin.
- A voter enters their unique voting code.
- Admin can enter the admin password in the same form; the server recognizes it and returns the admin dashboard.
- The separate “Dashboard Admin” button opens a password popup. It does not expose the password in frontend code.

## 4. Configure candidates and schedule

Edit candidate names in `app/page.tsx` and `lib/voting.ts`. Keep IDs exactly `paslon-1` and `paslon-2` unless you also update the SQL constraint.

Set `VOTING_START` and `VOTING_END` as ISO timestamps with `+07:00` for WIB. The vote API checks the server time on every submission. The results endpoint withholds results until the scheduled end time.

## 5. Deploy to Vercel

1. Push this project to your own GitHub repository.
2. Import it into Vercel.
3. Add all variables from `.env.example` in Vercel Project Settings → Environment Variables.
4. Deploy and test with dummy codes before election day.

## Important limitations before real use

- This is a starter implementation, not a certified election system.
- Add rate limiting to login endpoints and test race conditions, recovery, backups, and audit requirements before use.
- The admin password is compared server-side, but for a higher-assurance deployment use a managed auth provider, strong password policy, and rate limiting.
- Results are hidden until the configured end time; this sample does not yet provide a separate admin-controlled “open/close early” feature.
- The UI displays placeholder candidate names. Replace them before use.
- Avoid collecting identity details in the vote record. The sample associates a voter ID with a vote to enforce one vote per code; if ballot secrecy is essential, redesign the database flow to separate eligibility tracking from anonymous ballots.
