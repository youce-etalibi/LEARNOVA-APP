import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import AppLayout from './components/layout/AppLayout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import MarketingLayout from './components/marketing/MarketingLayout'

import Landing from './pages/Landing'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'

import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Announcements from './pages/Announcements'
import Seances from './pages/Seances'
import Grades from './pages/Grades'
import Chat from './pages/Chat'
import Absences from './pages/Absences'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import MyCourses from './pages/MyCourses'
import Users from './pages/Users'
import Departments from './pages/Departments'
import Filieres from './pages/Filieres'
import Promotions from './pages/Promotions'
import Modules from './pages/Modules'
import Rooms from './pages/Rooms'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

const STAFF = ['SuperAdmin', 'Admin', 'ManagementPedagogique', 'Professor']
const ADMINS = ['SuperAdmin', 'Admin']

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public marketing site */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Route>

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Authenticated app */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/seances" element={<Seances />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/absences" element={<Absences />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/my-courses" element={<MyCourses />} />

            <Route path="/users" element={<ProtectedRoute roles={ADMINS}><Users /></ProtectedRoute>} />
            <Route path="/departments" element={<ProtectedRoute roles={STAFF}><Departments /></ProtectedRoute>} />
            <Route path="/rooms" element={<ProtectedRoute roles={STAFF}><Rooms /></ProtectedRoute>} />
            <Route path="/filieres" element={<ProtectedRoute roles={[...STAFF, 'Student']}><Filieres /></ProtectedRoute>} />
            <Route path="/promotions" element={<ProtectedRoute roles={[...STAFF, 'Student']}><Promotions /></ProtectedRoute>} />
            <Route path="/modules" element={<ProtectedRoute roles={[...STAFF, 'Student']}><Modules /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
