import { useEffect, useRef, useState } from 'react'
import { authApi, type AuthContextResponse } from '@/lib/api'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { LandingPage } from '@/components/landing/LandingPage'
import { DemoDashboard } from '@/components/dashboard/DemoDashboard'
import { BusinessSettingsView } from '@/components/business/BusinessSettingsView'
import { BranchManagementView } from '@/components/business/BranchManagementView'
import { TeamMembersView } from '@/components/business/TeamMembersView'
import { RolesManagementView } from '@/components/roles/RolesManagementView'
import { UserProfileView } from '@/components/profile/UserProfileView'
import { WorkforceManagementView } from '@/components/workforce/WorkforceManagementView'
import { MaterialsManagementView } from '@/components/materials/MaterialsManagementView'
import { RecipesManagementView } from '@/components/recipes/RecipesManagementView'
import { ProductionManagementView } from '@/components/production/ProductionManagementView'
import { CostingManagementView } from '@/components/costing/CostingManagementView'
import { InventoryManagementView } from '@/components/inventory/InventoryManagementView'
import { SalesManagementView } from '@/components/sales/SalesManagementView'
import { ExpensesManagementView } from '@/components/expenses/ExpensesManagementView'
import { FinancialReportsView } from '@/components/reports/FinancialReportsView'
import { SyncManagementView } from '@/components/sync/SyncManagementView'
import { SystemSettingsView } from '@/components/system/SystemSettingsView'
import { OnboardingGuideModal } from '@/components/onboarding/OnboardingGuide'
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
  BookOpen,
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
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'

