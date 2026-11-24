import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router'
import { authApi, type AuthContextResponse } from '@/lib/api'
import { SetupProgressionBanner } from '@/components/onboarding/SetupProgressionBanner'
import { autoSyncCompletedSteps } from '@/components/onboarding/onboardingData'
import { NetworkStatusBar } from '@/components/common/NetworkStatusBar'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar, type TabType } from '@/components/layout/AppSidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { syncEngine } from '@/lib/sync-engine'
import {
  Boxes,
  ChevronDown,
  Coins,
  Flame,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Sparkles,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

// Route-level Code Splitting: Lazy-load view components on-demand
const LoginForm = lazy(() =>
  import('@/components/auth/LoginForm').then((m) => ({ default: m.LoginForm }))
)
const RegisterForm = lazy(() =>
  import('@/components/auth/RegisterForm').then((m) => ({ default: m.RegisterForm }))
)
const LandingPage = lazy(() =>
  import('@/components/landing/LandingPage').then((m) => ({ default: m.LandingPage }))
)
const DemoDashboard = lazy(() =>
  import('@/components/dashboard/DemoDashboard').then((m) => ({ default: m.DemoDashboard }))
)
const BusinessSettingsView = lazy(() =>
  import('@/components/business/BusinessSettingsView').then((m) => ({ default: m.BusinessSettingsView }))
)
const BranchManagementView = lazy(() =>
  import('@/components/business/BranchManagementView').then((m) => ({ default: m.BranchManagementView }))
)
const TeamMembersView = lazy(() =>
  import('@/components/business/TeamMembersView').then((m) => ({ default: m.TeamMembersView }))
)
const RolesManagementView = lazy(() =>
  import('@/components/roles/RolesManagementView').then((m) => ({ default: m.RolesManagementView }))
)
const UserProfileView = lazy(() =>
  import('@/components/profile/UserProfileView').then((m) => ({ default: m.UserProfileView }))
)
const WorkforceManagementView = lazy(() =>
  import('@/components/workforce/WorkforceManagementView').then((m) => ({ default: m.WorkforceManagementView }))
)
const MaterialsManagementView = lazy(() =>
  import('@/components/materials/MaterialsManagementView').then((m) => ({ default: m.MaterialsManagementView }))
)
const RecipesManagementView = lazy(() =>
  import('@/components/recipes/RecipesManagementView').then((m) => ({ default: m.RecipesManagementView }))
)
const ProductionManagementView = lazy(() =>
  import('@/components/production/ProductionManagementView').then((m) => ({ default: m.ProductionManagementView }))
)
const CostingManagementView = lazy(() =>
  import('@/components/costing/CostingManagementView').then((m) => ({ default: m.CostingManagementView }))
)
const InventoryManagementView = lazy(() =>
  import('@/components/inventory/InventoryManagementView').then((m) => ({ default: m.InventoryManagementView }))
)
const SalesManagementView = lazy(() =>
  import('@/components/sales/SalesManagementView').then((m) => ({ default: m.SalesManagementView }))
)
const ExpensesManagementView = lazy(() =>
  import('@/components/expenses/ExpensesManagementView').then((m) => ({ default: m.ExpensesManagementView }))
)
const FinancialReportsView = lazy(() =>
  import('@/components/reports/FinancialReportsView').then((m) => ({ default: m.FinancialReportsView }))
)
const SyncManagementView = lazy(() =>
  import('@/components/sync/SyncManagementView').then((m) => ({ default: m.SyncManagementView }))
)
const SystemSettingsView = lazy(() =>
  import('@/components/system/SystemSettingsView').then((m) => ({ default: m.SystemSettingsView }))
)
const OnboardingGuideModal = lazy(() =>
  import('@/components/onboarding/OnboardingGuide').then((m) => ({ default: m.OnboardingGuideModal }))
)

const VALID_TABS = new Set<TabType>([
  'workspace',
  'landing',
  'branches',
  'workforce',
  'materials',
  'recipes',
  'production',
  'costing',
  'inventory',
  'sales',
  'expenses',
  'reports',
  'sync',
  'team',
  'roles',
  'profile',
  'settings',
  'system',
])

function canAccessTab(role: string | null | undefined, tab: TabType): boolean {
  const userRole = (role || 'MEMBER').toUpperCase()
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN'
  const isManager = isOwnerOrAdmin || userRole === 'BRANCH_MANAGER'
  const isFinancial = isOwnerOrAdmin || userRole === 'ACCOUNTANT'
  const isBaker = isOwnerOrAdmin || userRole.includes('BAKER') || userRole.includes('PRODUCTION')
  const isCashier = isOwnerOrAdmin || userRole.includes('CASHIER') || userRole.includes('SALES')
  const isStore = isOwnerOrAdmin || userRole.includes('STORE') || userRole.includes('INVENTORY')

  switch (tab) {
    case 'workspace':
    case 'landing':
    case 'profile':
    case 'sync':
      return true
    case 'roles':
    case 'system':
    case 'settings':
      return isOwnerOrAdmin
    case 'costing':
    case 'expenses':
    case 'reports':
      return isFinancial
    case 'team':
    case 'workforce':
    case 'branches':
      return isManager
    case 'production':
    case 'recipes':
      return isBaker || isManager
    case 'sales':
      return isCashier || isManager || isFinancial
    case 'materials':
    case 'inventory':
      return isStore || isManager || isBaker
    default:
      return false
  }
}

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-2">
      <div className="h-8 bg-muted/60 rounded-md w-1/4 mb-6"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="h-28 bg-muted/50 rounded-xl"></div>
        <div className="h-28 bg-muted/50 rounded-xl"></div>
        <div className="h-28 bg-muted/50 rounded-xl"></div>
        <div className="h-28 bg-muted/50 rounded-xl"></div>
      </div>
      <div className="h-64 bg-muted/40 rounded-xl mt-6"></div>
    </div>
  )
}

