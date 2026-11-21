import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  authApi,
  rolesApi,
  type ActiveSession,
  type AuthContextResponse,
  type PermissionEntity,
  type RoleEntity,
} from '@/lib/api'
import { ROLE_OPTIONS } from '@/types/enums'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CheckCircle2,
  Clock,
  Key,
  Laptop,
  Layers,
  Loader2,
  LogOut,
  Package,
  RefreshCw,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

interface DemoDashboardProps {
  auth: AuthContextResponse
  onLogout: () => void
}

export function DemoDashboard({ auth, onLogout }: DemoDashboardProps) {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [rotationStatus, setRotationStatus] = useState<string | null>(null)
  const [isRotating, setIsRotating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [roles, setRoles] = useState<RoleEntity[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [selectedRoleName, setSelectedRoleName] = useState<string>('OWNER')

  const loadSessions = async (showToast = false) => {
    setLoadingSessions(true)
    try {
      const data = await authApi.getSessions()
      setSessions(data)
      if (showToast) {
        toast.info('Sessions refreshed', {
          description: `${data.length} active session(s) tracked.`,
        })
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err)
      toast.error('Failed to load sessions', {
        description: 'Could not fetch active device sessions.',
      })
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    let ignore = false
    authApi
      .getSessions()
      .then((data) => {
        if (!ignore) {
          setSessions(data)
        }
      })
      .catch((err) => {
        console.error('Failed to load active sessions:', err)
      })

    rolesApi
      .getRoles()
      .then((data) => {
        if (!ignore) {
          setRoles(data)
          if (data.length > 0) {
            setSelectedRoleName(auth.role ?? data[0].name)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load roles:', err)
      })
      .finally(() => {
        if (!ignore) setLoadingRoles(false)
      })

    return () => {
      ignore = true
    }
  }, [auth.role])

  const handleTestRotation = async () => {
    setIsRotating(true)
    setRotationStatus(null)
    try {
      await authApi.refresh()
      const message = 'Rotated refresh token and renewed access cookie successfully.'
      setRotationStatus(message)
      toast.success('Session renewed', {
        description: 'Access and refresh cookies were rotated cleanly.',
      })
      await loadSessions()
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        'Session rotation failed. Token may be expired.'
      setRotationStatus(message)
      toast.error('Rotation failed', {
        description: message,
      })
    } finally {
      setIsRotating(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      await authApi.revokeSession(sessionId)
      if (sessionId === auth.sessionId) {
        toast.info('Current session revoked', {
          description: 'You have been signed out from this device.',
        })
        onLogout()
        return
      }
      toast.success('Device revoked', {
        description: 'Session terminated successfully.',
      })
      await loadSessions()
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        'Could not revoke session.'
      toast.error('Failed to revoke session', {
        description: message,
      })
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeOthers = async () => {
    setLoadingSessions(true)
    try {
      const res = await authApi.revokeOtherSessions()
      toast.success('Other sessions revoked', {
        description: `Successfully revoked ${res.revokedCount} other active device(s).`,
      })
      await loadSessions()
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        'Failed to revoke other sessions.'
      toast.error('Action failed', {
        description: message,
      })
    } finally {
      setLoadingSessions(false)
    }
  }

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return isoString
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Top Header */}
      <header className="flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Production Dashboard
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Live workspace
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground">
            {auth.user.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Account: {auth.user.email} &bull; Role:{' '}
            <span className="font-medium text-foreground">{auth.role ?? 'MEMBER'}</span> &bull; Business ID:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground font-mono">
              {auth.businessId.slice(0, 8)}…
            </code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTestRotation}
            disabled={isRotating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            <span>Test cookie rotation</span>
          </button>

          <button
            type="button"
            onClick={() => {
              toast.info('Signed out', {
                description: 'Active cookie session cleared.',
              })
              onLogout()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Rotation Notification */}
      {rotationStatus && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{rotationStatus}</span>
        </div>
      )}

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Today's output
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-medium tracking-tight">1,420 injera</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Morning shift complete &bull; Evening running
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Flour lot on hand
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-medium tracking-tight">48 quintals</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Magna teff &bull; Lot #TF-2026-08
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active shifts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-medium tracking-tight">6 bakers</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Branch: Bole Main Bakery
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Storage security
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-medium tracking-tight">HttpOnly cookies</div>
            <p className="mt-1 text-xs text-muted-foreground">
              0 tokens stored in localStorage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Active Sessions & Security Box */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active Sessions Tracking */}
        <div className="lg:col-span-2">
          <Card className="border-border/80">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  Active device sessions
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time database tracking of authenticated clients and tokens.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadSessions(true)}
                  disabled={loadingSessions}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingSessions ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRevokeOthers}
                    disabled={loadingSessions}
                    className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
                  >
                    <span>Revoke other devices</span>
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {loadingSessions && sessions.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading active sessions…
                </div>
              ) : sessions.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No active sessions found.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md border border-border bg-muted p-1.5 text-muted-foreground">
                          {session.userAgent?.includes('Mobile') ? (
                            <Smartphone className="h-4 w-4" />
                          ) : (
                            <Laptop className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">
                              {session.userAgent?.split(' ')[0] ?? 'Web Browser'}
                            </span>
                            {session.isCurrent && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                This device
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span>IP: {session.ipAddress ?? '127.0.0.1'}</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last active: {formatDate(session.lastUsedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title={session.isCurrent ? 'Sign out this session' : 'Revoke device session'}
                      >
                        {revokingId === session.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Security Architecture Box */}
        <div>
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Security architecture
              </CardTitle>
              <CardDescription className="text-xs">
                How this workspace protects identity and session keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                <p className="font-medium text-foreground">
                  HttpOnly and SameSite cookies
                </p>
                <p className="mt-1 text-muted-foreground">
                  Access and refresh tokens are managed entirely by browser cookie jars with
                  <code className="mx-1 rounded bg-muted px-1 font-mono text-[11px]">httpOnly</code>
                  and
                  <code className="mx-1 rounded bg-muted px-1 font-mono text-[11px]">SameSite=Lax</code>.
                  JavaScript cannot read these tokens, neutralizing token theft via XSS.
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                <p className="font-medium text-foreground">
                  Automatic token rotation
                </p>
                <p className="mt-1 text-muted-foreground">
                  Each refresh invalidates the previous refresh token and issues a fresh one. If an attacker presents an already-used token, the system detects token theft and immediately revokes all active sessions for that token family.
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
                <p className="font-medium text-foreground">
                  Assigned permissions
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {auth.permissions.map((p: string) => (
                    <span
                      key={p}
                      className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground border border-border"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Specific Bakery Roles & Permission Matrix Section */}
      <Card className="border-border/80">
        <CardHeader className="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base font-medium">
                Bakery Roles & Permission Matrix
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Standard template and business roles configured with granular permissions across baking, sales, and inventory stations.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              {roles.length} roles available
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {loadingRoles ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading bakery roles and permissions…
            </div>
          ) : (
            <div className="space-y-4">
              {/* Role selection tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
                {roles.map((r) => {
                  const isSelected = r.name === selectedRoleName
                  const opt = ROLE_OPTIONS.find((o) => o.value === r.name)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoleName(r.name)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-foreground text-background shadow-xs'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Key className="h-3 w-3" />
                      <span>{opt?.label ?? r.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                          isSelected ? 'bg-background/20 text-background' : 'bg-background text-muted-foreground'
                        }`}
                      >
                        {r.permissions.length}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Selected role details and permissions */}
              {(() => {
                const activeRole = roles.find((r) => r.name === selectedRoleName) ?? roles[0]
                if (!activeRole) return null
                const opt = ROLE_OPTIONS.find((o) => o.value === activeRole.name)

                return (
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {opt?.label ?? activeRole.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {activeRole.description ?? opt?.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeRole.isSystem && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Standard system role
                          </span>
                        )}
                        {auth.role === activeRole.name && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            Your active role
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-border/60 pt-3">
                      <p className="text-xs font-medium text-foreground mb-2">
                        Assigned Capabilities ({activeRole.permissions.length}):
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {activeRole.permissions.map((p: PermissionEntity) => (
                          <div
                            key={p.id}
                            className="flex flex-col justify-between rounded-md border border-border bg-background p-2 text-xs"
                          >
                            <code className="font-mono text-[11px] font-semibold text-foreground">
                              {p.code}
                            </code>
                            <span className="mt-0.5 text-[11px] text-muted-foreground">
                              {p.description ?? 'System granted permission'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
