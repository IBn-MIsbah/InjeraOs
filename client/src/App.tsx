import { useEffect, useState } from 'react'
import { authApi, type AuthContextResponse } from '@/lib/api'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { DemoDashboard } from '@/components/dashboard/DemoDashboard'
import { BusinessSettingsView } from '@/components/business/BusinessSettingsView'
import { BranchManagementView } from '@/components/business/BranchManagementView'
import { TeamMembersView } from '@/components/business/TeamMembersView'
import { WorkforceManagementView } from '@/components/workforce/WorkforceManagementView'
import { MaterialsManagementView } from '@/components/materials/MaterialsManagementView'
import { RecipesManagementView } from '@/components/recipes/RecipesManagementView'
import { ProductionManagementView } from '@/components/production/ProductionManagementView'
import { CostingManagementView } from '@/components/costing/CostingManagementView'
import { InventoryManagementView } from '@/components/inventory/InventoryManagementView'
import { SalesManagementView } from '@/components/sales/SalesManagementView'
import { ExpensesManagementView } from '@/components/expenses/ExpensesManagementView'
import { FinancialReportsView } from '@/components/reports/FinancialReportsView'
import { UnslopTool } from '@/components/unslop/UnslopTool'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar, type TabType } from '@/components/layout/AppSidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export function App() {
  const [auth, setAuth] = useState<AuthContextResponse | null>(null)
  const [authView, setAuthView] = useState<'login' | 'register'>('login')
  const [activeTab, setActiveTab] = useState<TabType>('workspace')
  const [isInitializing, setIsInitializing] = useState(true)

  // Verify session on page load using secure httpOnly cookies
  useEffect(() => {
    let isMounted = true

    const verifySession = async () => {
      try {
        const data = await authApi.getMe()
        if (isMounted) setAuth(data)
      } catch {
        if (isMounted) setAuth(null)
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    verifySession()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    try {
      await authApi.logout()
      toast.info('Signed out', {
        description: 'Your active session has been cleared.',
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setAuth(null)
      setAuthView('login')
      setActiveTab('workspace')
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        auth={auth}
        authView={authView}
        onSelectAuthView={setAuthView}
        onLogout={handleLogout}
      />

      <SidebarInset className="min-h-screen flex flex-col bg-background">
        {/* Top Header inside Sidebar Layout */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {activeTab === 'branches' && 'Baking Stations & Locations'}
                {activeTab === 'workforce' && 'Workforce, Shifts & Timesheets'}
                {activeTab === 'materials' && 'Raw Materials, Purchasing & Inventory'}
                {activeTab === 'recipes' && 'Recipes, Scaling & Pre-Mixed Teff'}
                {activeTab === 'production' && 'Production Sessions & Mitad Baking'}
                {activeTab === 'costing' && 'Batch Costing, Labour & Overhead Allocation'}
                {activeTab === 'inventory' && 'Finished Goods, FIFO Lots & Locations'}
                {activeTab === 'sales' && 'Sales, POS, Customer Credit Ledger & Distribution'}
                {activeTab === 'expenses' && 'Operating Expenses & OPEX Ledger'}
                {activeTab === 'reports' && 'Financial Reports, P&L & Baker Productivity'}
                {activeTab === 'team' && 'Staff Roster & Permissions'}
                {activeTab === 'settings' && 'Bakery Business Settings'}
                {activeTab === 'unslop' && 'Unslop AI Text Editor'}
                {activeTab === 'workspace' &&
                  (auth ? 'Workspace Overview & Security' : 'InjeraOS Commerce Platform')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>HttpOnly cookies</span>
            </span>

            {auth && (
              <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground">
                {auth.user.email}
              </span>
            )}
          </div>
        </header>

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 md:p-8">
          {isInitializing ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Checking active cookie session…</span>
            </div>
          ) : activeTab === 'unslop' ? (
            <UnslopTool />
          ) : !auth ? (
            authView === 'login' ? (
              <LoginForm
                onSuccess={(data: AuthContextResponse) => setAuth(data)}
                onSwitchToRegister={() => setAuthView('register')}
              />
            ) : (
              <RegisterForm
                onSuccess={(data: AuthContextResponse) => setAuth(data)}
                onSwitchToLogin={() => setAuthView('login')}
              />
            )
          ) : activeTab === 'branches' ? (
            <BranchManagementView />
          ) : activeTab === 'workforce' ? (
            <WorkforceManagementView />
          ) : activeTab === 'materials' ? (
            <MaterialsManagementView />
          ) : activeTab === 'recipes' ? (
            <RecipesManagementView />
          ) : activeTab === 'production' ? (
            <ProductionManagementView />
          ) : activeTab === 'costing' ? (
            <CostingManagementView />
          ) : activeTab === 'inventory' ? (
            <InventoryManagementView />
          ) : activeTab === 'sales' ? (
            <SalesManagementView />
          ) : activeTab === 'expenses' ? (
            <ExpensesManagementView />
          ) : activeTab === 'reports' ? (
            <FinancialReportsView />
          ) : activeTab === 'team' ? (
            <TeamMembersView />
          ) : activeTab === 'settings' ? (
            <BusinessSettingsView />
          ) : (
            <DemoDashboard auth={auth} onLogout={handleLogout} />
          )}
        </main>

        <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
          <p>Injera Bakery Commerce Platform &bull; Multi-Tenant Operating System</p>
        </footer>
      </SidebarInset>

      {/* Shadcn Sonner Toaster */}
      <Toaster />
    </SidebarProvider>
  )
}

export default App
