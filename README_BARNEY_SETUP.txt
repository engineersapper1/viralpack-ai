ViralPack V3.1, Barney-style launch guide
=========================================

WHAT THIS PACKAGE DOES NOW
- Quiz page is clickable and playable
- User can pay $1 through Stripe Checkout
- Stripe webhook unlocks the full result
- Session and quiz data can live in Supabase, which works on Vercel
- Result page has copy-link and native share buttons

IMPORTANT
- Do NOT use the old local .env file
- Do NOT trust local JSON storage for production
- Use Supabase + Stripe before sending traffic

====================================================
PART 1, PUT THE FILES IN THE RIGHT PLACE
====================================================

1) On your computer, unzip this package.
2) Rename the folder if you want, but keep the contents together.
3) Put the folder wherever you normally keep the ViralPack project.
4) Open that folder in VS Code.
5) Delete these folders if they exist:
   - node_modules
   - .next

====================================================
PART 2, INSTALL THE NEW PACKAGES
====================================================

1) Open the terminal in VS Code.
2) Make sure you are INSIDE the project folder.
3) Run:

npm install

That installs Stripe and Supabase.

====================================================
PART 3, MAKE THE SUPABASE DATABASE
====================================================

1) Go to https://supabase.com
2) Create an account if needed.
3) Click New Project.
4) Give it a name like:
   viralpack-prod
5) Set a database password and save it somewhere safe.
6) Wait until the project finishes spinning up.
7) In Supabase, click SQL Editor.
8) Open the file in this project:
   supabase/schema.sql
9) Copy ALL the text from that file.
10) Paste it into Supabase SQL Editor.
11) Click Run.

Now the tables are created.

====================================================
PART 4, GET THE SUPABASE KEYS
====================================================

In Supabase:
1) Click Project Settings
2) Click API
3) Copy these three values:
   - Project URL
   - anon public key
   - service_role key

Now in your project folder:
1) Find the file:
   .env.example
2) Make a copy of it.
3) Rename the copy to:
   .env.local
4) Open .env.local
5) Paste the Supabase values into these lines:

NEXT_PUBLIC_SUPABASE_URL=paste_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=paste_service_role_key_here

====================================================
PART 5, MAKE THE STRIPE ACCOUNT AND PRODUCT
====================================================

1) Go to https://dashboard.stripe.com
2) Create or log in to Stripe.
3) Make sure you are in TEST mode first.
4) You do NOT need to manually create a product for this code to work.
   The checkout session creates the line item on the fly.
5) Go to Developers.
6) Click API keys.
7) Copy:
   - Publishable key
   - Secret key

Paste them into .env.local:

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=paste_publishable_key_here
STRIPE_SECRET_KEY=paste_secret_key_here

====================================================
PART 6, SET YOUR SITE URL FOR LOCAL TESTING
====================================================

In .env.local set:

NEXT_PUBLIC_SITE_URL=http://localhost:3000

Save the file.

====================================================
PART 7, START THE PROJECT LOCALLY
====================================================

Run:

npm run dev

Open:
http://localhost:3000

Test flow:
1) Open Studio
2) Build Quiz Only
3) Click the generated quiz link
4) Take quiz
5) Click Unlock for $1.00

The Stripe page should open.

====================================================
PART 8, ADD THE LOCAL STRIPE WEBHOOK
====================================================

You need the Stripe CLI for local webhook testing.

1) Install Stripe CLI from Stripe's site.
2) Open a NEW terminal window.
3) Run:

stripe login

4) Then run:

stripe listen --forward-to localhost:3000/api/stripe/webhook

5) Stripe CLI will print a webhook secret that looks like:
   whsec_XXXXXXXX

6) Copy that webhook secret.
7) Paste it into .env.local here:

STRIPE_WEBHOOK_SECRET=paste_whsec_here

8) Restart your Next.js server after saving .env.local.

====================================================
PART 9, USE A STRIPE TEST CARD
====================================================

Use this in test mode:
Card number: 4242 4242 4242 4242
Any future month/year
Any 3 digits for CVC
Any ZIP

After payment:
- Stripe sends webhook
- webhook unlocks result
- success page checks unlock status
- full reading opens

====================================================
PART 10, PUSH TO GITHUB
====================================================

In the terminal:

git status
git add .
git commit -m "ViralPack V3.1 production funnel"
git push origin main

If your branch is not main, use your real branch name instead.

====================================================
PART 11, CONNECT OR UPDATE VERCEL
====================================================

1) Go to https://vercel.com
2) Open your ViralPack project
3) Make sure it is connected to the correct GitHub repo
4) In Vercel, go to Settings
5) Go to Environment Variables
6) Add every value from .env.local EXCEPT do not use localhost for production

For production set:
NEXT_PUBLIC_SITE_URL=https://your-real-domain.com

Add these in Vercel:
- OPENAI_API_KEY
- NEXT_PUBLIC_SITE_URL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

7) Save env vars.
8) Redeploy the project.

====================================================
PART 12, MAKE THE LIVE STRIPE WEBHOOK
====================================================

After Vercel deploys and you know your real domain:

1) In Stripe dashboard, still in TEST mode first
2) Go to Developers
3) Go to Webhooks
4) Click Add endpoint
5) Put this as the endpoint URL:

https://your-real-domain.com/api/stripe/webhook

6) Select the event:
   checkout.session.completed
7) Save
8) Stripe gives you a webhook signing secret
9) Copy it
10) Put it into Vercel env vars as:

STRIPE_WEBHOOK_SECRET=that_whsec_value

11) Redeploy again

====================================================
PART 13, LIVE TEST BEFORE TRAFFIC
====================================================

Use the live site and test this exact path:
1) Visit home page
2) Build or open quiz
3) Take quiz
4) Click unlock
5) Pay in Stripe test mode
6) Land on success page
7) Open full reading
8) Copy result link
9) Test result link in a private browser window

====================================================
PART 14, SWITCH FROM TEST TO LIVE MONEY
====================================================

ONLY after test mode works perfectly:

1) In Stripe, switch from Test mode to Live mode
2) Copy the LIVE publishable key
3) Copy the LIVE secret key
4) Replace both in Vercel env vars
5) Create a LIVE webhook endpoint too
6) Put the LIVE webhook secret into Vercel env vars
7) Redeploy

Now real money can flow.

====================================================
PART 15, WHERE THE IMPORTANT FILES ARE
====================================================

Stripe checkout route:
app/api/stripe/checkout/route.js

Stripe webhook route:
app/api/stripe/webhook/route.js

Result status API:
app/api/result/[sessionId]/route.js

Quiz submit route:
app/api/quiz/submit/route.js

Supabase schema:
supabase/schema.sql

Environment template:
.env.example

Quiz and session storage logic:
lib/quiz_store.js

====================================================
PART 16, WHAT TO DO IF SOMETHING BREAKS
====================================================

If checkout does not open:
- check STRIPE_SECRET_KEY
- restart dev server

If payment succeeds but result stays locked:
- webhook is not reaching the app
- check STRIPE_WEBHOOK_SECRET
- check Stripe CLI locally
- check Vercel webhook endpoint in production

If quiz links fail on Vercel:
- check NEXT_PUBLIC_SITE_URL
- redeploy after fixing env vars

If nothing saves:
- Supabase keys are wrong
- or you forgot to run supabase/schema.sql

