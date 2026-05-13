# 🗺️ Development Roadmap

按 milestone 推进，每个 milestone 结束都应该是可演示状态。**完成一个 commit 一个**。

---

## ✅ Milestone 0 — Project Setup (Day 1)

- [x] Project structure scaffolded
- [x] FastAPI app skeleton (auth + accounts + categories + transactions + stats)
- [x] SQLAlchemy models with relationships
- [x] Pydantic schemas with validation
- [x] JWT authentication
- [x] pytest test suite (auth + transactions)
- [x] Dockerfile
- [ ] Push to GitHub — create a repo, commit, push
- [ ] Verify backend runs locally (see SETUP.md)

**面试金句**: "I started with a clean project structure separating models, schemas, routers, and auth so it'd be easy to grow."

---

## 📦 Milestone 1 — Frontend Foundation (Week 1)

- [ ] Run `npx create-next-app@latest frontend` with these answers:
  - TypeScript ✅
  - ESLint ✅
  - Tailwind ✅
  - App Router ✅
  - src/ directory ✅
- [ ] Set up **shadcn/ui** (`npx shadcn@latest init`)
- [ ] Install dependencies: `@tanstack/react-query`, `axios`, `react-hook-form`, `zod`, `recharts`, `lucide-react`
- [ ] Create folder structure:
  ```
  src/
    app/
      (auth)/login/page.tsx
      (auth)/signup/page.tsx
      (dashboard)/dashboard/page.tsx
      (dashboard)/transactions/page.tsx
      (dashboard)/accounts/page.tsx
      layout.tsx
    components/
      ui/         # shadcn components
      forms/
      charts/
    lib/
      api.ts       # axios instance + interceptors
      auth.ts      # token storage
      types.ts     # mirrors backend schemas
    hooks/
  ```
- [ ] Build login + signup pages, hooked up to backend `/api/auth/*`
- [ ] Token stored in memory + httpOnly cookie (don't use localStorage for tokens!)

**Deliverable**: User can sign up, log in, and see a placeholder dashboard.

---

## 💳 Milestone 2 — Accounts & Transactions UI (Week 2)

- [ ] Accounts page: list, create, edit, delete
- [ ] Transactions page: data table with filtering (date range, account, category, type)
- [ ] "Add Transaction" modal with form validation (Zod)
- [ ] Inline edit + delete with optimistic UI
- [ ] Categories management page

**Deliverable**: Fully working CRUD UI for all entities.

---

## 📊 Milestone 3 — Dashboard & Visualization (Week 3)

- [ ] Dashboard page with:
  - Total balance card (all accounts summed)
  - Monthly income vs expense card
  - Recent transactions list (last 10)
  - Pie chart: expense by category (Recharts)
  - Bar chart: last 6 months income/expense
- [ ] Month selector that updates all stats
- [ ] Empty states + loading skeletons

**Deliverable**: Beautiful dashboard — this is your portfolio screenshot.

---

## 🎨 Milestone 4 — Polish & Differentiators (Week 4)

Pick 2-3 of these — each adds a real bullet point to your resume:

- [ ] **CSV export** of transactions (year/month)
- [ ] **CSV import** (parse + preview + confirm)
- [ ] **Dark mode** toggle
- [ ] **Budgets** — set monthly limit per category, show progress bars + alerts
- [ ] **Search bar** with debouncing
- [ ] **Mobile responsive** polish (you should be able to add a transaction on your phone)
- [ ] **Recurring transactions** (auto-create monthly)

---

## 🚀 Milestone 5 — Production Deploy (Week 5)

- [ ] Move DB from SQLite to Postgres (Neon free tier)
- [ ] Set up **Alembic** for migrations
- [ ] Deploy backend to **Railway** or **Fly.io**
- [ ] Deploy frontend to **Vercel**
- [ ] Configure env vars on both
- [ ] Buy a domain (Namecheap/Cloudflare, ~$12/year) — looks 10x more professional
- [ ] Add screenshots + live demo link to README

---

## 📝 Milestone 6 — Documentation Polish (Final)

- [ ] README: clear description, screenshots/GIF, tech stack, "Run locally" section
- [ ] Architecture diagram in README (Excalidraw → export PNG)
- [ ] Write 2-3 sentence "Why I built this" section
- [ ] Add a "Lessons Learned" section — shows reflection
- [ ] Test public sign-up works for a friend
- [ ] Add this project to your resume + LinkedIn + portfolio page

---

## 💡 Resume Bullets (write these now, deliver against them)

When this project is done, you should be able to write these bullets:

- Built a full-stack personal finance application with FastAPI (Python) backend and Next.js 14 (TypeScript) frontend, deployed to production.
- Designed a normalized PostgreSQL schema with 4 related entities and implemented per-user data isolation via JWT-protected REST API.
- Wrote pytest test suite covering authentication, CRUD operations, and balance-side-effect logic.
- Built an interactive dashboard with Recharts visualizing monthly spending by category.
- Containerized the backend with Docker and deployed to Railway with managed Postgres.

---

## ⏱️ Realistic Pacing

- **Full-time**: ~3-4 weeks
- **Side project, evenings + weekends**: ~5-7 weeks

**Don't optimize for perfection. Optimize for "shipped".** A live link beats a half-finished masterpiece every time.
