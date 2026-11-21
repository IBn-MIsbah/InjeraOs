import axios, { type InternalAxiosRequestConfig } from 'axios'
import type {
  ActiveSession,
  AuthContextResponse,
  UserProfile,
  RefreshTokenResponse,
  RoleEntity,
  PermissionEntity,
  BusinessEntity,
  BranchEntity,
  TeamMemberEntity,
  DepartmentEntity,
  JobPositionEntity,
  EmployeeEntity,
  ShiftEntity,
  ShiftAssignmentEntity,
  AttendanceRecordEntity,
  LeaveRecordEntity,
  HeadcountReport,
} from '@/types'
import type { LoginInput, RegisterInput } from '@/schemas'

// Re-export types for backward compatibility
export type {
  ActiveSession,
  AuthContextResponse,
  UserProfile,
  RefreshTokenResponse,
  RoleEntity,
  PermissionEntity,
  BusinessEntity,
  BranchEntity,
  TeamMemberEntity,
  DepartmentEntity,
  JobPositionEntity,
  EmployeeEntity,
  ShiftEntity,
  ShiftAssignmentEntity,
  AttendanceRecordEntity,
  LeaveRecordEntity,
  HeadcountReport,
}

// In-memory device identifier per browser tab session (no localStorage used)
const sessionDeviceId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `web-${Date.now()}`

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true, // Guarantees httpOnly, secure cookies are sent with all requests
  headers: {
    'Content-Type': 'application/json',
    'X-Device-Id': sessionDeviceId,
    'X-Device-Name':
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 150)
        : 'Web Client',
  },
})

// Auto-refresh token rotation interceptor
let refreshPromise: Promise<void> | undefined

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined

    if (
      !originalRequest ||
      originalRequest._retried ||
      error.response?.status !== 401 ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register')
    ) {
      throw error
    }

    originalRequest._retried = true

    refreshPromise ??= api
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = undefined
      })

    await refreshPromise
    return api(originalRequest)
  }
)

export const authApi = {
  async register(data: RegisterInput) {
    const res = await api.post<{
      data: AuthContextResponse & { business?: { id: string; name: string } }
    }>('/auth/register', data)
    return res.data.data
  },

  async login(credentials: LoginInput) {
    const res = await api.post<{ data: AuthContextResponse }>(
      '/auth/login',
      credentials
    )
    return res.data.data
  },

  async getMe() {
    const res = await api.get<{ data: AuthContextResponse }>('/auth/me')
    return res.data.data
  },

  async logout() {
    await api.post('/auth/logout')
  },

  async getSessions() {
    const res = await api.get<{ data: ActiveSession[] }>('/auth/sessions')
    return res.data.data
  },

  async revokeSession(sessionId: string) {
    await api.delete(`/auth/sessions/${sessionId}`)
  },

  async revokeOtherSessions() {
    const res = await api.post<{ data: { revokedCount: number } }>(
      '/auth/sessions/revoke-others'
    )
    return res.data.data
  },

  async refresh() {
    const res = await api.post<{ data: RefreshTokenResponse }>('/auth/refresh')
    return res.data.data
  },
}

export const rolesApi = {
  async getRoles() {
    const res = await api.get<{ data: RoleEntity[] }>('/roles')
    return res.data.data
  },

  async getPermissions() {
    const res = await api.get<{ data: PermissionEntity[] }>('/roles/permissions')
    return res.data.data
  },

  async getRole(roleId: string) {
    const res = await api.get<{ data: RoleEntity }>(`/roles/${roleId}`)
    return res.data.data
  },

  async createCustomRole(data: {
    name: string
    description?: string
    permissionCodes?: string[]
  }) {
    const res = await api.post<{ data: RoleEntity }>('/roles', data)
    return res.data.data
  },

  async updateRole(
    roleId: string,
    data: { name?: string; description?: string }
  ) {
    const res = await api.patch<{ data: RoleEntity }>(`/roles/${roleId}`, data)
    return res.data.data
  },

  async setRolePermissions(roleId: string, permissionCodes: string[]) {
    const res = await api.put<{
      data: { roleId: string; permissions: PermissionEntity[] }
    }>(`/roles/${roleId}/permissions`, { permissionCodes })
    return res.data.data
  },

  async assignMemberRole(membershipId: string, roleId: string) {
    const res = await api.patch<{
      data: {
        membershipId: string
        userId: string
        roleId: string
        roleName: string
      }
    }>(`/roles/members/${membershipId}`, { roleId })
    return res.data.data
  },
}

export const businessApi = {
  async getBusiness() {
    const res = await api.get<{ data: BusinessEntity }>('/business')
    return res.data.data
  },

  async updateBusiness(data: Partial<BusinessEntity>) {
    const res = await api.patch<{ data: BusinessEntity }>('/business', data)
    return res.data.data
  },

  async getMembers() {
    const res = await api.get<{ data: TeamMemberEntity[] }>('/business/members')
    return res.data.data
  },

  async inviteMember(data: {
    name: string
    email: string
    roleId: string
    branchIds?: string[]
  }) {
    const res = await api.post<{ data: TeamMemberEntity }>(
      '/business/members/invite',
      data
    )
    return res.data.data
  },
}

