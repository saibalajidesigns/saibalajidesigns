# Sai Balaji — Vercel portfolio

This package preserves the consolidated Hostinger design, images, CV, mobile
font adjustments, alignment fixes, transparent favicon and hover zoom. Only the
contact backend and deployment structure have changed.

## Deploy using GitHub + Vercel

1. Extract the ZIP on your computer.
2. Create a new GitHub repository (private is fine). Upload the extracted contents
   into the repository root. You should see package.json, vercel.json, api,
   public and scripts at the top level. Do not upload just the ZIP itself.
3. In Vercel choose Add New > Project and import that repository.
4. Choose Framework Preset: Other. Root Directory: repository root.
   The included vercel.json sets Build Command to npm run build and Output
   Directory to dist. Leave Install Command at its default. Node is pinned to 22.x.
5. Before deploying, add these Environment Variables:

| Name | Value |
| --- | --- |
| SMTP_USERNAME | Your full Gmail address used to create the App Password |
| SMTP_PASSWORD | Your Google App Password, without spaces |
| CONTACT_TO | saibalaji.design@gmail.com (or your preferred receiving address) |

Add them to Production; also add them to Preview if you want forms on preview
URLs to work. Never put the password in public files, GitHub, or this chat.
Your Gmail App Password remains on Hostinger; this package does not contain it.
You can create a separate Google App Password named Vercel Portfolio.

6. Click Deploy. Open the resulting vercel.app address.
7. If you added or changed environment variables after deploying, redeploy.
8. Test images, filters, hover zoom on desktop, CV download, mobile typography,
   and one contact enquiry. Confirm delivery in Gmail (including Spam).

No Hostinger changes, DNS changes or custom domain are required for a vercel.app
address. Keep the Hostinger site running during verification.

## CLI alternative

From the extracted directory, with Node.js installed:

    npm install
    npx vercel

Follow the prompts to create/link a project. Add the environment variables in
the Vercel dashboard, then run:

    npx vercel --prod

## Architecture and maintenance

- public/: only browser-safe assets and the original frontend.
- api/contact.js: Node.js serverless function using Nodemailer and Gmail SMTP
  over TLS on port 465. Sender is SMTP_USERNAME; Reply-To is the visitor.
- scripts/build.cjs: copies public into dist; Vercel separately deploys api.
- No PHP, .htaccess, private/config.php, or filesystem-backed sessions required.
- Credentials are read only on the server from Vercel environment variables.
- Form uses JSON, signed CSRF tokens, a secure same-site cookie, same-origin
  validation, bounded fields, a honeypot, and best-effort in-memory throttling.
- Throttling is per warm instance, NOT a durable shared abuse limit. Cold starts
  and multiple instances reset/separate the counters. For stronger abuse control,
  configure Vercel Firewall rate limiting if available for your plan or add a
  shared datastore / verified CAPTCHA. No external anti-spam service is configured.
- Optional CSRF_SECRET can be set to a random server-side secret; otherwise the
  token signature uses the Gmail App Password as its server-side key.
- The form requires HTTPS, as provided by the deployed Vercel site.

## Verification

npm test: six backend tests pass with SMTP mocked (no email sent). Tests cover
successful routing and Reply-To, missing settings, bad input, origin/CSRF checks,
honeypot, SMTP failure, method/type/size handling, and per-instance throttling.
npm run build and JavaScript syntax checks passed. Asset references and ZIP
integrity checked. No fresh visual browser check or real Vercel deployment/SMTP
send was performed. First production submission is the final delivery check.

Sources:
https://vercel.com/docs/functions/runtimes/node-js
https://vercel.com/docs/project-configuration
https://vercel.com/docs/deployments
https://nodemailer.com/smtp
