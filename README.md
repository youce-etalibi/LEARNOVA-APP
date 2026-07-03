<p align="center">
  <img src="frontend/public/logos/learnova.png" alt="Learnova" width="400" />
</p>

<h1 align="center">🎓 Learnova</h1>

<p align="center">
  A Microsoft Teams–style <strong>e-learning platform for schools</strong> — schedules,
  grades, absences, online courses (auto-formation), announcements and role-based access.
</p>

<p align="center">
  Built with <strong>Laravel 12 (JWT + RBAC)</strong> and <strong>React 19 (Vite + Tailwind v4)</strong>,
  with a public marketing site, Google OAuth, and multilingual UI (FR · EN · AR/RTL).
</p>

---

## 📖 Table of contents

- [What is Learnova?](#-what-is-learnova)
- [Tech stack](#-tech-stack)
- [Roles](#-roles)
- [Getting started](#-getting-started)
- [Demo accounts](#-demo-accounts)
- [Pages & screens](#-pages--screens)
- [API overview](#-api-overview)
- [Project layout](#-project-layout)
- [Internationalization](#-internationalization)
- [Roadmap](#-whats-included-vs-next-steps)

---

## 🌟 What is Learnova?

Learnova is a full academic-management + e-learning suite. It combines:

- **A school information system** — departments, filières (tracks), promotions
  (cohorts), modules, rooms, scheduled sessions (séances), grades and absences.
- **An LMS / auto-formation portal** — a browsable course catalog with sections,
  lessons, enrollment and progress tracking, open to self-learners.
- **Communication** — school-wide and targeted announcements.
- **A public marketing website** — landing, about and contact pages open to anyone.

Every authenticated user sees a UI tailored to their role: a custom sidebar,
a role-specific dashboard, and data scoped server-side (a student only ever sees
their own grades and absences).

---

## 🧱 Tech stack

| Layer     | Tech                                                                          |
|-----------|-------------------------------------------------------------------------------|
| Backend   | Laravel 12, PostgreSQL, `tymon/jwt-auth`, `spatie/laravel-permission`, Socialite |
| Frontend  | React 19, Vite, React Router v6, TanStack Query, Zustand, Tailwind v4         |
| Auth      | JWT (login/refresh/logout) + Google OAuth                                     |
| UI        | Iconify icons, custom i18n provider (FR / EN / AR-RTL)                         |

---

## 👥 Roles

`SuperAdmin` · `Admin` · `ManagementPedagogique` · `Professor` · `Student` · `AutoFormation`

Each role gets its own sidebar, dashboard and permission scope. Access is
enforced twice: on the **frontend** (route guards + per-role nav) and on the
**backend** (middleware `role:…` / `permission:…` plus per-controller data scoping).

| Role                     | Focus                                                             |
|--------------------------|-------------------------------------------------------------------|
| **SuperAdmin**           | Full system control — users, all academic structure, everything   |
| **Admin**                | Users, departments, rooms, announcements                          |
| **ManagementPédagogique**| Academic structure & planning — filières, promotions, modules, séances, grades |
| **Professor**            | Teaching — own séances, grade entry, course authoring             |
| **Student**              | Own schedule, grades, absences (+ justifications), course catalog |
| **AutoFormation**        | Self-learner — course catalog, enrollment & progress only         |

---

## 🚀 Getting started

### 1. Backend (`/backend`)

```bash
cd backend
composer install
# .env is already configured for PostgreSQL (DB: learnova_database).
# Adjust DB_* credentials if needed, then:
php artisan migrate:fresh --seed
php artisan serve            # -> http://127.0.0.1:8000
```

> Optional: set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `backend/.env`
> to enable Google OAuth login.

### 2. Frontend (`/frontend`)

```bash
cd frontend
npm install
npm run dev                  # -> http://localhost:5173
```

The frontend reads the API base URL from `frontend/.env`
(`VITE_API_BASE_URL=http://127.0.0.1:8000`). The backend CORS config already
accepts any `localhost` port.

---

## 🔑 Demo accounts

All passwords: **`password`**

| Role                    | Email                       |
|-------------------------|-----------------------------|
| Super Admin             | `superadmin@learnova.test`  |
| Admin                   | `admin@learnova.test`       |
| Management Pédagogique  | `management@learnova.test`  |
| Professeur              | `prof@learnova.test`        |
| Étudiant                | `student@learnova.test`     |
| Auto-formation          | `learner@learnova.test`     |

(Students 2–5: `student2@…` → `student5@learnova.test`.)

---

## 🖥 Pages & screens

The app has three surfaces: a **public marketing site**, **auth screens**, and the
**authenticated application**. Sidebar links differ per role (see `frontend/src/lib/nav.js`).

### Public marketing site (no login)

| Route      | Page          | Description                                              |
|------------|---------------|----------------------------------------------------------|
| `/`        | **Landing**   | Hero, feature highlights, animated counters, call-to-action |
| `/about`   | **About**     | Product story / mission                                  |
| `/contact` | **Contact**   | Contact form & school info                               |

### Authentication

| Route             | Page             | Description                                          |
|-------------------|------------------|------------------------------------------------------|
| `/login`          | **Login**        | Email/password (JWT) + "Sign in with Google" button  |
| `/register`       | **Register**     | Self-signup for **auto-formation** learners          |
| `/auth/callback`  | **AuthCallback** | Handles the Google OAuth return + token exchange     |

### Authenticated application (`AppLayout` = sidebar + navbar)

| Route              | Page             | Who sees it                          | Description                                                        |
|--------------------|------------------|--------------------------------------|--------------------------------------------------------------------|
| `/dashboard`       | **Dashboard**    | Everyone                             | Role-specific KPIs, shortcuts and summaries                        |
| `/profile`         | **Profile**      | Everyone                             | Edit profile + change password                                     |
| `/announcements`   | **Announcements**| Everyone (authoring: staff)          | Read announcements; staff can create/edit/delete                   |
| `/courses`         | **Courses**      | Everyone                             | Course catalog; staff/professors can author                        |
| `/courses/:id`     | **CourseDetail** | Everyone                             | Sections, lessons, enroll & track progress                         |
| `/my-courses`      | **MyCourses**    | Everyone                             | Enrolled courses + progress                                        |
| `/seances`         | **Seances**      | Staff + Student                      | Schedule; students/profs see their own, staff manage all           |
| `/grades`          | **Grades**       | Staff + Student                      | Students see own grades; profs/staff enter & manage grades         |
| `/absences`        | **Absences**     | Student (+ staff review)             | Students view own absences & submit justifications                 |
| `/users`           | **Users**        | SuperAdmin, Admin                    | User CRUD + role assignment                                        |
| `/departments`     | **Departments**  | Staff (write: SuperAdmin/Admin)      | Manage departments                                                 |
| `/rooms`           | **Rooms**        | Staff (write: SuperAdmin/Admin)      | Manage rooms                                                       |
| `/filieres`        | **Filieres**     | Staff + Student (write: mgmt)        | Manage/browse filières (tracks)                                    |
| `/promotions`      | **Promotions**   | Staff + Student (write: mgmt)        | Manage/browse promotions (cohorts)                                 |
| `/modules`         | **Modules**      | Staff + Student (write: mgmt)        | Manage/browse modules + assign professors                          |

> Most management screens are driven by a single config-driven `CrudPage`
> component, so list/create/edit/delete UIs stay consistent across resources.

---

## 🔌 API overview

**Auth (JWT + Google OAuth):**

```
POST /api/auth/login          POST /api/auth/register     (auto-formation)
GET  /api/auth/me             POST /api/auth/refresh      POST /api/auth/logout
GET  /api/auth/google/redirect     GET /api/auth/google/callback
```

**Public (no auth):**

```
GET /api/ping   GET /api/courses   GET /api/courses/{id}   GET /api/announcements
```

**Authenticated resources** (under `/api`, guarded by `auth:api (jwt)` + `role`/`permission`):

```
dashboard  profile  users  departments  rooms  filieres  promotions  modules
seances  grades  absences  justifications  courses  my-courses  announcements
```

Notable actions: `POST /courses/{course}/enroll`, `POST /grades/bulk`,
`POST /absences/bulk`, `POST /absences/{absence}/justify`,
`PATCH /justifications/{justification}/review`,
`POST /modules/{module}/assign-professor`, `PATCH /seances/{seance}/status`.

**Middleware stack:** `auth:api (jwt)` → `role:…` → controller (with per-role
data scoping inside controllers). Permissions are seeded per module
(`grades.view`, `grades.create`, …) via spatie.

---

## 🗂 Project layout

```
learnova-app/
├── backend/                        # Laravel 12 API
│   ├── app/Models/                 28 Eloquent models (User, Student, Professor,
│   │                               Course, Lesson, Quiz, Grade, Absence, …)
│   ├── app/Http/Controllers/Api/   Auth, GoogleAuth, Dashboard, Profile +
│   │                               resource controllers
│   ├── database/migrations/        academic, people, sessions, grades, e-learning,
│   │                               communication, assignments & quizzes
│   ├── database/seeders/           RolesAndPermissionsSeeder + DemoSeeder
│   └── routes/api.php              role-gated route groups
│
└── frontend/                       # React 19 + Vite SPA
    ├── public/logos/learnova.png   brand logo (used above)
    └── src/
        ├── lib/                    api client (JWT + auto-refresh), roles, nav config
        ├── store/                  zustand auth store (persisted)
        ├── i18n/                   LanguageProvider + FR/EN/AR translations
        ├── hooks/                  useScrollReveal, …
        ├── components/
        │   ├── layout/             AppLayout, Navbar, Sidebar, LanguageSwitcher
        │   ├── marketing/          MarketingLayout, Nav, Footer, Counter
        │   ├── auth/               AuthShell, GoogleButton
        │   ├── CrudPage.jsx        config-driven CRUD screens
        │   ├── ProtectedRoute.jsx  route guard (auth + roles)
        │   └── ui.jsx              shared UI primitives
        └── pages/                  Landing, About, Contact, Login, Register,
                                    AuthCallback, Dashboard, Profile, Announcements,
                                    Seances, Grades, Absences, Courses, CourseDetail,
                                    MyCourses, Users, Departments, Filieres,
                                    Promotions, Modules, Rooms
```

---

## 🌍 Internationalization

The UI ships in three languages via a custom `LanguageProvider`:

| Code | Language  | Direction |
|------|-----------|-----------|
| `fr` | Français  | LTR (default) |
| `en` | English   | LTR       |
| `ar` | العربية   | **RTL**   |

Language is switchable at runtime (`LanguageSwitcher`) and the layout flips to
RTL automatically for Arabic. Navigation labels are i18n keys resolved through
`useI18n().t(...)`.

---

## ✅ What's included vs. next steps

**Done:** public marketing site, JWT auth + refresh, Google OAuth, RBAC (roles +
permissions), role dashboards, academic structure CRUD, schedule, grade entry
(single + bulk + role-scoped views), absences + justifications + review,
e-learning catalog/enrollment/progress, announcements, profile & password change,
and full FR/EN/AR (RTL) localization.

**Schema ready, UI to extend:** assignments & submissions, quizzes
(questions/options/attempts), direct messaging, notifications, planning
drag-and-drop builder, report exports (Laravel Excel), file uploads to storage.
