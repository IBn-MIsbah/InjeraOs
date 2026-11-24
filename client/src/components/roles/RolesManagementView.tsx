import { useEffect, useState, useMemo } from 'react'
import {
  rolesApi,
  businessApi,
  type RoleEntity,
  type PermissionEntity,
  type TeamMemberEntity,
} from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

function deduplicateRoles(rawRoles: RoleEntity[]): RoleEntity[] {
  const map = new Map<string, RoleEntity>()
  for (const r of rawRoles) {
    const existing = map.get(r.name)
    if (!existing) {
      map.set(r.name, r)
    } else if (r.businessId && !existing.businessId) {
      map.set(r.name, r)
    }
  }
  return Array.from(map.values())
}

export function RolesManagementView() {
  const [roles, setRoles] = useState<RoleEntity[]>([])
  const [permissions, setPermissions] = useState<PermissionEntity[]>([])
  const [members, setMembers] = useState<TeamMemberEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<RoleEntity | null>(null)

  // Dialog / Edit states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [selectedPermCodes, setSelectedPermCodes] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Member assignment state
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null)
  const [assigningRoleId, setAssigningRoleId] = useState<string>('')

  const handleSelectRole = (role: RoleEntity) => {
    setSelectedRole(role)
    setSelectedPermCodes(role.permissions?.map((p) => p.code) ?? [])
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [rolesData, permsData, membersData] = await Promise.all([
        rolesApi.getRoles().then(deduplicateRoles),
        rolesApi.getPermissions(),
        businessApi.getMembers().catch(() => []),
      ])
      setRoles(rolesData)
      setPermissions(permsData)
      setMembers(membersData)
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0])
        setSelectedPermCodes(rolesData[0].permissions?.map((p) => p.code) ?? [])
      }
    } catch (err) {
      console.error('Failed to load roles/permissions:', err)
      toast.error('Failed to load permissions and roles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    void Promise.all([
      rolesApi.getRoles().then(deduplicateRoles),
      rolesApi.getPermissions(),
      businessApi.getMembers().catch(() => []),
    ]).then(([rolesData, permsData, membersData]) => {
      if (ignore) return
      setRoles(rolesData)
      setPermissions(permsData)
      setMembers(membersData)
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0])
        setSelectedPermCodes(rolesData[0].permissions?.map((p) => p.code) ?? [])
      }
      setLoading(false)
    }).catch((err) => {
      if (!ignore) {
        console.error('Failed to load roles/permissions:', err)
        setLoading(false)
      }
    })

    return () => {
      ignore = true
    }
  }, [])

  // Group permissions by prefix/module
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionEntity[]> = {}
    for (const perm of permissions) {
      const parts = perm.code.split('.')
      const groupName = parts[0]?.toUpperCase() ?? 'GENERAL'
      if (!groups[groupName]) groups[groupName] = []
      groups[groupName].push(perm)
    }
    return groups
  }, [permissions])

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles
    const q = searchQuery.toLowerCase()
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    )
  }, [roles, searchQuery])

  const handleOpenCreate = () => {
    setNewRoleName('')
    setNewRoleDesc('')
    setSelectedPermCodes([])
    setIsCreateOpen(true)
  }

  const handleTogglePermCode = (code: string) => {
    setSelectedPermCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) {
      toast.error('Role name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await rolesApi.createCustomRole({
        name: newRoleName.trim().toUpperCase(),
        description: newRoleDesc.trim() || undefined,
        permissionCodes: selectedPermCodes,
      })
      toast.success('Custom role created', {
        description: `Role ${created.name} initialized with ${selectedPermCodes.length} permissions.`,
      })
      setIsCreateOpen(false)
      await loadData()
      setSelectedRole(created)
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message ?? 'Failed to create role'
      toast.error('Creation failed', { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRole = async (role: RoleEntity) => {
    if (role.isSystem) {
      toast.error('System roles are immutable and cannot be deleted')
      return
    }
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return

    try {
      await rolesApi.deleteRole(role.id)
      toast.success('Role deleted', { description: `Role ${role.name} has been removed.` })
      if (selectedRole?.id === role.id) setSelectedRole(null)
      await loadData()
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message ?? 'Failed to delete role'
      toast.error('Delete failed', { description: msg })
    }
  }

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return
    if (selectedRole.isSystem) {
      toast.error('System roles permissions cannot be altered directly')
      return
    }

    setIsSubmitting(true)
    try {
      await rolesApi.setRolePermissions(selectedRole.id, selectedPermCodes)
      toast.success('Permissions updated', {
        description: `Updated permissions for ${selectedRole.name}.`,
      })
      await loadData()
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message ?? 'Failed to update permissions'
      toast.error('Save failed', { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAssignMemberRole = async (member: TeamMemberEntity, newRoleId: string) => {
    try {
      await rolesApi.assignMemberRole(member.id, newRoleId)
      toast.success('Role assigned', {
        description: `Assigned new role to ${member.name || member.email}.`,
      })
      setAssigningMemberId(null)
      await loadData()
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message ?? 'Failed to assign role'
      toast.error('Assignment failed', { description: msg })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-oat">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-forest dark:text-oat">
                Roles & Permissions Governance
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Define granular access controls, configure custom roles, and assign security boundaries for KD PLC bakery personnel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="bg-forest text-oat hover:bg-forest-light gap-1.5 text-xs h-8 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Custom Role</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Layout (12-Grid System) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Roles List */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-forest dark:text-oat" />
                  Defined Roles
                </CardTitle>
                <span className="text-[11px] font-mono font-medium text-muted-foreground">
                  {roles.length} total
                </span>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter roles…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No roles matching "{searchQuery}"
                </div>
              ) : (
                filteredRoles.map((role) => {
                  const isSelected = selectedRole?.id === role.id
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleSelectRole(role)}
                      className={`flex flex-col gap-1 p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-forest bg-forest/5 dark:border-oat/40 dark:bg-oat/10'
                          : 'border-border/70 hover:border-forest/30 bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            {role.name}
                          </span>
                          {role.isSystem ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-forest/10 px-1.5 py-0.5 text-[9px] font-bold text-forest dark:bg-oat/15 dark:text-oat">
                              <Lock className="h-2.5 w-2.5" />
                              SYSTEM
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                              CUSTOM
                            </span>
                          )}
                        </div>

                        {!role.isSystem && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleDeleteRole(role)
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            title="Delete custom role"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {role.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {role.description}
                        </p>
                      )}

                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{role.permissions?.length ?? 0} permissions</span>
                        <span>{role.isSystem ? 'System defined' : 'Custom defined'}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Role Details & Permission Editor */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {selectedRole ? (
            <Card className="border-border">
              <CardHeader className="pb-4 border-b border-border/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-foreground">
                        {selectedRole.name}
                      </CardTitle>
                      {selectedRole.isSystem ? (
                        <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-bold text-forest dark:bg-oat/15 dark:text-oat">
                          Immutable System Role
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                          Custom Configurable
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-1">
                      {selectedRole.description || 'No description configured for this role.'}
                    </CardDescription>
                  </div>

                  {!selectedRole.isSystem && (
                    <Button
                      onClick={handleSaveRolePermissions}
                      disabled={isSubmitting}
                      size="sm"
                      className="bg-forest text-oat hover:bg-forest-light text-xs h-8 gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{isSubmitting ? 'Saving…' : 'Save Permissions'}</span>
                    </Button>
                  )}
                </div>

                {selectedRole.isSystem && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-md p-2">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>
                      System roles have fixed security definitions to ensure platform invariants. To customize permissions, create a custom role.
                    </span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-4 space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Assigned Permission Matrix ({selectedPermCodes.length} active)
                  </h3>

                  <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2">
                    {Object.entries(groupedPermissions).map(([groupName, groupPerms]) => (
                      <div key={groupName} className="rounded-lg border border-border/70 p-3 bg-muted/20">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2">
                          <span className="text-xs font-bold text-forest dark:text-oat tracking-wide">
                            {groupName} MODULE
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {groupPerms.filter((p) => selectedPermCodes.includes(p.code)).length} / {groupPerms.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupPerms.map((perm) => {
                            const isChecked = selectedPermCodes.includes(perm.code)
                            const isReadOnly = selectedRole.isSystem

                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2.5 p-2 rounded-md text-xs transition-colors ${
                                  isChecked
                                    ? 'bg-forest/10 border border-forest/30 dark:bg-oat/10'
                                    : 'bg-card border border-border/50 hover:border-forest/20'
                                } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isReadOnly}
                                  onChange={() => handleTogglePermCode(perm.code)}
                                  className="mt-0.5 rounded border-forest text-forest focus:ring-forest cursor-pointer disabled:cursor-default"
                                />
                                <div className="flex flex-col">
                                  <span className="font-mono text-[11px] font-medium text-foreground">
                                    {perm.code}
                                  </span>
                                  {perm.description && (
                                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                                      {perm.description}
                                    </span>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Select a role to inspect or modify permissions.
            </div>
          )}
        </div>
      </div>

      {/* Member Role Assignment Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-forest dark:text-oat" />
                Team Member Role Assignments
              </CardTitle>
              <CardDescription className="text-xs">
                Active staff accounts within KD PLC and their assigned operational authority.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {members.length} member(s)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : members.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No team members registered yet. Invite team members in Team & Staff.
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground">
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Current Role</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-medium text-foreground">
                        {member.name || 'Unnamed Member'}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-muted-foreground">
                        {member.email || 'N/A'}
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold text-forest dark:bg-oat/15 dark:text-oat">
                          <UserCheck className="h-3 w-3" />
                          {member.roleName || 'MEMBER'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        {assigningMemberId === member.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <select
                              value={assigningRoleId}
                              onChange={(e) => setAssigningRoleId(e.target.value)}
                              className="rounded border border-border bg-background px-2 py-1 text-xs"
                            >
                              <option value="">Select Role…</option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (assigningRoleId) {
                                  void handleAssignMemberRole(member, assigningRoleId)
                                }
                              }}
                              className="h-7 text-[11px] bg-forest text-oat px-2"
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAssigningMemberId(null)}
                              className="h-7 text-[11px] px-1.5"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAssigningMemberId(member.id)
                              setAssigningRoleId(member.roleId || '')
                            }}
                            className="h-7 text-[11px] border-border"
                          >
                            Change Role
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Create Custom Role */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border-border shadow-xl">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Plus className="h-4 w-4 text-forest dark:text-oat" />
                Create Custom Role
              </CardTitle>
              <CardDescription className="text-xs">
                Design a custom access role tailored to specific bakery operations.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateRole}>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Role Identifier / Name *
                  </label>
                  <Input
                    placeholder="e.g. HEAD_BAKER, DISPATCH_COORDINATOR"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    className="font-mono text-xs uppercase"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Uppercase identifier used across permission checks.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Description
                  </label>
                  <Input
                    placeholder="Brief summary of duties and responsibilities"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Initial Permissions ({selectedPermCodes.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPermCodes(
                          selectedPermCodes.length === permissions.length
                            ? []
                            : permissions.map((p) => p.code)
                        )
                      }
                      className="text-[11px] text-forest underline cursor-pointer"
                    >
                      {selectedPermCodes.length === permissions.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-muted/20">
                    {permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 text-xs p-1 rounded hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermCodes.includes(perm.code)}
                          onChange={() => handleTogglePermCode(perm.code)}
                          className="rounded text-forest"
                        />
                        <span className="font-mono text-[11px]">{perm.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="sm"
                  className="bg-forest text-oat hover:bg-forest-light text-xs"
                >
                  {isSubmitting ? 'Creating…' : 'Create Role'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
