# ActivityTracker

A production-ready platform for booking and managing outdoor activities — camping, fishing, kayaking, hiking and more. Features interactive SVG maps, multi-step booking, embeddable widgets, owner/admin panels, and full i18n (English + Serbian).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| UI | Material UI v9, Emotion |
| Auth | NextAuth v4 (Credentials + Google OAuth) |
| Database | PostgreSQL + Prisma ORM v6 |
| Forms | React Hook Form + Zod |
| i18n | i18next + react-i18next (EN, SR) |
| Testing | Jest + React Testing Library |
| Email | Nodemailer (SMTP) |

---

## Prerequisites

- **Node.js** v20.19+ or v22+
- **PostgreSQL** 14+ running locally or remotely
- **npm** v10+

---

## Local Development

### 1. Clone & install

```bash
git clone <repo-url>
cd ActivityTracking
npm install --legacy-peer-deps
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```dotenv
# Required — PostgreSQL connection string
DATABASE_URL="postgresql://postgres:root@localhost:5432/activity_tracking"

# Required — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-32-char-secret-here"

# Optional — Google OAuth (leave empty to use email/password only)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Optional — SMTP email sending (leave empty to skip email delivery)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="ActivityTracker <no-reply@yourdomain.com>"

# Public app URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="ActivityTracker"
```

> **Tip:** To spin up PostgreSQL instantly with Docker:
> ```bash
> docker run --name activitydb -e POSTGRES_PASSWORD=root -e POSTGRES_DB=activity_tracking -p 5432:5432 -d postgres:16
> ```

### 3. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate

# Seed with demo data
npm run db:seed
```

The seed creates:

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@activitytracker.com` | `Admin123!` |
| Place Owner | `owner@greenvalley.com` | `Owner123!` |

It also creates a sample place (Green Valley Resort) with locations, spots, pricing rules, an embed token, and a sample booking.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

```bash
npm run dev            # Start dev server (Turbopack)
npm run build          # Production build
npm run start          # Start production server
npm run lint           # ESLint

npm run test           # Run Jest tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

npm run db:generate    # Regenerate Prisma client after schema changes
npm run db:migrate     # Create & apply a new migration (dev)
npm run db:migrate:prod  # Apply pending migrations (production)
npm run db:seed        # Seed demo data
npm run db:studio      # Open Prisma Studio (DB browser)
npm run db:reset       # Drop & recreate DB + re-seed (dev only!)
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Super-admin panel (users, places, registrations)
│   ├── api/                # API routes
│   │   ├── auth/           # NextAuth + email verify + signup
│   │   ├── places/         # Places CRUD
│   │   ├── activity-locations/  # Locations CRUD
│   │   ├── registrations/  # Bookings CRUD + by-token lookup
│   │   ├── pricing/        # Pricing rules + /calculate endpoint
│   │   └── embed-tokens/   # Embed token management
│   ├── auth/               # Sign-in, sign-up, verify-email, deactivated
│   ├── embed/[token]/      # Public embeddable booking widget
│   ├── owner/              # Place-owner panel
│   └── registration/       # Edit booking by token
├── components/
│   ├── layout/             # Navbar
│   ├── map/                # SpotMap SVG component
│   ├── registration/       # RegistrationStepper (5-step booking form)
│   └── ui/                 # LanguageSwitcher
├── i18n/
│   ├── locales/en/         # English translations
│   └── locales/sr/         # Serbian translations
├── lib/                    # prisma, auth, email, pricing, utils
├── types/                  # Shared TypeScript types
└── __tests__/              # Jest test suites
prisma/
├── schema.prisma           # Database schema
├── seed.ts                 # Demo data seeder
└── migrations/             # SQL migration history
```

---

## Key URLs

| Page | URL |
|---|---|
| Home | `/` |
| Sign In | `/auth/signin` |
| Sign Up | `/auth/signup` |
| Admin Dashboard | `/admin` |
| Owner Dashboard | `/owner` |
| Owner Places | `/owner/places` |
| Owner Bookings | `/owner/bookings` |
| Embedded Widget | `/embed/[token]` |
| Edit Booking | `/registration/edit/[token]` |

---

## Google OAuth Setup (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Credentials** → **Create OAuth Client ID**
3. Application type: **Web application**
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy **Client ID** and **Client Secret** into `.env`

---

## Embedding the Booking Widget

Place owners can generate embed tokens from the **Owner Panel → Place → Embed Tokens** tab.

Use the generated direct link:
```
https://yourdomain.com/embed/<token>
```

Or embed as an iframe:
```html
<iframe
  src="https://yourdomain.com/embed/<token>"
  width="100%"
  height="700"
  frameborder="0"
  allow="payment"
></iframe>
```

---

## Running Tests

```bash
npm run test
# or with coverage
npm run test:coverage
```

Tests are located in `src/__tests__/` and cover the pricing engine and utility functions.

---

## Deployment

### Option A — Vercel (recommended)

1. Push the repo to GitHub/GitLab
2. Import the project on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example` in the Vercel dashboard
4. Set **Framework Preset** to `Next.js`
5. Deploy — Vercel handles builds automatically

**Post-deploy:**
```bash
# Run migrations against your production database
DATABASE_URL="<prod-url>" npx prisma migrate deploy
```

### Option B — Docker + VPS

#### 1. Build the Docker image

Create a `Dockerfile` at the project root:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

Enable standalone output in `next.config.mjs`:
```js
const nextConfig = {
  output: 'standalone',
  // ... rest of config
};
```

```bash
docker build -t activitytracker .
docker run -p 3000:3000 --env-file .env activitytracker
```

#### 2. With Docker Compose

```yaml
# docker-compose.yml
version: '3.9'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: activity_tracking
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - db
    command: >
      sh -c "npx prisma migrate deploy && node server.js"

volumes:
  pgdata:
```

```bash
docker compose up -d
```

### Option C — Manual VPS (PM2)

```bash
# On your server
git clone <repo-url> /var/www/activitytracker
cd /var/www/activitytracker
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run build

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name activitytracker -- start
pm2 save
pm2 startup
```

Use **Nginx** as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then obtain an SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_URL` | ✅ | Full URL of your app (e.g. `https://yourdomain.com`) |
| `NEXTAUTH_SECRET` | ✅ | Random 32+ char secret for session signing |
| `GOOGLE_CLIENT_ID` | ⚪ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ⚪ | Google OAuth client secret |
| `SMTP_HOST` | ⚪ | SMTP server hostname |
| `SMTP_PORT` | ⚪ | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_SECURE` | ⚪ | `true` for SSL (port 465), `false` for TLS |
| `SMTP_USER` | ⚪ | SMTP login username |
| `SMTP_PASSWORD` | ⚪ | SMTP login password / app password |
| `EMAIL_FROM` | ⚪ | Sender name + address for outgoing emails |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL (used in email links) |
| `NEXT_PUBLIC_APP_NAME` | ⚪ | App name shown in UI |

---

## License

MIT
