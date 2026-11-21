import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import {
  workforceApi,
  branchesApi,
  type EmployeeEntity,
  type BranchEntity,
  type ShiftEntity,
  type ShiftAssignmentEntity,
  type AttendanceRecordEntity,
  type DepartmentEntity,
  type JobPositionEntity,
  type HeadcountReport,
} from '@/lib/api'
import {
  createEmployeeSchema,
  createShiftSchema,
  createShiftAssignmentSchema,
  clockInSchema,
  clockOutSchema,
  employmentTypeOptions,
  shiftTypeOptions,
  type CreateEmployeeInput,
  type CreateShiftInput,
  type CreateShiftAssignmentInput,
  type ClockInInput,
  type ClockOutInput,
} from '@/schemas/workforce.schema'
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
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Sun,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

const extractErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return String(err.response.data.message)
  }
  if (err instanceof Error) {
    return err.message
  }
  return fallback
}

export function WorkforceManagementView() {
  const [subTab, setSubTab] = useState<'employees' | 'shifts' | 'attendance'>('employees')
  const [loading, setLoading] = useState(true)

  // Data states
  const [employees, setEmployees] = useState<EmployeeEntity[]>([])
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [departments, setDepartments] = useState<DepartmentEntity[]>([])
  const [positions, setPositions] = useState<JobPositionEntity[]>([])
  const [shifts, setShifts] = useState<ShiftEntity[]>([])
  const [assignments, setAssignments] = useState<ShiftAssignmentEntity[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecordEntity[]>([])
  const [headcount, setHeadcount] = useState<HeadcountReport | null>(null)

  // Dialog open states
  const [isEmpOpen, setIsEmpOpen] = useState(false)
  const [isShiftOpen, setIsShiftOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isClockInOpen, setIsClockInOpen] = useState(false)
  const [activeAttendanceToClockOut, setActiveAttendanceToClockOut] = useState<AttendanceRecordEntity | null>(null)

  // Employee Form
  const empForm = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      employeeNumber: '',
      branchId: '',
      positionId: '',
      employmentType: 'FULL_TIME',
      hireDate: new Date().toISOString().split('T')[0],
      phone: '',
      address: '',
    },
    mode: 'onTouched',
  })

  // Shift Form
  const [crossesMidnightShift, setCrossesMidnightShift] = useState(false)
  const shiftForm = useForm<CreateShiftInput>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      branchId: '',
      name: '',
      shiftType: 'DAY',
      startTime: '06:00',
      endTime: '14:00',
      crossesMidnight: false,
      breakMinutes: 30,
    },
    mode: 'onTouched',
  })

  // Shift Assignment Form
  const assignForm = useForm<CreateShiftAssignmentInput>({
    resolver: zodResolver(createShiftAssignmentSchema),
    defaultValues: {
      branchId: '',
      employeeId: '',
      shiftId: '',
      scheduledStart: '',
      scheduledEnd: '',
    },
    mode: 'onTouched',
  })

  // Clock In Form
  const clockInForm = useForm<ClockInInput>({
    resolver: zodResolver(clockInSchema),
    defaultValues: {
      branchId: '',
      employeeId: '',
      shiftAssignmentId: '',
      operationalDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
    mode: 'onTouched',
  })

  // Clock Out Form
  const clockOutForm = useForm<ClockOutInput>({
    resolver: zodResolver(clockOutSchema),
    defaultValues: {
      attendanceId: '',
      breakMinutes: 30,
      notes: '',
    },
    mode: 'onTouched',
  })

  const loadAllData = useCallback(async () => {
    try {
      const [
        empsData,
        branchesData,
        deptsData,
        positionsData,
        shiftsData,
        assignmentsData,
        attendanceData,
        headcountData,
      ] = await Promise.all([
        workforceApi.getEmployees(),
        branchesApi.getBranches(),
        workforceApi.getDepartments(),
        workforceApi.getPositions(),
        workforceApi.getShifts(),
        workforceApi.getShiftAssignments(),
        workforceApi.getAttendance(),
        workforceApi.getHeadcountReport(),
      ])

      setEmployees(empsData)
      setBranches(branchesData)
      setDepartments(deptsData)
      setPositions(positionsData)
      setShifts(shiftsData)
      setAssignments(assignmentsData)
      setAttendance(attendanceData)
      setHeadcount(headcountData)

      // Set default IDs for forms if available
      if (branchesData.length > 0) {
        empForm.setValue('branchId', branchesData[0].id)
        shiftForm.setValue('branchId', branchesData[0].id)
        assignForm.setValue('branchId', branchesData[0].id)
        clockInForm.setValue('branchId', branchesData[0].id)
      }
      if (positionsData.length > 0) {
        empForm.setValue('positionId', positionsData[0].id)
      }
      if (empsData.length > 0) {
        assignForm.setValue('employeeId', empsData[0].id)
        clockInForm.setValue('employeeId', empsData[0].id)
      }
      if (shiftsData.length > 0) {
        assignForm.setValue('shiftId', shiftsData[0].id)
      }
    } catch (err: unknown) {
      console.error('Failed to load workforce data:', err)
      toast.error('Failed to load workforce records')
    } finally {
      setLoading(false)
    }
  }, [empForm, shiftForm, assignForm, clockInForm])

  useEffect(() => {
    let ignore = false
    void Promise.all([
      workforceApi.getEmployees(),
      branchesApi.getBranches(),
      workforceApi.getDepartments(),
      workforceApi.getPositions(),
      workforceApi.getShifts(),
      workforceApi.getShiftAssignments(),
      workforceApi.getAttendance(),
      workforceApi.getHeadcountReport(),
    ])
      .then(
        ([
          empsData,
          branchesData,
          deptsData,
          positionsData,
          shiftsData,
          assignmentsData,
          attendanceData,
          headcountData,
        ]) => {
          if (ignore) return
          setEmployees(empsData)
          setBranches(branchesData)
          setDepartments(deptsData)
          setPositions(positionsData)
          setShifts(shiftsData)
          setAssignments(assignmentsData)
          setAttendance(attendanceData)
          setHeadcount(headcountData)

          if (branchesData.length > 0) {
            empForm.setValue('branchId', branchesData[0].id)
            shiftForm.setValue('branchId', branchesData[0].id)
            assignForm.setValue('branchId', branchesData[0].id)
            clockInForm.setValue('branchId', branchesData[0].id)
          }
          if (positionsData.length > 0) {
            empForm.setValue('positionId', positionsData[0].id)
          }
          if (empsData.length > 0) {
            assignForm.setValue('employeeId', empsData[0].id)
            clockInForm.setValue('employeeId', empsData[0].id)
          }
          if (shiftsData.length > 0) {
            assignForm.setValue('shiftId', shiftsData[0].id)
          }
        }
      )
      .catch((err: unknown) => {
        if (!ignore) {
          console.error('Failed to load workforce data:', err)
          toast.error('Failed to load workforce records')
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [empForm, shiftForm, assignForm, clockInForm])

  // Submissions
  const onEmployeeSubmit = async (data: CreateEmployeeInput) => {
    try {
      const created = await workforceApi.createEmployee({
        ...data,
        phone: data.phone?.trim() ? data.phone.trim() : undefined,
        address: data.address?.trim() ? data.address.trim() : undefined,
      })
      toast.success('Employee registered', {
        description: `Added ${created.firstName} ${created.lastName} (${created.employeeNumber}).`,
      })
      setIsEmpOpen(false)
      empForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to register employee:', err)
      toast.error(extractErrorMessage(err, 'Failed to register employee'))
    }
  }

  const onShiftSubmit = async (data: CreateShiftInput) => {
    try {
      const created = await workforceApi.createShift({
        ...data,
        crossesMidnight: crossesMidnightShift,
      })
      toast.success('Shift definition created', {
        description: `Added "${created.name}" (${created.shiftType}).`,
      })
      setIsShiftOpen(false)
      shiftForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to create shift:', err)
      toast.error(extractErrorMessage(err, 'Failed to create shift'))
    }
  }

  const onAssignSubmit = async (data: CreateShiftAssignmentInput) => {
    try {
      await workforceApi.createShiftAssignment(data)
      toast.success('Shift scheduled successfully', {
        description: 'Employee shift assignment recorded.',
      })
      setIsAssignOpen(false)
      assignForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to schedule shift assignment:', err)
      toast.error(extractErrorMessage(err, 'Failed to schedule shift assignment'))
    }
  }

  const onClockInSubmit = async (data: ClockInInput) => {
    try {
      await workforceApi.clockIn({
        ...data,
        shiftAssignmentId: data.shiftAssignmentId || undefined,
      })
      toast.success('Clock-in recorded', {
        description: `Operational date: ${data.operationalDate}`,
      })
      setIsClockInOpen(false)
      clockInForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to record clock-in:', err)
      toast.error(extractErrorMessage(err, 'Clock-in failed'))
    }
  }

  const onClockOutSubmit = async (data: ClockOutInput) => {
    try {
      const result = await workforceApi.clockOut(data)
      toast.success('Clock-out recorded', {
        description: `Total working time: ${result.totalWorkingMinutes ?? 0} mins (Overtime: ${result.overtimeMinutes} mins).`,
      })
      setActiveAttendanceToClockOut(null)
      clockOutForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to record clock-out:', err)
      toast.error(extractErrorMessage(err, 'Clock-out failed'))
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Workforce & Shift Operations
          </h2>
          <p className="text-xs text-muted-foreground">
            Employee directory, day/night shift scheduling, and attendance timesheets.
          </p>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setSubTab('employees')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              subTab === 'employees'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Directory
          </button>
          <button
            type="button"
            onClick={() => setSubTab('shifts')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              subTab === 'shifts'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Shifts & Schedule
          </button>
          <button
            type="button"
            onClick={() => setSubTab('attendance')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              subTab === 'attendance'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Attendance Timesheet
          </button>
        </div>
      </div>

      {/* Grouped Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Active Headcount</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
              {headcount?.activeHeadcount ?? employees.filter((e) => e.status === 'ACTIVE').length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Active baking & administrative staff across {departments.length} departments
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Configured Shifts</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {shifts.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Day, night, & custom baking shifts
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Scheduled Today</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {assignments.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Active confirmed shift assignments
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Clock-Ins Today</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {attendance.filter((a) => a.clockIn).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Recorded daily attendance records
          </CardContent>
        </Card>
      </div>

      {/* SubTab 1: Employees Directory */}
      {subTab === 'employees' && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-medium">Employee Roster</CardTitle>
              <CardDescription className="text-xs">
                Permanent and contract bakers, supervisors, cleaners, and cashiers.
              </CardDescription>
            </div>

            <Dialog open={isEmpOpen} onOpenChange={setIsEmpOpen}>
              <DialogTrigger render={<Button className="gap-2 text-xs" />}>
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register Employee</span>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-base font-medium">Register New Employee</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Enroll a worker into this bakery business with position and station assignment.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={empForm.handleSubmit(onEmployeeSubmit)} className="space-y-4 pt-2" noValidate>
                  {/* Field Group 1: Personal Details */}
                  <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Personal Identity
                    </span>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          First Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          {...empForm.register('firstName')}
                          placeholder="e.g. Almaz"
                        />
                        {empForm.formState.errors.firstName && (
                          <p className="text-xs text-destructive">{empForm.formState.errors.firstName.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Last Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          {...empForm.register('lastName')}
                          placeholder="e.g. Tadesse"
                        />
                        {empForm.formState.errors.lastName && (
                          <p className="text-xs text-destructive">{empForm.formState.errors.lastName.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-medium text-foreground">
                          Employee Number / ID <span className="text-destructive">*</span>
                        </label>
                        <Input
                          {...empForm.register('employeeNumber')}
                          placeholder="e.g. EMP-001"
                        />
                        {empForm.formState.errors.employeeNumber ? (
                          <p className="text-xs text-destructive">{empForm.formState.errors.employeeNumber.message}</p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            Unique badge code used for timecards and shift logs.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Field Group 2: Position & Station */}
                  <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Position & Location
                    </span>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Job Position <span className="text-destructive">*</span>
                        </label>
                        <select
                          {...empForm.register('positionId')}
                          className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                        >
                          {positions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.departmentName ? `(${p.departmentName})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Assigned Station / Branch <span className="text-destructive">*</span>
                        </label>
                        <select
                          {...empForm.register('branchId')}
                          className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Employment Type
                        </label>
                        <select
                          {...empForm.register('employmentType')}
                          className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                        >
                          {employmentTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Hire / Start Date <span className="text-destructive">*</span>
                        </label>
                        <Input
                          type="date"
                          {...empForm.register('hireDate')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field Group 3: Contact Info */}
                  <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Contact Details (Optional)
                    </span>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Phone Number</label>
                        <Input
                          {...empForm.register('phone')}
                          placeholder="+251 91 123 4567"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Physical Address</label>
                        <Input
                          {...empForm.register('address')}
                          placeholder="Sub-city / Kebele"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEmpOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={empForm.formState.isSubmitting}
                      className="gap-1.5 text-xs"
                    >
                      {empForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Registering…</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Confirm Registration</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading workforce roster…
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium text-foreground">No employees registered yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Click &ldquo;Register Employee&rdquo; to enroll your bakers, shift supervisors, and staff.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee ID</TableHead>
                    <TableHead className="text-xs">Full Name</TableHead>
                    <TableHead className="text-xs">Job Position</TableHead>
                    <TableHead className="text-xs">Station Branch</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Hire Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs font-medium text-foreground">
                        {e.employeeNumber}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {e.firstName} {e.lastName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.positionName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.branchName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.employmentType.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            e.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {e.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(e.hireDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* SubTab 2: Shifts & Scheduling */}
      {subTab === 'shifts' && (
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-medium">Shift Definitions</CardTitle>
                <CardDescription className="text-xs">
                  Day and overnight night shifts across baking stations.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Dialog open={isShiftOpen} onOpenChange={setIsShiftOpen}>
                  <DialogTrigger render={<Button variant="outline" className="gap-2 text-xs" />}>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Shift</span>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-base font-medium">Create Shift Definition</DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Configure working windows and break allowances for a station.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={shiftForm.handleSubmit(onShiftSubmit)} className="space-y-4 pt-2" noValidate>
                      <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground">
                            Shift Name <span className="text-destructive">*</span>
                          </label>
                          <Input
                            {...shiftForm.register('name')}
                            placeholder="e.g. Night Injera Baking Shift"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground">Shift Type</label>
                            <select
                              {...shiftForm.register('shiftType')}
                              className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                            >
                              {shiftTypeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground">Branch Station</label>
                            <select
                              {...shiftForm.register('branchId')}
                              className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                            >
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground">Start Time (HH:mm)</label>
                            <Input
                              type="time"
                              {...shiftForm.register('startTime')}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground">End Time (HH:mm)</label>
                            <Input
                              type="time"
                              {...shiftForm.register('endTime')}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-md border border-border/60 bg-background p-2.5">
                          <div className="space-y-0.5">
                            <span className="text-xs font-medium text-foreground">
                              Crosses Midnight (Overnight)
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                              Enables overnight calculation across date boundaries.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={crossesMidnightShift}
                            onChange={(e) => setCrossesMidnightShift(e.target.checked)}
                            className="rounded border-input text-foreground focus:ring-foreground"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsShiftOpen(false)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={shiftForm.formState.isSubmitting}
                          className="gap-1.5 text-xs"
                        >
                          Confirm Shift
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                  <DialogTrigger render={<Button className="gap-2 text-xs" />}>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Schedule Employee</span>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-base font-medium">Assign Shift to Employee</DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Schedule a confirmed working window. Overlapping shifts are prevented.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4 pt-2" noValidate>
                      <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground">Employee</label>
                          <select
                            {...assignForm.register('employeeId')}
                            className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                          >
                            {employees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.firstName} {e.lastName} ({e.employeeNumber})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground">Shift Template</label>
                            <select
                              {...assignForm.register('shiftId')}
                              className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                            >
                              {shifts.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.shiftType})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-foreground">Station</label>
                            <select
                              {...assignForm.register('branchId')}
                              className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                            >
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-medium text-foreground">Scheduled Start Time</label>
                            <Input
                              type="datetime-local"
                              {...assignForm.register('scheduledStart')}
                            />
                          </div>

                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-medium text-foreground">Scheduled End Time</label>
                            <Input
                              type="datetime-local"
                              {...assignForm.register('scheduledEnd')}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAssignOpen(false)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={assignForm.formState.isSubmitting}
                          className="gap-1.5 text-xs"
                        >
                          Confirm Assignment
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {shifts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No shift templates defined yet. Click &ldquo;Create Shift&rdquo; to set up your day or night baking shifts.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Shift Name</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Hours</TableHead>
                      <TableHead className="text-xs">Midnight Crossing</TableHead>
                      <TableHead className="text-xs">Break Allowance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs font-medium text-foreground">
                          {s.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                            {s.shiftType === 'NIGHT' ? (
                              <Moon className="h-3 w-3 text-indigo-400" />
                            ) : (
                              <Sun className="h-3 w-3 text-amber-500" />
                            )}
                            {s.shiftType}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &ndash;{' '}
                          {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.crossesMidnight ? (
                            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                              Overnight (1 Shift)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Same Day</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.breakMinutes} mins
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SubTab 3: Attendance & Timesheet */}
      {subTab === 'attendance' && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-medium">Attendance & Working Hours</CardTitle>
              <CardDescription className="text-xs">
                Clock-in and clock-out logs, duration calculations, and overtime tracking.
              </CardDescription>
            </div>

            <Dialog open={isClockInOpen} onOpenChange={setIsClockInOpen}>
              <DialogTrigger render={<Button className="gap-2 text-xs" />}>
                <Clock className="h-3.5 w-3.5" />
                <span>Clock In Worker</span>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-medium">Record Worker Clock-In</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Record operational date and clock-in timestamp.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={clockInForm.handleSubmit(onClockInSubmit)} className="space-y-4 pt-2" noValidate>
                  <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Employee</label>
                      <select
                        {...clockInForm.register('employeeId')}
                        className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                      >
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.firstName} {e.lastName} ({e.employeeNumber})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Station</label>
                        <select
                          {...clockInForm.register('branchId')}
                          className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Operational Date</label>
                        <Input
                          type="date"
                          {...clockInForm.register('operationalDate')}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Shift Assignment (Optional)</label>
                      <select
                        {...clockInForm.register('shiftAssignmentId')}
                        className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs text-foreground focus:border-foreground focus:outline-hidden"
                      >
                        <option value="">No assignment link</option>
                        {assignments.map((a) => (
                          <option key={a.id} value={a.id}>
                            Assignment #{a.id.slice(0, 8)} ({new Date(a.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsClockInOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={clockInForm.formState.isSubmitting}
                      className="gap-1.5 text-xs"
                    >
                      Confirm Clock-In
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="p-0">
            {attendance.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No attendance logs for this period. Click &ldquo;Clock In Worker&rdquo; to start tracking shift hours.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Worker</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Clock In</TableHead>
                    <TableHead className="text-xs">Clock Out</TableHead>
                    <TableHead className="text-xs">Break</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((rec) => {
                    const emp = employees.find((e) => e.id === rec.employeeId)
                    return (
                      <TableRow key={rec.id}>
                        <TableCell className="text-xs font-medium text-foreground">
                          {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {new Date(rec.operationalDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {rec.clockIn
                            ? new Date(rec.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {rec.clockOut
                            ? new Date(rec.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Active (On Shift)'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {rec.breakMinutes} mins
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              rec.status === 'PRESENT'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : rec.status === 'LATE'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {!rec.clockOut ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] gap-1"
                              onClick={() => {
                                setActiveAttendanceToClockOut(rec)
                                clockOutForm.setValue('attendanceId', rec.id)
                              }}
                            >
                              <LogOut className="h-3 w-3" />
                              <span>Clock Out</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Completed</span>
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
      )}

      {/* Clock Out Modal */}
      {activeAttendanceToClockOut && (
        <Dialog
          open={Boolean(activeAttendanceToClockOut)}
          onOpenChange={(open) => !open && setActiveAttendanceToClockOut(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-medium">Record Worker Clock-Out</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Finalize working hours and record any break minutes taken.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={clockOutForm.handleSubmit(onClockOutSubmit)} className="space-y-4 pt-2">
              <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Break Minutes</label>
                  <Input
                    type="number"
                    {...clockOutForm.register('breakMinutes', { valueAsNumber: true })}
                    placeholder="30"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Deducted from gross duration to calculate net productive hours.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Shift Handover Notes (Optional)</label>
                  <Input
                    {...clockOutForm.register('notes')}
                    placeholder="Baking station cleaned, stock handed to evening baker."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveAttendanceToClockOut(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={clockOutForm.formState.isSubmitting}
                  className="gap-1.5 text-xs"
                >
                  Confirm Clock-Out
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
