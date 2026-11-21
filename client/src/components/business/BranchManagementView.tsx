import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createBranchSchema, type CreateBranchInput } from '@/schemas/business.schema'
import { branchesApi, type BranchEntity } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import { Building, CheckCircle2, Loader2, MapPin, Phone, Plus, Star } from 'lucide-react'
import { toast } from 'sonner'

export function BranchManagementView() {
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMainBranch, setIsMainBranch] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateBranchInput>({
    resolver: zodResolver(createBranchSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      phone: '',
      isMain: false,
    },
    mode: 'onTouched',
  })

  const loadBranches = async () => {
    try {
      const data = await branchesApi.getBranches()
      setBranches(data)
    } catch (err) {
      console.error('Failed to load branches:', err)
      toast.error('Failed to load bakery branches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    branchesApi
      .getBranches()
      .then((data) => {
        if (!ignore) setBranches(data)
      })
      .catch((err) => {
        console.error('Failed to load branches:', err)
        toast.error('Failed to load bakery branches')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  const onSubmit = async (data: CreateBranchInput) => {
    try {
      const created = await branchesApi.createBranch({
        ...data,
        address: data.address?.trim() ? data.address.trim() : undefined,
        phone: data.phone?.trim() ? data.phone.trim() : undefined,
      })
      toast.success('Branch created successfully', {
        description: `Added "${created.name}" (${created.code}) to your bakery locations.`,
      })
      setIsDialogOpen(false)
      reset()
      setIsMainBranch(false)
      await loadBranches()
    } catch (err: unknown) {
      console.error('Failed to create branch:', err)
      toast.error('Failed to create branch. Verify code is unique.')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Bakery Branches & Baking Stations
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage production sites, retail counters, and distribution depots.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="gap-2 text-xs" />}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Baking Station / Branch</span>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-medium">Add New Branch</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register a new baking facility or retail distribution branch.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2" noValidate>
              {/* Field Group 1: Station Identity */}
              <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Station Identity
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="branch-name" className="text-xs font-medium text-foreground">
                      Branch Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="branch-name"
                      {...register('name')}
                      placeholder="e.g. Bole Medhanialem Bakery"
                      aria-invalid={errors.name ? 'true' : 'false'}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="branch-code" className="text-xs font-medium text-foreground">
                      Branch Identifier Code <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="branch-code"
                      {...register('code')}
                      placeholder="e.g. BOLE-01"
                      aria-invalid={errors.code ? 'true' : 'false'}
                    />
                    {errors.code ? (
                      <p className="text-xs text-destructive">{errors.code.message}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Short prefix used for lot tracking, orders, and inventory tags.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Field Group 2: Contact & Location */}
              <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact & Location
                </span>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="branch-phone" className="text-xs font-medium text-foreground">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute top-2.5 left-3 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="branch-phone"
                        className="pl-8"
                        {...register('phone')}
                        placeholder="+251 91 123 4567"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="branch-address" className="text-xs font-medium text-foreground">
                      Physical Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute top-2.5 left-3 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="branch-address"
                        className="pl-8"
                        {...register('address')}
                        placeholder="Near Medhanialem Mall, Addis Ababa"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Group 3: Operating Role */}
              <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 p-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-foreground">
                    Designate as Primary / Main Branch
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Default location for inventory receipts and business reports.
                  </p>
                </div>
                <Switch
                  checked={isMainBranch}
                  onCheckedChange={(checked) => {
                    setIsMainBranch(checked)
                    setValue('isMain', checked)
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
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
                      <span>Creating branch…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Create Location</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Metric Cards Grouped Together */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Total Baking Stations</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {branches.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Production, ovens, and dispatch counters
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Primary Bakery Hub</CardDescription>
            <CardTitle className="text-sm font-semibold truncate tracking-tight text-foreground">
              {branches.find((b) => b.isMain)?.name ?? 'None designated'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            {branches.some((b) => b.isMain)
              ? `Code: ${branches.find((b) => b.isMain)?.code}`
              : 'Add a main facility for centralized reporting'}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Operational Status</CardDescription>
            <CardTitle className="text-sm font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>All Stations Active</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Multi-branch tenant routing enabled
          </CardContent>
        </Card>
      </div>

      {/* Branches Table Card */}
      <Card className="border-border/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-medium">Locations Directory</CardTitle>
            <CardDescription className="text-xs">
              All active production and dispatch branches within this business.
            </CardDescription>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {branches.length} branch(es) registered
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading bakery locations…
            </div>
          ) : branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">No branches created yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Click &ldquo;Add Baking Station / Branch&rdquo; above to register your first bakery location.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80">
                  <TableHead className="text-xs font-semibold">Location Name</TableHead>
                  <TableHead className="text-xs font-semibold">Code</TableHead>
                  <TableHead className="text-xs font-semibold">Address</TableHead>
                  <TableHead className="text-xs font-semibold">Contact</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id} className="border-b border-border/60">
                    <TableCell className="font-medium text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{branch.name}</span>
                        {branch.isMain && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            Main Station
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-foreground">
                      {branch.code}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {branch.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{branch.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">&mdash;</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {branch.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{branch.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">&mdash;</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {branch.isMain ? 'Headquarters / Production' : 'Branch Bakery'}
                    </TableCell>

                    <TableCell className="text-right">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
