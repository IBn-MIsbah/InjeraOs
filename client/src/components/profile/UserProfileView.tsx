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
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  Smartphone,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

interface UserProfileViewProps {
  auth: AuthContextResponse
  onLogout: () => void
}

type ProfileTab = 'details' | 'security' | 'devices' | 'access'

export function UserProfileView({ auth, onLogout }: UserProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('details')

  // Profile data & form
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [originalPhone, setOriginalPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Active Sessions
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)

  // Track if profile form has unsaved edits
  const hasProfileEdits = name !== originalName || phone !== originalPhone

  const loadProfile = async () => {
    try {
      setLoadingProfile(true)
      const data = await userApi.getProfile()
      setProfile(data)
      setName(data.name || '')
      setPhone(data.phone || '')
      setOriginalName(data.name || '')
      setOriginalPhone(data.phone || '')
    } catch (err) {
      console.error('Failed to load profile:', err)
      const fallbackName = auth.user.name || ''
      const fallbackPhone = auth.user.phone || ''
      setName(fallbackName)
      setPhone(fallbackPhone)
      setOriginalName(fallbackName)
      setOriginalPhone(fallbackPhone)
    } finally {
      setLoadingProfile(false)
    }
  }

  const loadSessions = async () => {
    try {
      setLoadingSessions(true)
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

    const init = async () => {
      try {
        const [profileData, sessionsList] = await Promise.all([
          userApi.getProfile().catch(() => null),
          authApi.getSessions().catch(() => []),
        ])

        if (!ignore) {
          if (profileData) {
            setProfile(profileData)
            setName(profileData.name || '')
            setPhone(profileData.phone || '')
            setOriginalName(profileData.name || '')
            setOriginalPhone(profileData.phone || '')
          } else {
            setName(auth.user.name || '')
            setPhone(auth.user.phone || '')
            setOriginalName(auth.user.name || '')
            setOriginalPhone(auth.user.phone || '')
          }
          setSessions(sessionsList)
        }
      } finally {
        if (!ignore) {
          setLoadingProfile(false)
          setLoadingSessions(false)
        }
      }
    }

    void init()

    return () => {
      ignore = true
    }
  }, [auth.user.name, auth.user.phone])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter your full name')
      return
    }

    setSavingProfile(true)
    try {
      const updated = await userApi.updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      setProfile(updated)
      setOriginalName(updated.name || '')
      setOriginalPhone(updated.phone || '')
      toast.success('Profile saved', {
        description: 'Your contact details have been updated.',
      })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Could not save profile'
      toast.error('Save failed', { description: msg })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleResetProfile = () => {
    setName(originalName)
    setPhone(originalPhone)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      toast.error('Please enter your current password')
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
      toast.success('Password updated', {
        description: 'You can now use your new password next time you sign in.',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Could not update password'
      toast.error('Update failed', { description: msg })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      await authApi.revokeSession(sessionId)
      if (sessionId === auth.sessionId) {
        toast.info('Signed out', {
          description: 'This device session has ended.',
        })
        onLogout()
        return
      }
      toast.success('Device removed', {
        description: 'The selected device has been signed out.',
      })
      await loadSessions()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Could not revoke device'
      toast.error('Failed', { description: msg })
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeOtherSessions = async () => {
    if (!confirm('Sign out from all other devices?')) return
    setRevokingAll(true)
    try {
      const res = await authApi.revokeOtherSessions()
      toast.success('Signed out other devices', {
        description: `Ended ${res.revokedCount} other active session(s).`,
      })
      await loadSessions()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Could not sign out other devices'
      toast.error('Failed', { description: msg })
    } finally {
      setRevokingAll(false)
    }
  }

  const userInitial = auth.user.name ? auth.user.name[0].toUpperCase() : 'U'
  const userRole = (auth.role || 'Member').toUpperCase()

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Hero Profile Identity Card */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-[#EEE5D4]/20 dark:to-emerald-950/20 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Oat Milk Avatar */}
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-[#EEE5D4] text-[#1D4A35] text-2xl sm:text-3xl font-extrabold shadow-sm border border-[#1D4A35]/20 shrink-0">
              {userInitial}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {name || auth.user.name || 'KD PLC Team Member'}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-0.5 text-[10px] font-bold text-forest dark:bg-oat/15 dark:text-oat uppercase tracking-wide">
                  <Shield className="h-3 w-3" />
                  {userRole}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                  {auth.user.email}
                </span>
                {phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
                    {phone}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground pt-0.5">
                Bakery Workspace: <strong className="text-foreground">{auth.business?.name ?? 'KD PLC'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadProfile()
                void loadSessions()
              }}
              className="gap-1.5 text-xs h-8 border-border/80 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onLogout}
              className="gap-1.5 text-xs h-8 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Quick Identity Pills */}
        <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-background/60 border border-border/60">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Account Role</span>
            <span className="font-bold text-foreground mt-0.5 block">{userRole}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-background/60 border border-border/60">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Workspace</span>
            <span className="font-bold text-foreground mt-0.5 block truncate">{auth.business?.name ?? 'KD PLC'}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-background/60 border border-border/60">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Signed-In Devices</span>
            <span className="font-bold text-foreground mt-0.5 block font-mono">
              {sessions.length || 1} active
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-background/60 border border-border/60">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Session Security</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="h-3 w-3" />
              HttpOnly Active
            </span>
          </div>
        </div>
      </div>

      {/* Profile Section Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'details'
              ? 'bg-forest text-oat shadow-xs dark:bg-oat dark:text-forest font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Personal Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-forest text-oat shadow-xs dark:bg-oat dark:text-forest font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Password & Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'devices'
              ? 'bg-forest text-oat shadow-xs dark:bg-oat dark:text-forest font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Laptop className="h-3.5 w-3.5" />
          <span>Signed-in Devices ({sessions.length || 1})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('access')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'access'
              ? 'bg-forest text-oat shadow-xs dark:bg-oat dark:text-forest font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Role & Workstation Access</span>
        </button>
      </div>

      {/* TAB 1: PERSONAL DETAILS */}
      {activeTab === 'details' && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-forest dark:text-oat" />
              Contact Details
            </CardTitle>
            <CardDescription className="text-xs">
              Your name and phone number appear on baking batches, sales receipts, and attendance timesheets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProfile ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Full Name *
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Abebe Bikila"
                      className="text-xs"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Used when signing batch outputs or POS receipts.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Phone Number
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+251 9..."
                      className="text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      For dispatch calls and shift notifications.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-foreground">
                    Work Email Address
                  </label>
                  <Input
                    value={profile?.email || auth.user.email}
                    disabled
                    className="text-xs font-mono bg-muted/60 text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    Primary login identity. To change your registered email, contact your bakery administrator.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-[11px] text-muted-foreground">
                    {hasProfileEdits ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        You have unsaved changes.
                      </span>
                    ) : (
                      <span>All information is up to date.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasProfileEdits && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetProfile}
                        disabled={savingProfile}
                        className="text-xs h-8 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={savingProfile || !hasProfileEdits}
                      size="sm"
                      className="bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest text-xs h-8 gap-1.5 cursor-pointer font-semibold"
                    >
                      {savingProfile ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: PASSWORD & SECURITY */}
      {activeTab === 'security' && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-forest dark:text-oat" />
              Change Password
            </CardTitle>
            <CardDescription className="text-xs">
              Choose a secure password with at least 8 characters. You will stay signed in on your current device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Current Password *
                </label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="text-xs pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    New Password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="text-xs pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Confirm New Password *
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground block">Password Requirements:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li className={newPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                    Minimum 8 characters
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                    At least one uppercase letter recommended
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                    At least one number recommended
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={savingPassword || !currentPassword || !newPassword}
                  size="sm"
                  className="bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest text-xs h-8 gap-1.5 cursor-pointer font-semibold"
                >
                  {savingPassword ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: SIGNED-IN DEVICES */}
      {activeTab === 'devices' && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-forest dark:text-oat" />
                  Active Signed-in Devices
                </CardTitle>
                <CardDescription className="text-xs">
                  Where you are currently logged in to KD PLC. If you see a device you do not recognize, sign it out.
                </CardDescription>
              </div>

              {sessions.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeOtherSessions}
                  disabled={revokingAll}
                  className="text-xs h-8 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer self-start sm:self-auto"
                >
                  {revokingAll ? 'Signing out...' : 'Sign out all other devices'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingSessions ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No active device sessions found.
              </div>
            ) : (
              sessions.map((sess) => {
                const isCurrent = sess.id === auth.sessionId
                const isMobile = /mobile|android|iphone|ipad/i.test(sess.userAgent || '')
                const DeviceIcon = isMobile ? Smartphone : Laptop

                return (
                  <div
                    key={sess.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-xs transition-colors ${
                      isCurrent
                        ? 'border-forest/40 bg-forest/5 dark:border-oat/30 dark:bg-oat/10'
                        : 'border-border/60 bg-card hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-forest text-oat'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <DeviceIcon className="h-5 w-5" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {sess.userAgent
                              ? sess.userAgent.split(' ')[0]
                              : isMobile
                                ? 'Mobile Phone'
                                : 'Computer Browser'}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.2 text-[9px] font-bold">
                              THIS DEVICE
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground font-mono">
                          <span>IP: {sess.ipAddress || '127.0.0.1'}</span>
                          <span>Last active: {new Date(sess.lastUsedAt || sess.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRevokeSession(sess.id)}
                      disabled={revokingId === sess.id}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1"
                      title={isCurrent ? 'Sign out this device' : 'Sign out this remote device'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        {isCurrent ? 'Sign Out' : 'Disconnect'}
                      </span>
                    </Button>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: ROLE & WORKSTATION ACCESS */}
      {activeTab === 'access' && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-forest dark:text-oat" />
              Role & Workstation Access
            </CardTitle>
            <CardDescription className="text-xs">
              Overview of your role, company, and permissions inside the bakery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Assigned Role</span>
                <span className="text-sm font-bold text-foreground block">{userRole}</span>
                <span className="text-[11px] text-muted-foreground">
                  {userRole === 'OWNER' && 'Full executive authority across all baking operations and financials.'}
                  {userRole === 'ADMIN' && 'Bakery system administration and team management.'}
                  {userRole === 'BAKER' && 'Mitad baking sessions, yield tracking, and defect logging.'}
                  {userRole === 'CASHIER' && 'Point-of-sale checkout, payment receipts, and customer credit.'}
                  {userRole === 'STOREKEEPER' && 'Raw materials intake, grain silos, and finished goods inventory.'}
                  {userRole === 'MEMBER' && 'Standard bakery workforce member.'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Bakery Enterprise</span>
                <span className="text-sm font-bold text-foreground block truncate">
                  {auth.business?.name ?? 'KD PLC'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Licensed Injera Production Facility
                </span>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Station Assignment</span>
                <span className="text-sm font-bold text-foreground block">Main Baking Plant</span>
                <span className="text-[11px] text-muted-foreground">
                  Mitad Clay & Electric lines, Flour Silo #1
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-forest dark:text-oat" />
                Station Attendance
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Attendance clock-in records track your shift start and conclusion at your assigned station. For schedule adjustments or leave requests, speak with your shift supervisor.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Floating Priority Action Bar (When unsaved edits exist on details tab) */}
      {hasProfileEdits && activeTab === 'details' && (
        <div className="md:hidden fixed bottom-16 inset-x-3 z-30 p-3 rounded-2xl bg-popover/98 border border-border shadow-xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in-0 slide-in-from-bottom-3">
          <div className="text-xs">
            <span className="font-bold text-foreground block">Unsaved profile edits</span>
            <span className="text-[10px] text-muted-foreground">Tap save to apply your changes</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetProfile}
              className="text-xs h-8 cursor-pointer"
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={(e) => void handleUpdateProfile(e)}
              disabled={savingProfile}
              className="bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest text-xs h-8 font-semibold cursor-pointer gap-1.5 shadow-xs"
            >
              {savingProfile ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              <span>Save</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
