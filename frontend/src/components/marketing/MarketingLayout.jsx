import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import MarketingNav from './MarketingNav'
import MarketingFooter from './MarketingFooter'

export default function MarketingLayout() {
  const { pathname } = useLocation()

  // Scroll to top on route change (marketing pages).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [pathname])

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  )
}
