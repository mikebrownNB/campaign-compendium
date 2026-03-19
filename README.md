# Pungeons & Flagons — Volitaire Petrius Campaign Dossier

A full-stack campaign management web app for the **Pungeons & Flagons** TTRPG campaign, built with **Next.js 14**, **Supabase**, and **Tailwind CSS**. Deployable to **Vercel** via Git.

## Features

- 📅 **Calendar** — PF3 custom 8-month calendar (28 days/month, Mon–Sun weeks) with clickable event grid
- 🧵 **Campaign Threads** — Active storylines with status tracking (urgent/active/dormant/resolved)
- ⚔️ **Factions** — Organizations, guilds, and empires with relationship statuses
- 🗺️ **Locations** — Cities, dungeons, and points of interest
- 👥 **NPCs** — Searchable character directory with faction/location tags
- 💰 **Loot & Items** — Table view of weapons, artifacts, and treasure
- 📜 **Session Log** — Collapsible session summaries with in-game dates
- ✏️ **Full CRUD** — Add, edit, and delete everything from the UI
- 🚀 **Ship Stats** — The Wayward Wiggle dashboard widget

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS |
| Fonts | Cinzel + Crimson Text + JetBrains Mono |
| Hosting | Vercel |

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings → API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Run `supabase-schema.sql` — this creates all 7 tables with indexes and RLS policies
3. Run `supabase-seed.sql` — this populates all tables with the existing campaign data

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your Supabase URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

### 4. Install & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy to Vercel

1. Push the repo to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Pungeons & Flagons dossier"
   git remote add origin https://github.com/YOUR_USERNAME/pf-dossier.git
   git push -u origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new) and import the repo

3. Add the environment variables in Vercel's settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Deploy! Vercel will auto-deploy on every push to `main`.

## Project Structure

```
pf-dossier/
├── app/
│   ├── layout.tsx          # Root layout with sidebar nav
│   ├── page.tsx            # Dashboard home
│   ├── globals.css         # Tailwind + custom styles
│   ├── calendar/page.tsx   # Calendar page (PF3 custom)
│   ├── threads/page.tsx    # Campaign threads CRUD
│   ├── factions/page.tsx   # Factions CRUD
│   ├── locations/page.tsx  # Locations CRUD
│   ├── npcs/page.tsx       # NPCs CRUD with search
│   ├── loot/page.tsx       # Loot table CRUD
│   ├── sessions/page.tsx   # Session log CRUD
│   └── api/                # API route handlers
│       ├── threads/route.ts
│       ├── calendar-events/route.ts
│       ├── factions/route.ts
│       ├── locations/route.ts
│       ├── npcs/route.ts
│       ├── loot-items/route.ts
│       └── sessions/route.ts
├── components/
│   ├── NavSidebar.tsx      # Responsive sidebar navigation
│   ├── Modal.tsx           # Reusable modal component
│   └── UI.tsx              # Shared UI primitives
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── types.ts            # TypeScript types + calendar constants
│   ├── crud.ts             # Generic CRUD API handler factory
│   └── useCrud.ts          # Client-side CRUD hook
├── supabase-schema.sql     # Database schema (run first)
├── supabase-seed.sql       # Seed data (run second)
└── README.md
```

## PF3 Calendar System

The campaign uses a custom calendar:

| Month | Season |
|-------|--------|
| Springmas | Spring |
| SpingTwas | Spring |
| Summeruno | Summer |
| Summerdos | Summer |
| Fallujuan | Fall |
| Fallimall | Fall |
| Winterless | Winter |
| ??? | Winter |

- **8 months**, **28 days each**, **7-day weeks** (Mon–Sun)
- **224-day year**
- All months start on Monday (day 1 = Monday)
- Current in-game date: ~Fallimall 20 (Bonharvestnacht approaching on the 28th)

## License

Private campaign tool — not for redistribution.