export const branchesApi = {
  async getBranches() {
    const res = await api.get<{ data: BranchEntity[] }>('/branches')
    return res.data.data
  },

  async createBranch(data: {
    name: string
    code: string
    address?: string
    phone?: string
    isMain?: boolean
  }) {
    const res = await api.post<{ data: BranchEntity }>('/branches', data)
    return res.data.data
  },

  async updateBranch(branchId: string, data: Partial<BranchEntity>) {
    const res = await api.patch<{ data: BranchEntity }>(
      `/branches/${branchId}`,
      data
    )
    return res.data.data
  },

  async deleteBranch(branchId: string) {
    const res = await api.delete<{ data: BranchEntity }>(`/branches/${branchId}`)
    return res.data.data
  },
}

export const workforceApi = {
  async getDepartments() {
    const res = await api.get<{ data: DepartmentEntity[] }>('/workforce/departments')
    return res.data.data
  },

  async createDepartment(data: { name: string; description?: string }) {
    const res = await api.post<{ data: DepartmentEntity }>('/workforce/departments', data)
    return res.data.data
  },

  async getPositions() {
    const res = await api.get<{ data: JobPositionEntity[] }>('/workforce/positions')
    return res.data.data
  },

  async createPosition(data: { name: string; departmentId?: string; description?: string }) {
    const res = await api.post<{ data: JobPositionEntity }>('/workforce/positions', data)
    return res.data.data
  },

  async getEmployees(params?: {
    branchId?: string
    status?: string
    positionId?: string
    search?: string
  }) {
    const res = await api.get<{ data: EmployeeEntity[] }>('/workforce/employees', { params })
    return res.data.data
  },

  async createEmployee(data: {
    firstName: string
    lastName: string
    employeeNumber: string
    branchId: string
    positionId: string
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'TEMPORARY' | 'CONTRACT'
    hireDate: string
    phone?: string
    address?: string
    status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
  }) {
    const res = await api.post<{ data: EmployeeEntity }>('/workforce/employees', data)
    return res.data.data
  },

  async getEmployee(employeeId: string) {
    const res = await api.get<{ data: EmployeeEntity }>(`/workforce/employees/${employeeId}`)
    return res.data.data
  },

  async updateEmployee(
    employeeId: string,
    data: Partial<{
      firstName: string
      lastName: string
      branchId: string
      positionId: string
      employmentType: 'FULL_TIME' | 'PART_TIME' | 'TEMPORARY' | 'CONTRACT'
      phone?: string | null
      address?: string | null
      status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
      terminationDate?: string | null
    }>
  ) {
    const res = await api.patch<{ data: EmployeeEntity }>(`/workforce/employees/${employeeId}`, data)
    return res.data.data
  },

  async getShifts(params?: { branchId?: string }) {
    const res = await api.get<{ data: ShiftEntity[] }>('/workforce/shifts', { params })
    return res.data.data
  },

  async createShift(data: {
    branchId: string
    name: string
    shiftType: 'DAY' | 'NIGHT' | 'CUSTOM'
    startTime: string
    endTime: string
    crossesMidnight?: boolean
    breakMinutes?: number
  }) {
    const res = await api.post<{ data: ShiftEntity }>('/workforce/shifts', data)
    return res.data.data
  },

  async getShiftAssignments(params?: {
    branchId?: string
    employeeId?: string
    startDate?: string
    endDate?: string
  }) {
    const res = await api.get<{ data: ShiftAssignmentEntity[] }>(
      '/workforce/shifts/assignments',
      { params }
    )
    return res.data.data
  },

  async createShiftAssignment(data: {
    branchId: string
    employeeId: string
    shiftId: string
    scheduledStart: string
    scheduledEnd: string
    status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED'
  }) {
    const res = await api.post<{ data: ShiftAssignmentEntity }>(
      '/workforce/shifts/assignments',
      data
    )
    return res.data.data
  },

  async getAttendance(params?: {
    operationalDate?: string
    branchId?: string
    employeeId?: string
  }) {
    const res = await api.get<{ data: AttendanceRecordEntity[] }>('/workforce/attendance', {
      params,
    })
    return res.data.data
  },

  async clockIn(data: {
    branchId: string
    employeeId: string
    operationalDate: string
    shiftAssignmentId?: string
    clockIn?: string
    notes?: string
  }) {
    const res = await api.post<{ data: AttendanceRecordEntity }>(
      '/workforce/attendance/clock-in',
      data
    )
    return res.data.data
  },

  async clockOut(data: {
    attendanceId: string
    clockOut?: string
    breakMinutes?: number
    notes?: string
  }) {
    const res = await api.post<{ data: AttendanceRecordEntity }>(
      '/workforce/attendance/clock-out',
      data
    )
    return res.data.data
  },

  async createLeave(data: {
    employeeId: string
    leaveType: string
    startDate: string
    endDate: string
    reason?: string
    status?: string
  }) {
    const res = await api.post<{ data: LeaveRecordEntity }>('/workforce/leaves', data)
    return res.data.data
  },

  async getHeadcountReport() {
    const res = await api.get<{ data: HeadcountReport }>('/workforce/reports/headcount')
    return res.data.data
  },
}


