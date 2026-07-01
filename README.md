# 🎓 Learnova

A Microsoft Teams–style **e-learning platform for schools**: schedules, grades,
absences, online courses (auto-formation), announcements and role-based access —
built with **Laravel 12 (JWT + RBAC)** and **React 19 (Vite + Tailwind)**.

---

## Stack

| Layer     | Tech                                                                    |
|-----------|-------------------------------------------------------------------------|
| Backend   | Laravel 12, PostgreSQL, `tymon/jwt-auth`, `spatie/laravel-permission`   |
| Frontend  | React 19, Vite, React Router v6, TanStack Query, Zustand, Tailwind v4   |

## Roles

`SuperAdmin` · `Admin` · `ManagementPedagogique` · `Professor` · `Student` · `AutoFormation`

Each role gets its own sidebar, dashboard and permission scope. Data is scoped
server-side (e.g. a student only ever sees their own grades/absences).

---

## Getting started

### 1. Backend (`/backend`)

```bash
cd backend
composer install
# .env is already configured for PostgreSQL (DB: learnova_database).
# Adjust DB_* credentials if needed, then:
php artisan migrate:fresh --seed
php artisan serve            # -> http://127.0.0.1:8000
```

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

## Demo accounts

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

## API overview

Auth (JWT):

```
POST /api/auth/login      POST /api/auth/register    (auto-formation)
GET  /api/auth/me         POST /api/auth/refresh     POST /api/auth/logout
```

Resources (all under `/api`, guarded by `auth:jwt` + `role`/`permission`):

```
users  departments  filieres  promotions  modules  rooms
seances  grades  absences  courses  my-courses  announcements  dashboard
```

Middleware stack: `auth:api (jwt)` → `role:…` → controller (with per-role data
scoping inside controllers). Permissions are seeded per module
(`grades.view`, `grades.create`, …) via spatie.

---

## Project layout

```
backend/
  app/Models/                 28 Eloquent models with relationships
  app/Http/Controllers/Api/   Auth, Dashboard, Profile + resource controllers
  database/migrations/        academic, people, sessions, grades, e-learning,
                              communication, assignments & quizzes
  database/seeders/           RolesAndPermissionsSeeder + DemoSeeder
  routes/api.php              role-gated route groups

frontend/src/
  lib/        api client (JWT + auto-refresh), roles, nav config
  store/      zustand auth store (persisted)
  components/ Layout, ProtectedRoute, CrudPage (config-driven), ui primitives
  pages/      Login, Register, Dashboard, Users, Departments, Filieres,
              Promotions, Modules, Rooms, Seances, Grades, Absences,
              Courses, CourseDetail, MyCourses, Announcements, Profile
```

---

## What's included vs. next steps

**Done:** JWT auth + refresh, RBAC (roles + permissions), role dashboards,
academic structure CRUD, schedule, grade entry (single + role-scoped views),
absences + justifications, e-learning catalog/enrollment/progress, announcements,
profile & password change.

**Schema ready, UI to extend:** assignments & submissions, quizzes
(questions/options/attempts), direct messaging, planning drag-and-drop builder,
report exports (Laravel Excel), file uploads to storage.
