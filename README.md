# ViralPack.ai Landing Page

## Local dev
1) Install Node.js (LTS): https://nodejs.org/
2) Install deps:
   npm install
3) Run:
   npm run dev
4) Open:
   http://localhost:3000

## Deploy to Vercel
1) Push this repo to GitHub
2) Import repo into Vercel: https://vercel.com/dashboard
3) Deploy
4) Add your domain in Project Settings → Domains:
   - viralpack.ai
   - www.viralpack.ai

## Waitlist
The waitlist form POSTs to /api/waitlist and logs emails in Vercel function logs.
Upgrade later to store in Postgres/Supabase, Airtable, or ConvertKit.
