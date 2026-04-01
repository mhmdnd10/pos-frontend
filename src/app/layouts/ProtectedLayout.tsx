import { LogOut, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { routePaths } from '@/app/router/routePaths'
import { Button } from '@/components/shared/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { label: 'Dashboard', to: routePaths.dashboard },
  { label: 'Categories', to: routePaths.categories },
  { label: 'Products', to: routePaths.products },
  { label: 'Suppliers', to: routePaths.suppliers },
  { label: 'Customers', to: routePaths.customers },
  { label: 'Purchases', to: routePaths.purchases },
  { label: 'Sales', to: routePaths.sales },
  { label: 'Reports', to: routePaths.reports },
  { label: 'Customer Payments', to: routePaths.customerPayments },
  { label: 'Supplier Payments', to: routePaths.supplierPayments },
]

export function ProtectedLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">POS Admin</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="h-4 w-4" />
              <span>{user?.name ?? user?.email ?? 'Admin'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="w-56 shrink-0 rounded-lg border bg-background p-2">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 rounded-lg border bg-background p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}