function RequireRole({
  role,
  tab,
  children,
}: {
  role: string | null | undefined
  tab: TabType
  children: React.ReactNode
}) {
  if (!canAccessTab(role, tab)) {
    toast.error('Access Restricted', {
      description: 'Your assigned role does not have permission to access that workspace area.',
    })
    return <Navigate to="/workspace" replace />
  }
  return <>{children}</>
}

export function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [auth, setAuth] = useState<AuthContextResponse | null>(null)
  const authRef = useRef<AuthContextResponse | null>(null)
  authRef.current = auth

  const [isInitializing, setIsInitializing] = useState(true)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const [mobileQuickActionsOpen, setMobileQuickActionsOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  // Derive active tab from current route pathname
  const currentPath = location.pathname.replace(/^\//, '').trim().toLowerCase()
  const activeTab: TabType = VALID_TABS.has(currentPath as TabType)
    ? (currentPath as TabType)
    : 'workspace'

  const authView: 'landing' | 'login' | 'register' =
    currentPath === 'login'
      ? 'login'
      : currentPath === 'register'
      ? 'register'
      : 'landing'

  const handleAuthSuccess = (data: AuthContextResponse) => {
    authRef.current = data
    setAuth(data)
    toast.dismiss()
    autoSyncCompletedSteps(data.business)
    navigate('/workspace')
  }

  const handleNavigateTab = (tab: TabType) => {
    if (tab === 'landing') {
      navigate('/landing')
      return
    }
    if (auth && !canAccessTab(auth.role, tab)) {
      toast.error('Access Restricted', {
        description: 'Your assigned role does not have permission to access this area.',
      })
      return
    }
    navigate(`/${tab}`)
  }

  const handleNavigateAuthView = (view: 'landing' | 'login' | 'register') => {
    navigate(`/${view}`)
  }

  // URL Hash synchronization for backwards compatibility (e.g. bookmarks or automated scripts like #/sales)
  useEffect(() => {
    const syncFromHash = () => {
      const raw = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase()
      if (!raw) return

      if (raw === 'onboarding') {
        setOnboardingOpen(true)
        window.history.replaceState(null, '', window.location.pathname)
        return
      }

      if (raw === 'login' || raw === 'register' || raw === 'landing') {
        navigate(`/${raw}`, { replace: true })
        window.history.replaceState(null, '', `/${raw}`)
        return
      }

      if (VALID_TABS.has(raw as TabType)) {
        navigate(`/${raw}`, { replace: true })
        window.history.replaceState(null, '', `/${raw}`)
      }
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [navigate])

  // Track pending offline queue items
  useEffect(() => {
    const updateCount = () => {
      void syncEngine.getPendingCount().then(setPendingSyncCount)
    }
    updateCount()
    window.addEventListener('injera-queue-changed', updateCount)
    window.addEventListener('injera-sync-completed', updateCount)
    return () => {
      window.removeEventListener('injera-queue-changed', updateCount)
      window.removeEventListener('injera-sync-completed', updateCount)
    }
  }, [])

  // Close dropdown on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false)
      }
    }
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [userDropdownOpen])

  // Verify session on page load using secure httpOnly cookies
  useEffect(() => {
    let isMounted = true

    const verifySession = async () => {
      try {
        const data = await authApi.getMe()
        if (isMounted) {
          setAuth(data)
          autoSyncCompletedSteps(data.business)
        }
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
      navigate('/landing')
    }
  }

  // 1. Initializing state
  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-xs text-muted-foreground bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-forest" />
        <span>Initializing KD PLC InjeraOS…</span>
        <Toaster />
      </div>
    )
  }

  // 2. Unauthenticated Routes (Landing, Login, Register, or redirect to login)
  if (!auth) {
    if (currentPath === 'login') {
      return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-forest selection:text-oat">
          <Suspense fallback={<PageSkeleton />}>
            <LoginForm
              onSuccess={handleAuthSuccess}
              onSwitchToRegister={() => navigate('/register')}
              onBackToLanding={() => navigate('/landing')}
            />
          </Suspense>
          <Toaster />
        </div>
      )
    }

    if (currentPath === 'register') {
      return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-forest selection:text-oat">
          <Suspense fallback={<PageSkeleton />}>
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={() => navigate('/login')}
              onBackToLanding={() => navigate('/landing')}
            />
          </Suspense>
          <Toaster />
        </div>
      )
    }

    if (currentPath === '' || currentPath === 'landing') {
      return (
        <>
          <Suspense fallback={<PageSkeleton />}>
            <LandingPage
              onEnterWorkspace={() => navigate('/login')}
              onOpenLogin={() => navigate('/login')}
              onOpenRegister={() => navigate('/register')}
              isAuthenticated={false}
            />
          </Suspense>
          <Toaster />
        </>
      )
    }

    // Attempted to access protected route without active session
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  // 3. Authenticated Standalone Landing Page
  if (currentPath === 'landing') {
    return (
      <>
        <Suspense fallback={<PageSkeleton />}>
          <LandingPage
            onEnterWorkspace={() => navigate('/workspace')}
            onOpenLogin={() => navigate('/workspace')}
            onOpenRegister={() => navigate('/workspace')}
            isAuthenticated={true}
          />
        </Suspense>
        <Toaster />
      </>
    )
  }

  // 4. Authenticated Workspace (Full sidebar navigation + Route-level Code Splitting)
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={handleNavigateTab}
        auth={auth}
        authView={authView}
        onSelectAuthView={handleNavigateAuthView}
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />

      <SidebarInset className="min-h-screen flex flex-col bg-background">
        {/* Top Header inside Sidebar Layout */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <span className="font-medium text-foreground truncate max-w-[160px] sm:max-w-xs md:max-w-none block">
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
                {activeTab === 'sync' && 'Offline Queue & Synchronization Engine'}
                {activeTab === 'team' && 'Staff Roster & Membership'}
                {activeTab === 'roles' && 'Roles, Permissions & Security Governance'}
                {activeTab === 'profile' && 'My Profile & Account Security'}
                {activeTab === 'settings' && 'Bakery Business Settings'}
                {activeTab === 'system' && 'Enterprise System Status, Operational Tweaks & Audit Trail'}
                {activeTab === 'workspace' &&
                  `${auth.business?.name ?? 'KD PLC'} Executive Operations Dashboard`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground md:inline-flex mr-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>HttpOnly Active</span>
            </span>

            <div className="relative" ref={userDropdownRef}>
              {/* Trigger Button: User Avatar + Name + Role Badge + Chevron */}
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`flex h-9 items-center gap-2 rounded-full border px-2.5 text-xs transition-all cursor-pointer shadow-2xs select-none ${
                  userDropdownOpen
                    ? 'border-forest bg-forest/10 text-forest dark:border-oat/50 dark:bg-oat/15 dark:text-oat'
                    : 'border-border/80 bg-background hover:bg-muted/70 text-foreground'
                }`}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-oat text-[11px] font-bold shadow-xs">
                  {auth.user.name ? auth.user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="font-semibold hidden sm:inline max-w-[120px] truncate text-foreground">
                  {auth.user.name || auth.user.email}
                </span>
                <span className="rounded bg-forest/10 px-1.5 py-0.5 text-[9px] font-bold text-forest dark:bg-oat/15 dark:text-oat uppercase tracking-wide">
                  {auth.role ?? 'MEMBER'}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                    userDropdownOpen ? 'rotate-180 text-foreground' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu Panel */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border/80 bg-popover/98 p-1.5 text-popover-foreground shadow-lg backdrop-blur-md z-50 animate-in fade-in-0 zoom-in-95">
                  {/* User Profile Header Card */}
                  <div className="px-3 py-2.5 border-b border-border/60 mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-oat text-sm font-bold shadow-xs shrink-0">
                        {auth.user.name ? auth.user.name[0].toUpperCase() : 'U'}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-xs text-foreground truncate">
                          {auth.user.name || 'KD PLC User'}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          {auth.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <span className="truncate max-w-[120px] font-medium text-foreground">
                        {auth.business?.name ?? 'KD PLC'}
                      </span>
                      <span className="rounded bg-forest/10 px-1.5 py-0.2 font-bold text-forest dark:bg-oat/15 dark:text-oat uppercase">
                        {auth.role ?? 'MEMBER'}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="space-y-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false)
                        handleNavigateTab('profile')
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                        activeTab === 'profile'
                          ? 'bg-forest/10 text-forest font-semibold dark:bg-oat/15 dark:text-oat'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <User className="h-4 w-4 text-forest dark:text-oat shrink-0" />
                      <span>My Profile & Account</span>
                    </button>

                    {(auth.role === 'OWNER' || auth.role === 'ADMIN') && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false)
                            handleNavigateTab('roles')
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                            activeTab === 'roles'
                              ? 'bg-forest/10 text-forest font-semibold dark:bg-oat/15 dark:text-oat'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>Roles & Permissions</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false)
                            handleNavigateTab('settings')
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                            activeTab === 'settings'
                              ? 'bg-forest/10 text-forest font-semibold dark:bg-oat/15 dark:text-oat'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <Sliders className="h-4 w-4 text-primary shrink-0" />
                          <span>Business Settings</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false)
                            handleNavigateTab('system')
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                            activeTab === 'system'
                              ? 'bg-forest/10 text-forest font-semibold dark:bg-oat/15 dark:text-oat'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <History className="h-4 w-4 text-amber-500 shrink-0" />
                          <span>System & Audit Trail</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false)
                        handleNavigateTab('sync')
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                        activeTab === 'sync'
                          ? 'bg-forest/10 text-forest font-semibold dark:bg-oat/15 dark:text-oat'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <RefreshCw className="h-4 w-4 text-cyan-500 shrink-0" />
                        <span>Offline Sync Center</span>
                      </div>
                      {pendingSyncCount > 0 && (
                        <span className="rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 text-[10px] font-bold">
                          {pendingSyncCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false)
                        setOnboardingOpen(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-muted text-foreground transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Bakery Setup Wizard</span>
                    </button>

                    <div className="border-t border-border/60 my-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors cursor-pointer font-medium text-xs"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span>Sign Out of InjeraOS</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Real-time Network & Offline Connectivity Status Bar */}
        <NetworkStatusBar />

        {/* Persistent Setup Order Progression Banner (Admin & Owner) */}
        {(auth.role === 'OWNER' || auth.role === 'ADMIN') && activeTab !== 'workspace' && (
          <SetupProgressionBanner
            activeTab={activeTab}
            onNavigateTab={handleNavigateTab}
            onOpenFullGuide={() => setOnboardingOpen(true)}
          />
        )}

        {/* Main Workspace Area protected by Error Boundary & Suspense for dynamic route chunks */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route
                  path="/workspace"
                  element={
                    <DemoDashboard
                      auth={auth}
                      onLogout={handleLogout}
                      onNavigateTab={(tab) => handleNavigateTab(tab as TabType)}
                    />
                  }
                />
                <Route
                  path="/branches"
                  element={
                    <RequireRole role={auth.role} tab="branches">
                      <BranchManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/workforce"
                  element={
                    <RequireRole role={auth.role} tab="workforce">
                      <WorkforceManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/materials"
                  element={
                    <RequireRole role={auth.role} tab="materials">
                      <MaterialsManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/recipes"
                  element={
                    <RequireRole role={auth.role} tab="recipes">
                      <RecipesManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/production"
                  element={
                    <RequireRole role={auth.role} tab="production">
                      <ProductionManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/costing"
                  element={
                    <RequireRole role={auth.role} tab="costing">
                      <CostingManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <RequireRole role={auth.role} tab="inventory">
                      <InventoryManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/sales"
                  element={
                    <RequireRole role={auth.role} tab="sales">
                      <SalesManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/expenses"
                  element={
                    <RequireRole role={auth.role} tab="expenses">
                      <ExpensesManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <RequireRole role={auth.role} tab="reports">
                      <FinancialReportsView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/sync"
                  element={
                    <RequireRole role={auth.role} tab="sync">
                      <SyncManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/team"
                  element={
                    <RequireRole role={auth.role} tab="team">
                      <TeamMembersView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <RequireRole role={auth.role} tab="roles">
                      <RolesManagementView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/profile"
                  element={<UserProfileView auth={auth} onLogout={handleLogout} />}
                />
                <Route
                  path="/settings"
                  element={
                    <RequireRole role={auth.role} tab="settings">
                      <BusinessSettingsView />
                    </RequireRole>
                  }
                />
                <Route
                  path="/system"
                  element={
                    <RequireRole role={auth.role} tab="system">
                      <SystemSettingsView />
                    </RequireRole>
                  }
                />
                <Route path="*" element={<Navigate to="/workspace" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

        <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground mb-16 md:mb-0">
          <p>KD PLC &bull; Injera Commercial Bakery Operating System</p>
        </footer>

        {/* Mobile Fixed Bottom Navigation Bar & Priority Action Dock */}
        <nav
          aria-label="Mobile Navigation Dock"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          {/* Overview / Home */}
          <button
            type="button"
            onClick={() => handleNavigateTab('workspace')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
              activeTab === 'workspace'
                ? 'text-forest dark:text-oat font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 mb-0.5" />
            <span>Overview</span>
          </button>

          {/* Mitad Baking */}
          <button
            type="button"
            onClick={() => handleNavigateTab('production')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
              activeTab === 'production'
                ? 'text-forest dark:text-oat font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flame className="h-4 w-4 mb-0.5 text-amber-500" />
            <span>Baking</span>
          </button>

          {/* Center Floating Priority Action Button (FAB) */}
          <div className="flex flex-col items-center justify-center flex-1 -mt-5">
            <button
              type="button"
              onClick={() => setMobileQuickActionsOpen(true)}
              className="h-12 w-12 rounded-full bg-forest text-oat shadow-lg flex items-center justify-center border-2 border-background active:scale-95 transition-transform cursor-pointer hover:bg-forest/90 dark:bg-oat dark:text-forest"
              title="Open Quick Actions"
              aria-label="Open Quick Priority Actions"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
            <span className="text-[9px] font-bold text-forest dark:text-oat mt-0.5 uppercase tracking-wider">
              Action
            </span>
          </div>

          {/* Sales / POS */}
          <button
            type="button"
            onClick={() => handleNavigateTab('sales')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
              activeTab === 'sales'
                ? 'text-forest dark:text-oat font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingCart className="h-4 w-4 mb-0.5 text-emerald-600" />
            <span>POS Sales</span>
          </button>

          {/* My Profile */}
          <button
            type="button"
            onClick={() => handleNavigateTab('profile')}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'text-forest dark:text-oat font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-0.5 ${
                activeTab === 'profile'
                  ? 'bg-forest text-oat dark:bg-oat dark:text-forest'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {auth.user.name ? auth.user.name[0].toUpperCase() : 'U'}
            </div>
            <span>Profile</span>
          </button>
        </nav>

        {/* Mobile Priority Actions Bottom Sheet / Modal */}
        <Dialog open={mobileQuickActionsOpen} onOpenChange={setMobileQuickActionsOpen}>
          <DialogContent className="sm:max-w-md max-w-[92vw] rounded-2xl p-5">
            <DialogHeader className="pb-2 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-forest dark:text-oat" />
                Quick Priority Actions
              </DialogTitle>
              <DialogDescription className="text-xs">
                One-tap shortcuts for bakery operations on mobile.
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const uRole = (auth.role || 'MEMBER').toUpperCase()
              const isOwnerOrAdmin = uRole === 'OWNER' || uRole === 'ADMIN'
              const isManager = isOwnerOrAdmin || uRole === 'BRANCH_MANAGER'
              const isFinancial = isOwnerOrAdmin || uRole === 'ACCOUNTANT'
              const isBaker = isOwnerOrAdmin || uRole.includes('BAKER') || uRole.includes('PRODUCTION')
              const isCashier = isOwnerOrAdmin || uRole.includes('CASHIER') || uRole.includes('SALES')
              const isStore = isOwnerOrAdmin || uRole.includes('STORE') || uRole.includes('INVENTORY')

              return (
                <div className="grid grid-cols-2 gap-2.5 pt-3">
                  {(isBaker || isManager) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileQuickActionsOpen(false)
                        handleNavigateTab('production')
                      }}
                      className="flex flex-col items-start p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 text-left transition-colors cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center mb-1.5">
                        <Flame className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-xs text-foreground">Start Mitad Baking</span>
                      <span className="text-[10px] text-muted-foreground">New baking batch</span>
                    </button>
                  )}

                  {(isCashier || isManager || isFinancial) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileQuickActionsOpen(false)
                        handleNavigateTab('sales')
                      }}
                      className="flex flex-col items-start p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-left transition-colors cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-1.5">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-xs text-foreground">Record POS Sale</span>
                      <span className="text-[10px] text-muted-foreground">Cash & credit checkout</span>
                    </button>
                  )}

                  {(isStore || isManager || isBaker) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileQuickActionsOpen(false)
                        handleNavigateTab('materials')
                      }}
                      className="flex flex-col items-start p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 text-left transition-colors cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center mb-1.5">
                        <Boxes className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-xs text-foreground">Raw Materials</span>
                      <span className="text-[10px] text-muted-foreground">Teff flour & stock</span>
                    </button>
                  )}

                  {(isFinancial || isManager) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileQuickActionsOpen(false)
                        handleNavigateTab('expenses')
                      }}
                      className="flex flex-col items-start p-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-left transition-colors cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-red-500/20 text-red-600 flex items-center justify-center mb-1.5">
                        <Coins className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-xs text-foreground">Record Expense</span>
                      <span className="text-[10px] text-muted-foreground">OPEX & payments</span>
                    </button>
                  )}
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>
      </SidebarInset>

      {/* Bakery Onboarding Guide Modal */}
      <Suspense fallback={null}>
        {onboardingOpen && (
          <OnboardingGuideModal
            open={onboardingOpen}
            onOpenChange={setOnboardingOpen}
            onNavigateTab={handleNavigateTab}
          />
        )}
      </Suspense>

      {/* Shadcn Sonner Toaster */}
      <Toaster />
    </SidebarProvider>
  )
}

export default App
