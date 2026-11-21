import { useEffect, useState } from 'react'
import {
  authApi,
  userApi,
  type ActiveSession,
  type AuthContextResponse,
  type UserProfile,
} from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  RefreshCw,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

interface UserProfileViewProps {
  auth: AuthContextResponse
  onLogout: () => void
}

export function UserProfileView({ auth, onLogout }: UserProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Profile Edit State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Active Sessions
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)

  const loadProfile = async () => {
    try {
      const data = await userApi.getProfile()
      setProfile(data)
      setName(data.name || '')
      setPhone(data.phone || '')
    } catch (err) {
      console.error('Failed to load profile:', err)
      setName(auth.user.name || '')
      setPhone(auth.user.phone || '')
    } finally {
      setLoadingProfile(false)
    }
  }

  const loadSessions = async () => {
    try {
      const list = await authApi.getSessions()
      setSessions(list)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    let ignore = false

    void userApi.getProfile()
      .then((data) => {
        if (!ignore) {
          setProfile(data)
          setName(data.name || '')
          setPhone(data.phone || '')
          setLoadingProfile(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load profile:', err)
          setName(auth.user.name || '')
          setPhone(auth.user.phone || '')
          setLoadingProfile(false)
        }
      })

    void authApi.getSessions()
      .then((list) => {
        if (!ignore) {
          setSessions(list)
          setLoadingSessions(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load sessions:', err)
          setLoadingSessions(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [auth.user.name, auth.user.phone])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await userApi.updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      setProfile(updated)
      toast.success('Profile updated', {
        description: 'Your personal information has been saved.',
      })
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message ?? 'Failed to update profile'
      toast.error('Update failed', { description: msg })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      toast.error('Current password is required')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }

    setSavingPassword(true)
    try {
      await authApi.changePassword({ currentPassword, newPassword })
      toast.success('Password changed', {
        description: 'Your account password has been updated securely.',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message ?? 'Failed to change password'
      toast.error('Password change failed', { description: msg })
    } finally {
      setSavingPassword(false)
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
      toast.success('Session terminated', {
        description: 'The selected device session has been revoked.',
      })
      await loadSessions()
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message ?? 'Failed to revoke session'
      toast.error('Revocation failed', { description: msg })
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeOtherSessions = async () => {
    if (!confirm('Revoke all other active device sessions?')) return
    setRevokingAll(true)
    try {
      const res = await authApi.revokeOtherSessions()
      toast.success('Sessions revoked', {
        description: `Successfully terminated ${res.revokedCount} other active session(s).`,
      })
      await loadSessions()
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message ?? 'Failed to revoke other sessions'
      toast.error('Revocation failed', { description: msg })
    } finally {
      setRevokingAll(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-oat">
                <User className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-forest dark:text-oat">
                My Profile & Account Security
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage your personal credentials, contact info, cryptographic session devices, and role privileges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadProfile()
                void loadSessions()
              }}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onLogout}
              className="gap-1.5 text-xs h-8"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Personal Information & Password Change */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Personal Details */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/80">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-forest dark:text-oat" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-xs">
                Your primary display identity across KD PLC audit logs and receipts.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="pt-4 space-y-4">
                {loadingProfile ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Full Name
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Primary Email (Immutable Identity)
                      </label>
                      <Input
                        value={profile?.email || auth.user.email}
                        disabled
                        className="text-xs font-mono bg-muted text-muted-foreground"
                      />
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        Verified account identifier.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Contact Phone
                      </label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+251 9..."
                        className="text-xs font-mono"
                      />
                    </div>
                  </>
                )}
              </CardContent>

              <div className="flex items-center justify-end p-4 border-t border-border bg-muted/10">
                <Button
                  type="submit"
                  disabled={savingProfile || loadingProfile}
                  size="sm"
                  className="bg-forest text-oat hover:bg-forest-light text-xs h-8 gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{savingProfile ? 'Saving…' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Card 2: Security & Password */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/80">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-forest dark:text-oat" />
                Change Password
              </CardTitle>
              <CardDescription className="text-xs">
                Update your account password with cryptographic bcrypt verification.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Current Password *
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      New Password *
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Confirm New Password *
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-forest dark:text-oat" />
                    Security Best Practice
                  </div>
                  <p>
                    Ensure your password is at least 8 characters long and contains both uppercase letters and numbers.
                  </p>
                </div>
              </CardContent>

              <div className="flex items-center justify-end p-4 border-t border-border bg-muted/10">
                <Button
                  type="submit"
                  disabled={savingPassword}
                  size="sm"
                  className="bg-forest text-oat hover:bg-forest-light text-xs h-8 gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{savingPassword ? 'Updating Password…' : 'Update Password'}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Roles & Active Device Sessions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Business & Role Context */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/80">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-forest dark:text-oat" />
                Enterprise Organization Context
              </CardTitle>
              <CardDescription className="text-xs">
                Your assigned company and RBAC credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border/70">
                <span className="text-muted-foreground">Enterprise Name</span>
                <span className="font-bold text-foreground">
                  {auth.business?.name ?? 'KD PLC'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border/70">
                <span className="text-muted-foreground">Business Identifier</span>
                <span className="font-mono text-[11px] font-semibold text-forest dark:text-oat">
                  {auth.businessId.slice(0, 12)}…
                </span>
              </div>

              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border/70">
                <span className="text-muted-foreground">Assigned Role</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-0.5 text-[10px] font-bold text-forest dark:bg-oat/15 dark:text-oat uppercase">
                  <Shield className="h-3 w-3" />
                  {auth.role ?? 'MEMBER'}
                </span>
              </div>

              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Zero-Trust multi-tenant isolation enforced for this user ID.</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Active Device Sessions */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/80">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-forest dark:text-oat" />
                    Active Device Sessions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cryptographic tokens and authenticated devices.
                  </CardDescription>
                </div>

                {sessions.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevokeOtherSessions}
                    disabled={revokingAll}
                    className="text-[11px] h-7 border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    Revoke Others
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 max-h-[380px] overflow-y-auto">
              {loadingSessions ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No active sessions found.
                </div>
              ) : (
                sessions.map((sess) => {
                  const isCurrent = sess.id === auth.sessionId
                  const isMobile =
                    /mobile|android|iphone/i.test(sess.userAgent || '')
                  const Icon = isMobile ? Smartphone : Laptop

                  return (
                    <div
                      key={sess.id}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                        isCurrent
                          ? 'border-forest/40 bg-forest/5 dark:border-oat/30 dark:bg-oat/10'
                          : 'border-border/60 bg-card hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-forest text-oat'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                              {sess.userAgent
                                ? sess.userAgent.split(' ')[0]
                                : 'Web Browser'}
                            </span>
                            {isCurrent && (
                              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                                THIS DEVICE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            IP: {sess.ipAddress || '127.0.0.1'} &bull;{' '}
                            {new Date(sess.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleRevokeSession(sess.id)}
                        disabled={revokingId === sess.id}
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded transition-colors"
                        title={isCurrent ? 'Sign out this device' : 'Revoke device session'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
