# Learnova — What Was Improved (Simple Guide)

This file explains, in simple English, everything that was changed and added to the app.

---

## 1. Proxy (Frontend → Backend)

**Problem:** The browser called the backend directly at `http://127.0.0.1:8000`. This can cause CORS problems and hardcoded URLs.

**Fix:** The Vite dev server now has a **proxy**. Every request to `/api` (and `/storage` for uploaded files) is forwarded to the backend automatically.

- The browser only talks to the frontend (port 3000). No CORS issues.
- Files: `frontend/vite.config.js`, `frontend/src/lib/api.js`, `frontend/.env`
- To change the backend address, edit `VITE_BACKEND_URL` in `frontend/.env`.

---

## 2. Full-Width Pages

Pages were limited to 1440px in the middle of the screen. Now the content uses the **full width** of the window.

- File: `frontend/src/components/layout/AppLayout/AppLayout.css`

---

## 3. Modals Fixed (All of Them)

Two problems were fixed in the shared `Modal` component (`frontend/src/components/ui.jsx`):

1. **Modal was stuck inside the content area.** The page animation left a CSS `transform` on the content wrapper, which "traps" `position: fixed`. Now the modal renders in a **React portal on `<body>`**, so it always covers the **whole screen** (sidebar and navbar get dimmed too).
2. **Keyboard focus.** When a modal opens, focus moves to the first input automatically. When it closes, focus goes back where it was. Escape key and body scroll-lock also work.

Because every dialog in the app uses this one component, all modals got fixed at once.

---

## 4. Dashboard (Admin)

The admin dashboard was rebuilt with real charts and tracking:

- **Hero band** with date, greeting, quick actions, and a warning pill when justifications are waiting.
- **KPI tiles** with month-vs-month change badges and mini sparklines.
- **Charts** (recharts library, colors validated for colorblind safety):
  - 12-month activity (new users + course enrollments)
  - Users by role (donut)
  - Attendance for the last 8 weeks (stacked bars: present / late / justified / absent)
  - Students per filière (horizontal bars)
- **Top courses**, **this week's séances**, **latest registered users**.

**Backend:** `DashboardController@adminStats` now returns all this data (trends, attendance buckets, deltas, top courses…).

---

## 5. Annonces (Announcements)

Full redesign + missing features:

- **Stats row**, search, and filter chips (status + audience).
- **"À la une"** section: pinned announcements shown first with a gradient ring.
- **Cards** with author avatar, relative time ("il y a 2 h"), audience chip, 3-line preview.
- **Detail modal** — the show route `GET /announcements/{id}` did not exist before; it was added.
- **Create/Edit modal**: title with character counter, audience picker with icons (everyone / promotion / department / module), toggle switches for **Pin** and **Publish / Draft**.
- **Drafts**: authors can now save drafts, see them (dashed cards), and publish them later in one click. Before, drafts were created but invisible forever.
- Who can write: SuperAdmin, Admin, Pédagogie, Professor. Others only read.

---

## 6. Catalogue de Cours (Course Catalog)

- **Generated covers**: each course gets a stable brand gradient with a big letter (or its real thumbnail).
- **Badges**: level with small "difficulty bars", Gratuit, module, language.
- **Filters**: search, level, free-only, and (staff only) published/draft. Sorting: recent / popular / A–Z.
- **Staff CRUD**: create/edit modal (segmented level picker, module select, free + publish toggles), hover actions on covers (publish/unpublish, edit, delete), stats row.
- **Students**: only see published courses, get an "S'inscrire" button, and see their **progress bar** on enrolled courses.

---

## 7. Course Detail Page (Contenu + Suivi)

The biggest addition. Before, there was **no API** to manage course content or track learning. Now:

**New backend** (`CourseContentController`):
- Create / edit / delete **sections** and **lessons** (staff roles only).
- `POST /lessons/{id}/toggle-complete`: a learner checks a lesson as done, and the server **recalculates the course progress %** automatically.

**New page**:
- **Hero** with course info and stats (sections, lessons, total duration, enrollees).
- **Curriculum accordion**: numbered sections, lesson list with type icons (video, PDF, quiz, reading, link) and durations.
- **Learning tracking (suivi)**: enrolled students check lessons one by one; the progress ring and counters update live.
- **Lesson modal**: readings show their text; other types have an "open content" button.
- **Staff tools**: add/edit/delete sections and lessons, publish/draft toggle, free-preview sections.

---

## 8. Utilisateurs & Rôles (Users & Roles)

- **Rich table**: photo/initials avatar, "vous" chip on your own row, role badges, status, phone, join date.
- **Profile modal (show)**: uses `GET /users/{id}` — shows contact info, bio, roles, and the full **permissions list**.
- **Form modal**: password field with show/hide and a **random password generator** button; role selection as **cards with descriptions**; status as segmented buttons.
- **Safety rules**:
  - You cannot suspend or delete **your own** account.
  - Only a **SuperAdmin** can give the SuperAdmin role.
