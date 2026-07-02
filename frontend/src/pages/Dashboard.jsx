import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Spinner, EmptyState } from '../components/ui'
import AdminDashboard from '../components/dashboard/AdminDashboard'
import ManagementDashboard from '../components/dashboard/ManagementDashboard'
import ProfessorDashboard from '../components/dashboard/ProfessorDashboard'
import StudentDashboard from '../components/dashboard/StudentDashboard'
import LearnerDashboard from '../components/dashboard/LearnerDashboard'

const DASHBOARDS = {
  admin: AdminDashboard,
  management: ManagementDashboard,
  professor: ProfessorDashboard,
  student: StudentDashboard,
  learner: LearnerDashboard,
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  })

  if (isLoading) return <Spinner />

  if (isError || !data?.role) {
    return (
      <EmptyState
        icon="alert"
        title="Tableau de bord indisponible"
        hint="Impossible de charger vos statistiques pour le moment. Réessayez dans un instant."
      />
    )
  }

  const RoleDashboard = DASHBOARDS[data.role] || LearnerDashboard
  return <RoleDashboard data={data} user={user} />
}
