# Heroku Login & Deployment Guide

This project is prepared for Heroku with a `Procfile`:

- `release`: runs Prisma migrations (`npx prisma migrate deploy`)
- `web`: starts Next.js app (`npm run start`)

---

## 1) Prerequisites

- Heroku account
- Heroku CLI installed
- Git installed
- A production PostgreSQL database URL (Heroku Postgres or external)

---

## 2) Login to Heroku

```powershell
heroku login
```

If browser login does not work in your environment:

```powershell
heroku login -i
```

---

## 3) Create (or select) Heroku app

```powershell
cd C:\Development\project\ontooff
heroku create your-app-name
```

If app already exists:

```powershell
heroku git:remote -a your-app-name
```

---

## 4) Set Node version (optional but recommended)

Heroku uses `package.json` `engines` if present. If not set, pin in Heroku:

```powershell
heroku config:set NODE_ENV=production -a your-app-name
```

---

## 5) Add required environment variables

Set these at minimum:

```powershell
heroku config:set DATABASE_URL="<your-production-postgres-url>" -a your-app-name
heroku config:set NEXTAUTH_URL="https://your-app-name.herokuapp.com" -a your-app-name
heroku config:set NEXTAUTH_SECRET="<strong-random-secret>" -a your-app-name
heroku config:set NEXT_PUBLIC_APP_URL="https://your-app-name.herokuapp.com" -a your-app-name
heroku config:set NEXT_PUBLIC_APP_NAME="ontooff" -a your-app-name
```

Optional (only if used):

```powershell
heroku config:set GOOGLE_CLIENT_ID="<google-client-id>" -a your-app-name
heroku config:set GOOGLE_CLIENT_SECRET="<google-client-secret>" -a your-app-name
heroku config:set SMTP_HOST="smtp.gmail.com" -a your-app-name
heroku config:set SMTP_PORT="587" -a your-app-name
heroku config:set SMTP_SECURE="false" -a your-app-name
heroku config:set SMTP_USER="<smtp-user>" -a your-app-name
heroku config:set SMTP_PASSWORD="<smtp-password>" -a your-app-name
heroku config:set EMAIL_FROM="ontooff <no-reply@yourdomain.com>" -a your-app-name
```

---

## 6) Push to Heroku

From branch `main`:

```powershell
git push heroku main
```

If Heroku app has previous history and you need overwrite:

```powershell
git push heroku main --force
```

---

## 7) Verify release, logs, and app

```powershell
heroku releases -a your-app-name
heroku logs --tail -a your-app-name
heroku open -a your-app-name
```

---

## 8) Useful operations

Restart app:

```powershell
heroku restart -a your-app-name
```

Run Prisma generate/migrate manually:

```powershell
heroku run npx prisma generate -a your-app-name
heroku run npx prisma migrate deploy -a your-app-name
```

Scale dynos:

```powershell
heroku ps:scale web=1 -a your-app-name
```

---

## 9) Common issues

- **App crashes on boot**: check `heroku logs --tail` for missing env vars.
- **Prisma DB errors**: verify `DATABASE_URL` and DB SSL requirements.
- **Auth callback mismatch**: ensure `NEXTAUTH_URL` exactly matches your Heroku URL.
- **Google OAuth fails**: add `https://your-app-name.herokuapp.com/api/auth/callback/google` to Google authorized redirect URIs.

---

## 10) Quick checklist

- [ ] Logged in with `heroku login`
- [ ] App created/linked
- [ ] `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` configured
- [ ] `git push heroku main` completed
- [ ] App opens and auth flow works
