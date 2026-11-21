import { useEffect, useState } from 'react'
import { authApi, type AuthContextResponse } from '@/lib/api'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { DemoDashboard } from '@/components/dashboard/DemoDashboard'
import { BusinessSettingsView } from '@/components/business/BusinessSettingsView'
import { BranchManagementView } from '@/components/business/BranchManagementView'
import { TeamMembersView } from '@/components/business/TeamMembersView'
import { UnslopTool } from '@/components/unslop/UnslopTool'
import { Toaster } from '@/components/ui/sonner'
import {
  Building2,
  GitBranch,
  Loader2,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

type TabType = 'workspace' | 'branches' | 'team' | 'settings' | 'unslop'

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
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setActiveTab('workspace')
              }}
              className="flex items-center gap-2 text-sm font-medium tracking-tight text-foreground hover:opacity-90"
            >
              <Store className="h-4 w-4" />
              <span>InjeraOS</span>
            </a>

            <div className="hidden h-4 w-px bg-border sm:block" />

            <nav className="flex items-center gap-1 overflow-x-auto py-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTab === 'workspace'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                Overview
              </button>

              {auth && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('branches')}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      activeTab === 'branches'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <GitBranch className="h-3 w-3" />
                    <span>Branches</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('team')}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      activeTab === 'team'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    <span>Team</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      activeTab === 'settings'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <Building2 className="h-3 w-3" />
                    <span>Business Profile</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('unslop')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTab === 'unslop'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Unslop editor</span>
              </button>
            </nav>
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
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {activeTab === 'unslop' ? (
          <UnslopTool />
        ) : isInitializing ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking active cookie session…</span>
          </div>
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
        ) : activeTab === 'team' ? (
          <TeamMembersView />
        ) : activeTab === 'settings' ? (
          <BusinessSettingsView />
        ) : (
          <DemoDashboard auth={auth} onLogout={handleLogout} />
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <p>Injera Bakery Commerce Platform &bull; Multi-Tenant Operating System</p>
      </footer>

      {/* Shadcn Sonner Toaster */}
      <Toaster />
    </div>
  )
}

export default App
