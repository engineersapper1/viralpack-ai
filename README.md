# ViralPack Client Mailroom beta

This is a complete replacement-ready Next.js package for the **ViralPack.ai Client Mailroom** side quest.

It includes:

- Public ViralPack landing page with **Open Client Mailroom** button
- Login-only `/mailroom` beta room
- `.env` username/password login using bcrypt password hashes
- Supabase profile cache for each beta user
- CSV/XLSX/XLS upload support
- Google Sheets shared/published URL import through CSV export
- Campaign images uploaded to a public Supabase Storage bucket for email rendering
- Manual campaign mode
- One-click website/theme campaign mode
- OpenAI campaign generation tuned to sound like the actual business, not a bot
- HTML email preview
- Resend test email
- Resend batch send, capped at 100 recipients by default
- Required hard gate before final send
- Unsubscribe links and suppression list

## Important note about your existing ViralPack repo

I could not access your latest local ViralPack source files from this chat. This package is therefore a clean, standalone ViralPack + Client Mailroom beta build, not a byte-for-byte clone of your current desktop repo.

If you later drop this into your existing ViralPack app, the safest merge is:

- copy `/app/mailroom`
- copy `/app/login` if you do not already have auth
- copy `/app/api/auth`
- copy `/app/api/mailroom`
- copy `/components/MailroomApp.jsx` and `/components/LoginForm.jsx`
- copy `/lib/*mailroom*`, `/lib/auth.js`, `/lib/contactParser.js`, `/lib/campaignGenerator.js`, `/lib/emailRenderer.js`, `/lib/resendClient.js`, `/lib/supabaseAdmin.js`, `/lib/brandAnalyzer.js`, `/lib/validators.js`, `/lib/constants.js`
- run the SQL migration
- add the homepage button/link to `/mailroom`

## Install

```bash
npm install
npm run dev
```

Open:

```bash
http://localhost:3000
```

Health check:

```bash
http://localhost:3000/api/mailroom/health
```

## Environment

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

Generate password hashes:

```bash
npm run hash-password -- YourPasswordHere
```

Put the generated hashes into `MAILROOM_USERS_JSON`.

Example:

```env
MAILROOM_USERS_JSON=[{"username":"daniel","password_hash":"$2b$10$...","role":"admin","display_name":"Daniel"},{"username":"beta","password_hash":"$2b$10$...","role":"client","display_name":"Beta Tester"}]
```

## Supabase setup

1. Open Supabase SQL Editor.
2. Run `supabase/migrations/001_mailroom.sql`.
3. Confirm the `mailroom-public-assets` bucket exists and is public.
4. Add these to Vercel and local `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_MAILROOM_BUCKET=mailroom-public-assets
```

The service role key must remain server-side only.

## Resend setup

Recommended for this beta because the target volume is small, approximately 100 emails per send, and Resend has a direct Next.js/Node SDK and batch endpoint.

1. Create Resend API key.
2. Add the client sending domain in Resend.
3. Add the Resend DNS records in Cloudflare.
4. Wait for SPF/DKIM verification.
5. Add `RESEND_API_KEY` to `.env.local` and Vercel.
6. In the Client Mailroom profile, set:
   - sender name
   - sender email, for example `Client Name <hello@clientdomain.com>` is assembled from fields
   - reply-to email
   - sending domain, for example `clientdomain.com`
   - physical mailing address

The app refuses final sends until required profile fields and all hard-gate checks are complete.

## Contact sheets

Supported:

- `.csv`
- `.xlsx`
- `.xls`
- Google Sheets URL if the sheet is shared/published enough for CSV export

Recommended headers:

```text
email, first_name, last_name
```

Also detected:

```text
name, full_name, email_address, e-mail, tags
```

Google Sheets does not upload as a native `.gsheet` file here. Export/download the sheet as `.xlsx` or `.csv`, or paste a shareable Google Sheets URL and the app will try to fetch the CSV export.

## Campaign behavior

The OpenAI prompt is intentionally strict:

- no generic AI marketing voice
- no long bloated email
- no fake claims or invented discounts
- no mention of AI
- no random emojis
- short, human copy that feels like the client wrote it

Manual mode uses the client’s own message as the source.

One-click mode uses:

- business profile
- website URL
- website title/meta/headings/body copy
- website color hints
- campaign theme
- CTA URL
- optional uploaded campaign images

## Sending behavior

The beta defaults to:

```env
MAILROOM_MAX_RECIPIENTS_PER_SEND=100
```

Every recipient gets an individualized email with their own unsubscribe link. Unsubscribed emails are stored in `mailroom_suppression` and skipped on future sends.

The final send button remains disabled unless all hard gates are checked:

1. Consent / customer relationship confirmed
2. Message and links reviewed
3. Official sender/domain confirmed

## Deployment to Vercel

1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add all `.env.local` values in Vercel Project Settings.
4. Set `NEXT_PUBLIC_APP_URL=https://viralpack.ai`.
5. Deploy.
6. In Cloudflare, confirm `viralpack.ai` routes to Vercel.
7. In Resend, verify each client sending domain through Cloudflare DNS.

## Files to care about first

```text
app/page.jsx
app/mailroom/page.jsx
components/MailroomApp.jsx
app/api/mailroom/campaigns/generate/route.js
app/api/mailroom/campaigns/send/route.js
lib/campaignGenerator.js
lib/emailRenderer.js
supabase/migrations/001_mailroom.sql
```

## Beta limits by design

- No paywall
- No OracleLoom dependency
- No background queue yet
- No multi-client billing yet
- One send request capped at 100 recipients
- Uses env-based beta login, not full Supabase Auth
- Requires a verified Resend sending domain for official delivery

The next clean upgrade would be a send queue plus campaign history dashboard with opens/clicks from Resend webhooks.
