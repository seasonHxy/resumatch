# ResuMatch — Owner's Manual

> Everything you need to run, deploy, and monetize this product. No coding required for day-to-day operation.

## What this is

ResuMatch is an ATS resume keyword scanner. Users paste their resume + a job description and instantly see a match score, missing keywords, and improvement tips. The analysis runs **100% in the browser** — there is no backend, no database, no API costs, and no user data liability.

**Business model:** free tool (top 5 missing keywords) → $19 one-time Pro unlock (full keyword list, requirements flags, PDF export) sold via Gumroad.

## Running locally

```bash
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # production build → dist/
```

Requires Node.js 22+ (see `.nvmrc`).

## Deploying (10 minutes, free)

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import the repo → Deploy (zero config needed)
3. Add your custom domain in Vercel → Settings → Domains

Netlify / Cloudflare Pages work identically. Hosting cost: $0.

## Connecting payments (Gumroad, 15 minutes)

1. Create a Gumroad product: name "ResuMatch Pro", price $19, type **digital product**
2. In the product settings, enable **Generate a unique license key per sale**
3. Copy the **product ID** (Gumroad → product → Advanced) into
   [src/config.ts](src/config.ts) → `GUMROAD_PRODUCT_ID`
4. Put your product page URL into `GUMROAD_URL`
5. Rebuild & deploy

That's it — the app verifies license keys against the Gumroad API client-side.
While `GUMROAD_PRODUCT_ID` is empty, the demo key `RESUMATCH-DEMO-2026` unlocks
Pro for testing; it stops working automatically once a real product ID is set.

LemonSqueezy alternative: swap the fetch URL in `App.tsx → verifyLicense()` —
their license API is nearly identical.

## How the engine works (src/lib/analyze.ts)

1. Extracts uni/bi/trigram candidate keywords from the job description
2. Weights them: frequency (capped ×4) × requirements-section bonus (×2) × known-skill bonus (×2.5) × phrase bonus (×1.3)
3. Matches against the resume with light stemming (plurals, -ed, -ing)
4. Score = matched weight ÷ total weight
5. Also computes resume-quality stats: quantified lines, action-verb bullet ratio, length

To tune results: edit `KNOWN_SKILLS` (boosted terms) and `STOPWORDS` (ignored terms) at the top of the file.

## Growth playbook (what the next owner should do)

- **SEO**: add `/blog` with articles targeting "resume keywords for [role]" long-tails — the tool page converts that traffic well
- **Reddit/communities**: r/resumes, r/jobsearchhacks allow tool mentions in comments when genuinely helpful
- **Programmatic pages**: one landing page per job title ("ATS check for Product Managers") — the engine already supports any role
- **Pricing test**: $19 → $29 with a launch-discount banner
- **Affiliate**: resume-template and interview-prep products pay 30–50% commissions; natural fit in the results page

## Costs to operate

| Item | Cost |
|---|---|
| Hosting (Vercel/Netlify free tier) | $0 |
| Domain | ~$12/year |
| Gumroad | 10% + processing per sale |
| **Total fixed** | **~$1/month** |