- Quick actions: suspend / reactivate a user in one click.
- Only SuperAdmin/Admin can access this page (API rule).

---

## 9. Départements

- **Card grid** with a gradient monogram (from the code, e.g. "INF"), description, responsable with avatar, filière/professor counts.
- **Detail modal (show)**: description, responsable with email, list of attached filières.
- **Form modal**: name + auto-uppercase code, **responsable picker** (staff users list), description.
- Read: all staff. Write: SuperAdmin/Admin only.

---

## 10. Salles (Rooms)

- Rooms are **grouped by building** (virtual rooms in their own group).
- Each room card: type icon + color (classroom / amphi / lab / online), and a **capacity meter**.
- Stats: rooms, total seats, buildings, amphitheaters.
- **Form modal**: segmented type picker, capacity **preset chips** (20/30/50/100/200), building input with **autocomplete** from existing buildings. Online rooms hide capacity/building.
- Read: all staff. Write: SuperAdmin/Admin only.

---

## 11. Emploi du Temps (Timetable)

- **Week view** with ‹ / › navigation and an "Aujourd'hui" button. Only that week is loaded from the API.
- Each day shows a date tile (today is highlighted). Empty days say "Journée libre".
- **Séance cards**: colored bar per type (CM/TD/TP/Online), times + duration, professor, room, promotion, status.
- **Quick status actions** (professors + staff): mark done ✓, cancel ✕, reschedule ↺ — one click.
- **Full CRUD** (Admin/Pédagogie): new séance modal (module, professor, promotion, room, type, date, times), per-day "+ Ajouter", edit, delete.
- **Detail modal** on click with all info and the same actions.
- **Backend:** a small `GET /professors` endpoint was added so the form can list professors.

---

## 12. Mes Absences (Absences)

**For students:**
- Stats (absences, lates, justified, waiting), status-colored cards.
- **Justify modal**: reason + **optional file upload** (certificate, max 5 MB). You can re-submit after a rejection.
- You can see the state of your justification: waiting / approved / rejected.

**For staff:**
- Search + status filters, quick **one-click attendance fix** (present / late / absent).
- **"Examiner" modal**: read the student's reason, open the attached file, then **Approve** (absence becomes "justified" automatically) or **Reject**.

**Backend:** the absences list now includes the latest justification of each absence.

---

## 13. Mes Cours (My Courses)

- **"Reprendre" hero**: your most recent unfinished course in a big dark banner with a progress bar and a Continue button.
- Course cards with cover, **progress ring**, status badge (En cours / Terminé / À commencer), professor, and enrollment date.
- Stats + filter chips (all / in progress / done / not started).

---

## 14. Design System (Used Everywhere)

- **Brand colors**: navy `#15253b`, iris `#6144e2`, sky `#329ef4` — same identity across all pages.
- **Charts palette** checked with a colorblind-safety validator.
- French UI everywhere, consistent stat tiles, filter chips, toggle switches, segmented pickers.
- Animations with framer-motion, and they are **disabled automatically** if the user prefers reduced motion.
- No emojis as icons — everything uses the lucide icon set.

---

## Who Can Do What (Roles Summary)

| Page | Read | Write (CRUD) |
|---|---|---|
| Dashboard | everyone (own version per role) | — |
| Annonces | everyone | SuperAdmin, Admin, Pédagogie, Professor |
| Catalogue / Course content | everyone (students: published only) | SuperAdmin, Admin, Pédagogie, Professor |
| Utilisateurs | SuperAdmin, Admin | SuperAdmin, Admin (SuperAdmin role: SuperAdmin only) |
| Départements / Salles | all staff | SuperAdmin, Admin |
| Emploi du temps | everyone (scoped: students see their promotion, profs their own) | Admin/Pédagogie (CRUD), + Professor (status) |
| Absences | students see their own; staff see all | staff: fix status + review justifications; students: justify |
| Mes cours | the logged-in user | lesson check-off updates progress |

---

## Demo Accounts

All passwords are `password`:

| Role | Email |
|---|---|
| Super Admin | superadmin@learnova.test |
| Admin | admin@learnova.test |
| Pédagogie | management@learnova.test |
| Professor | prof@learnova.test |
| Student | student@learnova.test |
| Auto-formation | learner@learnova.test |

---

## How to Run

```bash
# Backend (Laravel, port 8000)
cd backend
php artisan serve

# Frontend (Vite, port 3000)
cd frontend
npm run dev
```

Open `http://localhost:3000`. The proxy sends every `/api` call to the backend for you.