export function App() {
  const [auth, setAuth] = useState<AuthContextResponse | null>(null)
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing')
  const [activeTab, setActiveTab] = useState<TabType>('workspace')
  const [isInitializing, setIsInitializing] = useState(true)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const [mobileQuickActionsOpen, setMobileQuickActionsOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

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

  // Listen to connectivity changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
      setAuthView('landing')
      setActiveTab('workspace')
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

  // 2. Standalone Landing Page (NO sidebar intrusion whatsoever)
  if ((!auth && authView === 'landing') || activeTab === 'landing') {
    return (
      <>
        <LandingPage
          onEnterWorkspace={() => {
            if (auth) {
              setActiveTab('workspace')
            } else {
              setAuthView('login')
            }
          }}
          onOpenLogin={() => {
            setActiveTab('workspace')
            setAuthView('login')
          }}
          onOpenRegister={() => {
            setActiveTab('workspace')
            setAuthView('register')
          }}
          isAuthenticated={!!auth}
        />
        <Toaster />
      </>
    )
  }

  // 3. Unauthenticated Login & Register Views (Clean full-page without internal sidebar)
  if (!auth) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-forest selection:text-oat">
        {authView === 'login' ? (
          <LoginForm
            onSuccess={(data: AuthContextResponse) => {
              setAuth(data)
              setActiveTab('workspace')
            }}
            onSwitchToRegister={() => setAuthView('register')}
            onBackToLanding={() => setAuthView('landing')}
          />
        ) : (
          <RegisterForm
            onSuccess={(data: AuthContextResponse) => {
              setAuth(data)
              setActiveTab('workspace')
            }}
            onSwitchToLogin={() => setAuthView('login')}
            onBackToLanding={() => setAuthView('landing')}
          />
        )}
        <Toaster />
      </div>
    )
  }

  // 4. Authenticated Workspace (Full sidebar navigation)
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        auth={auth}
        authView={authView}
        onSelectAuthView={setAuthView}
        onOpenOnboarding={() => setOnboardingOpen(true)}
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
                {activeTab === 'sync' && 'Offline Queue & Synchronization Engine'}
                {activeTab === 'team' && 'Staff Roster & Membership'}
                {activeTab === 'roles' && 'Roles, Permissions & Security Governance'}
                {activeTab === 'profile' && 'My Profile & Account Security'}
                {activeTab === 'settings' && 'Bakery Business Settings'}
                {activeTab === 'system' && 'Enterprise System Status, Operational Tweaks & Audit Trail'}
                {activeTab === 'workspace' &&
                  (auth ? `${auth.business?.name ?? 'KD PLC'} Executive Operations Dashboard` : 'KD PLC • InjeraOS Platform')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground md:inline-flex mr-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>HttpOnly Active</span>
            </span>

            {auth && (
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
                          setActiveTab('profile')
                          setUserDropdownOpen(false)
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
                              setActiveTab('roles')
                              setUserDropdownOpen(false)
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
                              setActiveTab('system')
                              setUserDropdownOpen(false)
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                              activeTab === 'system'
                                ? 'bg-forest/10 text-forest font-semibold dark:bg-oat/15 dark:text-oat'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <Sliders className="h-4 w-4 text-forest dark:text-oat shrink-0" />
                            <span>System Settings & Status</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('system')
                              setUserDropdownOpen(false)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-muted text-foreground cursor-pointer"
                          >
                            <History className="h-4 w-4 text-forest dark:text-oat shrink-0" />
                            <span>Audit Trail</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false)
                          setOnboardingOpen(true)
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-muted text-foreground cursor-pointer text-xs"
                      >
                        <BookOpen className="h-4 w-4 text-forest dark:text-oat shrink-0" />
                        <span>Onboarding Guide</span>
                      </button>
                    </div>

                    {/* Sign Out Action */}
                    <div className="border-t border-border/60 mt-1 pt-1">
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
                )}
              </div>
            )}
          </div>
        </header>

        {/* Global Offline Banner */}
        {!isOnline && (
          <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Working in Offline Mode.</strong> Operations will queue in IndexedDB and synchronize automatically upon reconnection.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('sync')}
              className="cursor-pointer font-medium underline hover:no-underline ml-2"
            >
              View Offline Queue
            </button>
          </div>
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {activeTab === 'branches' ? (
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
          ) : activeTab === 'sync' ? (
            <SyncManagementView />
          ) : activeTab === 'team' ? (
            <TeamMembersView />
          ) : activeTab === 'roles' ? (
            <RolesManagementView />
          ) : activeTab === 'profile' ? (
            <UserProfileView auth={auth} onLogout={handleLogout} />
          ) : activeTab === 'settings' ? (
            <BusinessSettingsView />
          ) : activeTab === 'system' ? (
            <SystemSettingsView />
          ) : (
            <DemoDashboard
              auth={auth}
              onLogout={handleLogout}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            />
          )}
        </main>

        <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground mb-16 md:mb-0">
          <p>KD PLC &bull; Injera Commercial Bakery Operating System</p>
        </footer>

        {/* Mobile Fixed Bottom Navigation Bar & Priority Action Dock */}
        {auth && (
          <nav
            aria-label="Mobile Navigation Dock"
            className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Overview / Home */}
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
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
              onClick={() => setActiveTab('production')}
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
              onClick={() => setActiveTab('sales')}
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
              onClick={() => setActiveTab('profile')}
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
        )}

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

            <div className="grid grid-cols-2 gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('production')
                  setMobileQuickActionsOpen(false)
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 text-left transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center mb-1.5">
                  <Flame className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-foreground">Start Mitad Baking</span>
                <span className="text-[10px] text-muted-foreground">New baking batch</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('sales')
                  setMobileQuickActionsOpen(false)
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-left transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-1.5">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-foreground">Record POS Sale</span>
                <span className="text-[10px] text-muted-foreground">Cash & wholesale</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('materials')
                  setMobileQuickActionsOpen(false)
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/15 text-left transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-sky-500/20 text-sky-600 flex items-center justify-center mb-1.5">
                  <Boxes className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-foreground">Receive Teff Lot</span>
                <span className="text-[10px] text-muted-foreground">Grain intake</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('sync')
                  setMobileQuickActionsOpen(false)
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/70 text-left transition-colors cursor-pointer relative"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1.5">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-foreground">Offline Queue</span>
                <span className="text-[10px] text-muted-foreground">
                  {pendingSyncCount > 0 ? `${pendingSyncCount} pending ops` : 'Synchronized'}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-amber-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('expenses')
                  setMobileQuickActionsOpen(false)
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 text-left transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-rose-500/20 text-rose-600 flex items-center justify-center mb-1.5">
                  <Coins className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-foreground">Log Expense</span>
                <span className="text-[10px] text-muted-foreground">Bakery OPEX</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile')
                  setMobileQuickActionsOpen(false)
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-forest/30 bg-forest/10 hover:bg-forest/15 dark:bg-oat/15 text-left transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-forest text-oat flex items-center justify-center mb-1.5 font-bold text-xs">
                  {auth.user.name ? auth.user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="font-bold text-xs text-foreground">My Profile</span>
                <span className="text-[10px] text-muted-foreground">Settings & security</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileQuickActionsOpen(false)
                  setOnboardingOpen(true)
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-left transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-1.5">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-foreground">Onboarding Guide</span>
                <span className="text-[10px] text-muted-foreground">Checklist & guides</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>

      {/* Bakery Onboarding Guide Modal */}
      <OnboardingGuideModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onNavigateTab={setActiveTab}
      />

      {/* Shadcn Sonner Toaster */}
      <Toaster />
    </SidebarProvider>
  )
}

export default App
