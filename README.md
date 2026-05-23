# MarketEye — Two Trading Templates

This build combines your two templates into one web app:

- **Rise/Fall** template — chart, Rise/Fall controls, SmartCharts, positions.
- **Digits Market** template — no-chart digit market layout for Matches/Differs, Over/Under, and Even/Odd.

A switcher appears at the top of the app so users can choose either **Rise/Fall** or **Digits Market**.

## Environment variables

Set these in Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_DERIV_APP_ID=331ArfuZVDOjqzJpj764j
NEXT_PUBLIC_DERIV_REDIRECT_URI=https://YOUR-VERCEL-LINK.vercel.app
NEXT_PUBLIC_DERIV_APP_NAME=MarketEye
NEXT_PUBLIC_DERIV_REFERRAL_LINK=https://deriv.com/?t=dFoNTYtY_QWcO_rre4DfsGNd7ZgqdRLk&utm_source=affiliate_219451&utm_medium=affiliate&utm_campaign=MyAffiliates&utm_content=&referrer=
NEXT_PUBLIC_DERIV_OAUTH_SCOPES=trade
NEXT_PUBLIC_DERIV_ENV=production
NEXT_PUBLIC_FONT_FAMILY=Inter
NEXT_PUBLIC_PRIMARY_COLOR=#00C390
```

Your Deriv registered app redirect URL must exactly match `NEXT_PUBLIC_DERIV_REDIRECT_URI`.

## Local run

```bash
npm install
npm run dev
```

## Deploy

Upload/import this project to Vercel, set the env variables, then redeploy.
