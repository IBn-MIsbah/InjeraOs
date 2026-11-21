import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  branchesApi,
  businessApi,
  rolesApi,
  type BranchEntity,
  type RoleEntity,
  type TeamMemberEntity,
} from '@/lib/api'
import { ROLE_OPTIONS } from '@/types/enums'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CheckCircle2, Loader2, Shield, UserCheck, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

const inviteFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  roleId: z.string().uuid('Please select an authorized role'),
})

type InviteFormInput = z.infer<typeof inviteFormSchema>

export function TeamMembersView() {
  const [members, setMembers] = useState<TeamMemberEntity[]>([])
  const [roles, setRoles] = useState<RoleEntity[]>([])
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [changingMemberId, setChangingMemberId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormInput>({
    resolver: zodResolver(inviteFormSchema),
    mode: 'onTouched',
  })

  const loadData = async () => {
    try {
      const [membersData, rolesData, branchesData] = await Promise.all([
        businessApi.getMembers(),
        rolesApi.getRoles(),
        branchesApi.getBranches(),
      ])
      setMembers(membersData)
      setRoles(rolesData)
      setBranches(branchesData)
      if (rolesData.length > 0) {
        // Default to BAKER or second role
        const defaultRole = rolesData.find((r) => r.name === 'BAKER') ?? rolesData[0]
        setValue('roleId', defaultRole.id)
      }
    } catch (err) {
      console.error('Failed to load team data:', err)
      toast.error('Failed to load team roster')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false

    businessApi
      .getMembers()
      .then((membersData) => {
        if (!ignore) setMembers(membersData)
      })
      .catch((err) => {
        console.error('Failed to load members:', err)
      })

    rolesApi
      .getRoles()
      .then((rolesData) => {
        if (!ignore) {
          setRoles(rolesData)
          if (rolesData.length > 0) {
            const defaultRole = rolesData.find((r) => r.name === 'BAKER') ?? rolesData[0]
            setValue('roleId', defaultRole.id)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load roles:', err)
      })

    branchesApi
      .getBranches()
      .then((branchesData) => {
        if (!ignore) setBranches(branchesData)
      })
      .catch((err) => {
        console.error('Failed to load branches:', err)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [setValue])

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    )
  }

  const onInviteSubmit = async (data: InviteFormInput) => {
    try {
      const created = await businessApi.inviteMember({
        ...data,
        branchIds: selectedBranches,
      })
      toast.success('Team member invited', {
        description: `Invited ${created.name} (${created.roleName}) to your bakery workspace.`,
      })
      setIsInviteOpen(false)
      reset()
      setSelectedBranches([])
      await loadData()
    } catch (err: unknown) {
      console.error('Failed to invite member:', err)
      toast.error('Failed to invite member. Verify email is not already a member.')
    }
  }

  const handleRoleChange = async (membershipId: string, newRoleId: string) => {
    setChangingMemberId(membershipId)
    try {
      await rolesApi.assignMemberRole(membershipId, newRoleId)
      toast.success('Role updated', {
        description: 'Team member capabilities updated successfully.',
      })
      await loadData()
    } catch (err) {
      console.error('Failed to update role:', err)
      toast.error('Failed to update role. Ensure you have OWNER permissions.')
    } finally {
      setChangingMemberId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Bakery Staff & Team Members
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage authorized staff memberships, assign operational roles, and scope branch access.
          </p>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger render={<Button className="gap-2 text-xs" />}>
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite Team Member</span>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-medium">Invite Staff Member</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Authorize a new baker, cashier, supervisor, or accountant for this business.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4 pt-2" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="member-name" className="text-xs font-medium text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="member-name"
                  {...register('name')}
                  placeholder="e.g. Mulugeta Tesfaye"
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="member-email" className="text-xs font-medium text-foreground">
                  Work Email <span className="text-destructive">*</span>
                </label>
                <Input
                  id="member-email"
                  type="email"
                  {...register('email')}
                  placeholder="mulugeta@bakery.et"
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="member-role" className="text-xs font-medium text-foreground">
                  Assigned Bakery Role <span className="text-destructive">*</span>
                </label>
                <select
                  id="member-role"
                  {...register('roleId')}
                  className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground transition-colors focus:border-foreground focus:ring-1 focus:ring-foreground focus:outline-hidden"
                >
                  {roles.map((r) => {
                    const opt = ROLE_OPTIONS.find((o) => o.value === r.name)
                    return (
                      <option key={r.id} value={r.id}>
                        {opt?.label ?? r.name} ({r.permissions.length} capabilities)
                      </option>
                    )
                  })}
                </select>
                {errors.roleId && (
                  <p className="text-xs text-destructive">{errors.roleId.message}</p>
                )}
              </div>

              {branches.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border/80 bg-muted/30 p-3">
                  <span className="text-xs font-medium text-foreground">
                    Branch Station Scoping (Optional)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Leave unchecked for all-branch access, or restrict to specific baking stations.
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {branches.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(b.id)}
                          onChange={() => handleBranchToggle(b.id)}
                          className="rounded border-input text-foreground focus:ring-foreground"
                        />
                        <span>{b.name} ({b.code})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-1.5 text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending invitation…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Confirm Invitation</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members Table */}
      <Card className="border-border/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-medium">Team Roster</CardTitle>
            <CardDescription className="text-xs">
              Active staff members authorized for this bakery workspace.
            </CardDescription>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {members.length} member(s)
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading staff roster…
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">No staff members found</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Click &ldquo;Invite Team Member&rdquo; to add your staff to InjeraOS.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80">
                  <TableHead className="text-xs font-semibold">Staff Member</TableHead>
                  <TableHead className="text-xs font-semibold">Role & Permissions</TableHead>
                  <TableHead className="text-xs font-semibold">Branch Access</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Modify Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const opt = ROLE_OPTIONS.find((o) => o.value === member.roleName)
                  const isOwner = member.roleName === 'OWNER'

                  return (
                    <TableRow key={member.id} className="border-b border-border/60">
                      <TableCell className="font-medium text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-semibold text-xs text-foreground">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-[11px] text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {opt?.label ?? member.roleName}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {member.roleDescription ?? 'Standard business role'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {member.branchIds.length === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground">
                            All branches
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                            {member.branchIds.length} branch(es)
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <UserCheck className="h-3 w-3" />
                          {member.status}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        {isOwner ? (
                          <span className="text-[11px] text-muted-foreground italic">
                            Workspace Owner
                          </span>
                        ) : (
                          <select
                            value={member.roleId}
                            disabled={changingMemberId === member.id}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="rounded-md border border-input bg-background py-1 px-2 text-xs text-foreground transition-colors hover:border-foreground focus:ring-1 focus:ring-foreground focus:outline-hidden"
                          >
                            {roles
                              .filter((r) => r.name !== 'OWNER')
                              .map((r) => {
                                const roleOpt = ROLE_OPTIONS.find((o) => o.value === r.name)
                                return (
                                  <option key={r.id} value={r.id}>
                                    {roleOpt?.label ?? r.name}
                                  </option>
                                )
                              })}
                          </select>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
