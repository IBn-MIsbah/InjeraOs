import axios, { type InternalAxiosRequestConfig } from 'axios'
import { updateNetworkStatus } from './network'
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
  MaterialCategoryEntity,
  UnitOfMeasureEntity,
  MaterialVarietyEntity,
  MaterialEntity,
  SupplierEntity,
  PurchaseItemEntity,
  PurchaseEntity,
  MaterialLotEntity,
  MaterialLotMovementEntity,
  FinishedProductEntity,
  RecipeIngredientEntity,
  RecipeVersionEntity,
  RecipeEntity,
  ScaledIngredientEntity,
  ScaledRecipeResult,
  BlendInputEntity,
  BlendOutputEntity,
  BlendOperationEntity,
  ProductionSessionEntity,
  BatchEmployeeAssignmentEntity,
  MaterialConsumptionEntity,
  ProductionOutputEntity,
  RejectionRecordEntity,
  BakerProductionRecordEntity,
  ProductionBatchEntity,
  BakerProductivitySummary,
  BatchReconciliationReport,
  CompensationType,
  OverheadCategory,
  OverheadAllocationType,
  LabourCostStatus,
  EmployeeCompensationEntity,
  OverheadRecordEntity,
  OverheadAllocationEntity,
  LabourCostRecordEntity,
  LabourAllocationEntity,
  ProductionCostRecordEntity,
  BatchCostingDetail,
  UnitCostTrendItem,
  StockLocationEntity,
  FinishedInventoryLotEntity,
  FinishedStockMovementEntity,
  RawMaterialStockSummary,
  LotReconciliationReport,
  CustomerEntity,
  SaleEntity,
  PaymentEntity,
  CustomerLedgerEntryEntity,
  CustomerStatementReport,
  DeliveryEntity,
  SaleItemEntity,
  DeliveryItemEntity,
  ExpenseCategoryEntity,
  ExpenseEntity,
  FinancialReportResult,
  BakerProductivityReportItem,
  InventoryValuationReportResult,
  DashboardSummaryResult,
  DashboardWidgetEntity,
  DashboardLayoutEntity,
  SyncOperationEnvelopeEntity,
  SyncConflictEntity,
  SyncBatchResult,
  SyncStatus,
  ConflictStatus,
  SystemStatusResult,
  SystemSettingsEntity,
  UpdateSystemSettingsInput,
  AuditLogEntity,
  AuditLogListResponse,
} from '@/types'
import type {
  LoginInput,
  RegisterInput,
  CreateStockLocationInput,
  UpdateStockLocationInput,
  PostProductionToStockInput,
  RecordFinishedAdjustmentInput,
  TransferFinishedStockInput,
  RecordRawAdjustmentInput,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateSaleInput,
  RecordPaymentInput,
  RecordLedgerAdjustmentInput,
  CreateDeliveryInput,
  UpdateDeliveryStatusInput,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
  CreateExpenseInput,
  GetExpensesQueryInput,
  ReportFilterInput,
  CreateDashboardLayoutInput,
  UpdateDashboardLayoutInput,
  SyncBatchInput,
  ResolveConflictInput,
} from '@/schemas'

// Re-export types for backward compatibility
export type {
  ActiveSession,
  AuthContextResponse,
  UserProfile,
  UserProfile as UserEntity,
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
  MaterialCategoryEntity,
  UnitOfMeasureEntity,
  MaterialVarietyEntity,
  MaterialEntity,
  SupplierEntity,
  PurchaseItemEntity,
  PurchaseEntity,
  MaterialLotEntity,
  MaterialLotMovementEntity,
  FinishedProductEntity,
  RecipeIngredientEntity,
  RecipeVersionEntity,
  RecipeEntity,
  ScaledIngredientEntity,
  ScaledRecipeResult,
  BlendInputEntity,
  BlendOutputEntity,
  BlendOperationEntity,
  ProductionSessionEntity,
  BatchEmployeeAssignmentEntity,
  MaterialConsumptionEntity,
  ProductionOutputEntity,
  RejectionRecordEntity,
  BakerProductionRecordEntity,
  ProductionBatchEntity,
  BakerProductivitySummary,
  BatchReconciliationReport,
  CompensationType,
  OverheadCategory,
  OverheadAllocationType,
  LabourCostStatus,
  EmployeeCompensationEntity,
  OverheadRecordEntity,
  OverheadAllocationEntity,
  LabourCostRecordEntity,
  LabourAllocationEntity,
  ProductionCostRecordEntity,
  BatchCostingDetail,
  UnitCostTrendItem,
  StockLocationEntity,
  FinishedInventoryLotEntity,
  FinishedStockMovementEntity,
  RawMaterialStockSummary,
  LotReconciliationReport,
  CustomerEntity,
  SaleEntity,
  PaymentEntity,
  CustomerLedgerEntryEntity,
  CustomerStatementReport,
  DeliveryEntity,
  SaleItemEntity,
  DeliveryItemEntity,
  ExpenseCategoryEntity,
  ExpenseEntity,
  FinancialReportResult,
  BakerProductivityReportItem,
  InventoryValuationReportResult,
  DashboardSummaryResult,
  DashboardWidgetEntity,
  DashboardLayoutEntity,
  SyncOperationEnvelopeEntity,
  SyncConflictEntity,
  SyncBatchResult,
  SyncStatus,
  ConflictStatus,
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

// Auto-refresh token rotation & network resiliency interceptor
let refreshPromise: Promise<void> | undefined

api.interceptors.response.use(
  (response) => {
    updateNetworkStatus({ isServerReachable: true })
    return response
  },
  async (error) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean; _networkRetried?: boolean })
      | undefined

    // 1. Detect Network Down / Disconnection / Timeout
    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error'

    if (isNetworkError) {
      updateNetworkStatus({ isServerReachable: false })

      // Auto-retry idempotent GET requests once after brief delay
      if (
        originalRequest &&
        !originalRequest._networkRetried &&
        (originalRequest.method?.toLowerCase() === 'get' || !originalRequest.method)
      ) {
        originalRequest._networkRetried = true
        await new Promise((resolve) => setTimeout(resolve, 800))
        return api(originalRequest)
      }

      throw error
    }

    // 2. Handle 401 Unauthorized token rotation
    if (
      originalRequest &&
      !originalRequest._retried &&
      error.response?.status === 401 &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
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

    // 3. Mark server reachable if we received an HTTP response status
    if (error.response?.status) {
      updateNetworkStatus({ isServerReachable: true })
    }

    throw error
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

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const res = await api.post<{ message: string }>('/auth/change-password', data)
    return res.data
  },
}

export const userApi = {
  async getProfile() {
    const res = await api.get<{ data: UserProfile }>('/users/me')
    return res.data.data
  },

  async updateProfile(data: { name?: string; phone?: string }) {
    const res = await api.patch<{ data: UserProfile }>('/users/me', data)
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

  async deleteRole(roleId: string) {
    const res = await api.delete<{ message: string }>(`/roles/${roleId}`)
    return res.data
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
    employeeNumber?: string
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

export const materialsApi = {
  // Categories
  async getCategories() {
    const res = await api.get<{ data: MaterialCategoryEntity[] }>('/materials/categories')
    return res.data.data
  },

  async createCategory(data: { name: string; description?: string }) {
    const res = await api.post<{ data: MaterialCategoryEntity }>('/materials/categories', data)
    return res.data.data
  },

  // Units
  async getUnits() {
    const res = await api.get<{ data: UnitOfMeasureEntity[] }>('/materials/units')
    return res.data.data
  },

  async createUnit(data: { name: string; symbol: string; dimension: string; isBaseUnit?: boolean }) {
    const res = await api.post<{ data: UnitOfMeasureEntity }>('/materials/units', data)
    return res.data.data
  },

  async convertUnit(data: { fromUnitId: string; toUnitId: string; quantity: number }) {
    const res = await api.post<{
      data: {
        fromUnit: UnitOfMeasureEntity
        toUnit: UnitOfMeasureEntity
        originalQuantity: number
        convertedQuantity: number
        conversionRatio: number
      }
    }>('/materials/units/convert', data)
    return res.data.data
  },

  // Materials & Varieties
  async getMaterials() {
    const res = await api.get<{ data: MaterialEntity[] }>('/materials')
    return res.data.data
  },

  async getLowStockMaterials() {
    const res = await api.get<{
      data: MaterialEntity[]
      summary: { totalLowStockCount: number }
    }>('/materials/low-stock')
    return res.data
  },

  async getMaterial(id: string) {
    const res = await api.get<{ data: MaterialEntity }>(`/materials/${id}`)
    return res.data.data
  },

  async createMaterial(data: {
    name: string
    categoryId: string
    defaultUnitId: string
    minimumStock: number
  }) {
    const res = await api.post<{ data: MaterialEntity }>('/materials', data)
    return res.data.data
  },

  async updateMaterial(
    id: string,
    data: Partial<{
      name: string
      categoryId: string
      defaultUnitId: string
      minimumStock: number
      isActive: boolean
    }>
  ) {
    const res = await api.patch<{ data: MaterialEntity }>(`/materials/${id}`, data)
    return res.data.data
  },

  async getVarieties(materialId: string) {
    const res = await api.get<{ data: MaterialVarietyEntity[] }>(`/materials/${materialId}/varieties`)
    return res.data.data
  },

  async createVariety(materialId: string, data: { name: string; description?: string }) {
    const res = await api.post<{ data: MaterialVarietyEntity }>(
      `/materials/${materialId}/varieties`,
      data
    )
    return res.data.data
  },

  // Suppliers
  async getSuppliers() {
    const res = await api.get<{ data: SupplierEntity[] }>('/materials/suppliers')
    return res.data.data
  },

  async createSupplier(data: {
    name: string
    phone?: string
    address?: string
    contactPerson?: string
  }) {
    const res = await api.post<{ data: SupplierEntity }>('/materials/suppliers', data)
    return res.data.data
  },

  // Purchases
  async getPurchases() {
    const res = await api.get<{ data: PurchaseEntity[] }>('/materials/purchases')
    return res.data.data
  },

  async getPurchase(id: string) {
    const res = await api.get<{ data: PurchaseEntity }>(`/materials/purchases/${id}`)
    return res.data.data
  },

  async createPurchase(data: {
    branchId: string
    supplierId: string
    purchaseNumber: string
    purchaseDate: string
    acquisitionCost: number
    paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID'
    receiveImmediately?: boolean
    items: {
      materialId: string
      varietyId?: string | null
      unitId: string
      grossQuantity: number
      tareQuantity: number
      unusableQuantity: number
      purchaseCost: number
    }[]
  }) {
    const res = await api.post<{ data: PurchaseEntity }>('/materials/purchases', data)
    return res.data.data
  },

  async receivePurchase(id: string) {
    const res = await api.post<{
      message: string
      data: { purchaseId: string; status: string; createdLots: MaterialLotEntity[] }
    }>(`/materials/purchases/${id}/receive`)
    return res.data
  },

  // Lots & Movements
  async getLots(params?: { materialId?: string; status?: string }) {
    const res = await api.get<{ data: MaterialLotEntity[] }>('/materials/lots', { params })
    return res.data.data
  },

  async getLotMovements(lotId: string) {
    const res = await api.get<{
      data: { lot: MaterialLotEntity; movements: MaterialLotMovementEntity[] }
    }>(`/materials/lots/${lotId}/movements`)
    return res.data.data
  },

  async adjustLot(
    lotId: string,
    data: {
      movementType: 'PRODUCTION_CONSUMPTION' | 'ADJUSTMENT_OUT' | 'ADJUSTMENT_IN'
      quantity: number
      reason: string
    }
  ) {
    const res = await api.post<{
      message: string
      data: { lot: MaterialLotEntity; movement: MaterialLotMovementEntity }
    }>(`/materials/lots/${lotId}/adjust`, data)
    return res.data
  },
}

export const recipesApi = {
  // Finished Products
  async getProducts() {
    const res = await api.get<{ data: FinishedProductEntity[] }>('/recipes/products')
    return res.data.data
  },

  async createProduct(data: {
    name: string
    productCode: string
    size?: string | null
    unitId: string
    defaultSellingPrice: number
    isActive?: boolean
  }) {
    const res = await api.post<{ data: FinishedProductEntity }>('/recipes/products', data)
    return res.data.data
  },

  // Recipes
  async getRecipes() {
    const res = await api.get<{ data: RecipeEntity[] }>('/recipes')
    return res.data.data
  },

  async getRecipe(id: string) {
    const res = await api.get<{ data: RecipeEntity }>(`/recipes/${id}`)
    return res.data.data
  },

  async createRecipe(data: {
    name: string
    productId: string
    branchId?: string | null
    description?: string | null
    referenceBatchQuantity: number
    expectedYield: number
    instructions?: string | null
    effectiveFrom?: string
    ingredients: {
      materialId: string
      varietyId?: string | null
      unitId: string
      expectedQuantity: number
      notes?: string | null
    }[]
  }) {
    const res = await api.post<{ data: RecipeEntity }>('/recipes', data)
    return res.data.data
  },

  async createRecipeVersion(
    recipeId: string,
    data: {
      referenceBatchQuantity: number
      expectedYield: number
      instructions?: string | null
      effectiveFrom?: string
      ingredients: {
        materialId: string
        varietyId?: string | null
        unitId: string
        expectedQuantity: number
        notes?: string | null
      }[]
    }
  ) {
    const res = await api.post<{ message: string; data: RecipeVersionEntity }>(
      `/recipes/${recipeId}/versions`,
      data
    )
    return res.data
  },

  async scaleRecipe(
    recipeId: string,
    data: { plannedBatchQuantity: number },
    versionNumber?: number
  ) {
    const res = await api.post<{ data: ScaledRecipeResult }>(
      `/recipes/${recipeId}/scale`,
      data,
      { params: versionNumber !== undefined ? { versionNumber } : undefined }
    )
    return res.data.data
  },

  // Pre-Mix Blending
  async getBlends() {
    const res = await api.get<{ data: BlendOperationEntity[] }>('/recipes/blends')
    return res.data.data
  },

  async getBlend(id: string) {
    const res = await api.get<{ data: BlendOperationEntity }>(`/recipes/blends/${id}`)
    return res.data.data
  },

  async createBlend(data: {
    branchId: string
    operationNumber: string
    operationDate?: string
    targetMaterialId: string
    targetVarietyId?: string | null
    targetUnitId: string
    processingLoss?: number
    processingCost?: number
    inputs: {
      materialLotId: string
      quantityConsumed: number
    }[]
  }) {
    const res = await api.post<{
      message: string
      data: {
        operation: BlendOperationEntity
        blendLot: MaterialLotEntity
        outputQuantity: number
        blendUnitCost: number
        totalBlendCost: number
      }
    }>('/recipes/blends', data)
    return res.data
  },
}

export const productionApi = {
  // Sessions
  async getSessions(params?: { branchId?: string; status?: string; operationalDate?: string }) {
    const res = await api.get<{ data: ProductionSessionEntity[] }>('/production/sessions', {
      params,
    })
    return res.data.data
  },

  async getSession(id: string) {
    const res = await api.get<{ data: ProductionSessionEntity }>(`/production/sessions/${id}`)
    return res.data.data
  },

  async createSession(data: {
    branchId: string
    sessionNumber: string
    operationalDate: string
    startTime: string
    endTime?: string | null
    shiftAssignmentId?: string | null
    supervisorId: string
    notes?: string | null
  }) {
    const res = await api.post<{ data: ProductionSessionEntity }>('/production/sessions', data)
    return res.data.data
  },

  async updateSessionStatus(id: string, data: { status: string; endTime?: string | null }) {
    const res = await api.patch<{ data: ProductionSessionEntity }>(
      `/production/sessions/${id}/status`,
      data
    )
    return res.data.data
  },

  // Batches
  async getBatches(params?: { productionSessionId?: string; status?: string }) {
    const res = await api.get<{ data: ProductionBatchEntity[] }>('/production/batches', {
      params,
    })
    return res.data.data
  },

  async getBatch(id: string) {
    const res = await api.get<{ data: ProductionBatchEntity }>(`/production/batches/${id}`)
    return res.data.data
  },

  async createBatch(data: {
    productionSessionId: string
    recipeId: string
    recipeVersionId: string
    batchNumber: string
    plannedQuantity: number
    startTime?: string | null
  }) {
    const res = await api.post<{ data: ProductionBatchEntity }>('/production/batches', data)
    return res.data.data
  },

  async assignEmployee(
    batchId: string,
    data: {
      employeeId: string
      assignmentRole: 'BAKER' | 'LABOURER' | 'SUPERVISOR' | 'OTHER'
      assignedStart: string
      assignedEnd?: string | null
      notes?: string | null
    }
  ) {
    const res = await api.post<{ data: BatchEmployeeAssignmentEntity }>(
      `/production/batches/${batchId}/assignments`,
      data
    )
    return res.data.data
  },

  async consumeMaterials(
    batchId: string,
    data: {
      consumptions: {
        materialLotId: string
        actualQuantity: number
        unitId: string
      }[]
    }
  ) {
    const res = await api.post<{
      message: string
      data: MaterialConsumptionEntity[]
    }>(`/production/batches/${batchId}/consume`, data)
    return res.data
  },

  async recordOutputs(
    batchId: string,
    data: {
      productId: string
      acceptedQuantity: number
      rejectedQuantity: number
      allocationMethod?: string
      rejections?: {
        reason: 'BURNT' | 'TORN_DAMAGED' | 'INCORRECT_THICKNESS' | 'INCORRECT_SIZE' | 'CONTAMINATION' | 'OTHER'
        quantity: number
        employeeId?: string | null
        notes?: string | null
      }[]
    }
  ) {
    const res = await api.post<{
      message: string
      data: {
        output: ProductionOutputEntity
        rejections: RejectionRecordEntity[]
        updatedBatch: ProductionBatchEntity
      }
    }>(`/production/batches/${batchId}/outputs`, data)
    return res.data
  },

  async recordBakerProduction(
    batchId: string,
    data: {
      employeeId: string
      productId: string
      shiftAssignmentId?: string | null
      acceptedQuantity: number
      rejectedQuantity: number
      attributionMethod?: string
      notes?: string | null
    }
  ) {
    const res = await api.post<{
      message: string
      data: BakerProductionRecordEntity
    }>(`/production/batches/${batchId}/bakers`, data)
    return res.data
  },

  async finalizeBatch(batchId: string) {
    const res = await api.post<{
      message: string
      data: ProductionBatchEntity
    }>(`/production/batches/${batchId}/finalize`)
    return res.data
  },

  // Reports
  async getBakerProductivity(params?: {
    startDate?: string
    endDate?: string
    branchId?: string
  }) {
    const res = await api.get<{ data: BakerProductivitySummary[] }>(
      '/production/reports/baker-productivity',
      { params }
    )
    return res.data.data
  },

  async getReconciliation(batchId: string) {
    const res = await api.get<{ data: BatchReconciliationReport }>(
      '/production/reports/reconciliations',
      { params: { batchId } }
    )
    return res.data.data
  },
}

export const costingApi = {
  // Compensation
  async getCompensations(params?: { employeeId?: string; activeOnly?: boolean }) {
    const res = await api.get<{ data: EmployeeCompensationEntity[] }>('/costing/compensations', { params })
    return res.data.data
  },

  async createCompensation(data: {
    employeeId: string
    compensationType: CompensationType
    baseRate: number
    pieceRatePerInjera?: number | null
    effectiveFrom: string
    notes?: string | null
  }) {
    const res = await api.post<{ data: EmployeeCompensationEntity }>('/costing/compensations', data)
    return res.data.data
  },

  // Overheads
  async getOverheads(params?: {
    branchId?: string
    productionBatchId?: string
    allocationType?: OverheadAllocationType
    startDate?: string
    endDate?: string
  }) {
    const res = await api.get<{ data: OverheadRecordEntity[] }>('/costing/overheads', { params })
    return res.data.data
  },

  async createOverhead(data: {
    branchId: string
    productionBatchId?: string | null
    operationalDate: string
    category: OverheadCategory
    amount: number
    paymentMethod?: string | null
    allocationType: OverheadAllocationType
    description?: string | null
    sourceReference?: string | null
  }) {
    const res = await api.post<{ data: OverheadRecordEntity }>('/costing/overheads', data)
    return res.data.data
  },

  async allocateOverhead(
    id: string,
    data: {
      allocations: {
        productionBatchId: string
        allocatedAmount: number
        allocationBasis?: string
      }[]
    }
  ) {
    const res = await api.post<{ message: string; data: OverheadRecordEntity }>(
      `/costing/overheads/${id}/allocate`,
      data
    )
    return res.data
  },

  // Labour Costs
  async getLabourCosts(params?: {
    branchId?: string
    employeeId?: string
    status?: LabourCostStatus
    startDate?: string
    endDate?: string
  }) {
    const res = await api.get<{ data: LabourCostRecordEntity[] }>('/costing/labour-costs', { params })
    return res.data.data
  },

  async createLabourCost(data: {
    branchId: string
    employeeId: string
    attendanceRecordId?: string | null
    operationalDate: string
    workedMinutes: number
    compensationTypeSnapshot: CompensationType
    rateSnapshot: number
    totalLabourCost: number
  }) {
    const res = await api.post<{ data: LabourCostRecordEntity }>('/costing/labour-costs', data)
    return res.data.data
  },

  async allocateLabourCost(
    id: string,
    data: {
      allocations: {
        productionBatchId: string
        allocatedCost: number
        allocationBasis?: string
      }[]
    }
  ) {
    const res = await api.post<{ message: string; data: LabourCostRecordEntity }>(
      `/costing/labour-costs/${id}/allocate`,
      data
    )
    return res.data
  },

  // Batch Costing & Absorption
  async getBatchCosting(batchId: string) {
    const res = await api.get<{ data: BatchCostingDetail }>(`/costing/batches/${batchId}`)
    return res.data.data
  },

  async calculateBatchCost(batchId: string) {
    const res = await api.post<{ message: string; data: ProductionCostRecordEntity }>(
      `/costing/batches/${batchId}/calculate`
    )
    return res.data
  },

  async finalizeBatchCost(batchId: string) {
    const res = await api.post<{ message: string; data: ProductionCostRecordEntity }>(
      `/costing/batches/${batchId}/finalize`
    )
    return res.data
  },

  // Reports
  async getUnitCostTrends(params?: {
    recipeId?: string
    startDate?: string
    endDate?: string
  }) {
    const res = await api.get<{ data: UnitCostTrendItem[] }>('/costing/reports/unit-cost-trends', { params })
    return res.data.data
  },
}

export const inventoryApi = {
  // Stock Locations
  async getLocations(params?: { branchId?: string; isActive?: boolean }) {
    const res = await api.get<{ data: StockLocationEntity[] }>('/inventory/locations', { params })
    return res.data.data
  },

  async createLocation(data: CreateStockLocationInput) {
    const res = await api.post<{ data: StockLocationEntity }>('/inventory/locations', data)
    return res.data.data
  },

  async updateLocation(id: string, data: UpdateStockLocationInput) {
    const res = await api.patch<{ data: StockLocationEntity }>(`/inventory/locations/${id}`, data)
    return res.data.data
  },

  // Finished Goods Lots
  async getFinishedLots(params?: {
    branchId?: string
    productId?: string
    stockLocationId?: string
    status?: string
    fifoOnly?: string
  }) {
    const res = await api.get<{ data: FinishedInventoryLotEntity[] }>('/inventory/finished-lots', { params })
    return res.data.data
  },

  async getSaleReadyStock(params?: { branchId?: string; productId?: string }) {
    const res = await api.get<{ data: FinishedInventoryLotEntity[] }>('/inventory/sale-ready', { params })
    return res.data.data
  },

  async postProductionToStock(data: PostProductionToStockInput) {
    const res = await api.post<{ message: string; data: FinishedInventoryLotEntity }>(
      '/inventory/finished-lots/post-production',
      data
    )
    return res.data
  },

  async adjustFinishedStock(data: RecordFinishedAdjustmentInput) {
    const res = await api.post<{ message: string; data: FinishedInventoryLotEntity }>(
      '/inventory/finished-lots/adjust',
      data
    )
    return res.data
  },

  async transferFinishedStock(data: TransferFinishedStockInput) {
    const res = await api.post<{ message: string; data: FinishedInventoryLotEntity }>(
      '/inventory/finished-lots/transfer',
      data
    )
    return res.data
  },

  // Raw Material Stock
  async getRawStock(params?: { branchId?: string; materialId?: string; lowStockOnly?: boolean }) {
    const res = await api.get<{ data: RawMaterialStockSummary[] }>('/inventory/raw-stock', { params })
    return res.data.data
  },

  async adjustRawStock(data: RecordRawAdjustmentInput) {
    const res = await api.post<{ message: string; data: MaterialLotEntity }>(
      '/inventory/raw-stock/adjust',
      data
    )
    return res.data
  },

  // Lot Movement Reconciliation
  async getLotReconciliation(lotId: string) {
    const res = await api.get<{ data: LotReconciliationReport }>(
      `/inventory/finished-lots/${lotId}/reconciliation`
    )
    return res.data.data
  },
}

export const salesApi = {
  // Customers
  async getCustomers(params?: { customerType?: string; status?: string; search?: string }) {
    const res = await api.get<{ data: CustomerEntity[] }>('/sales/customers', { params })
    return res.data.data
  },

  async createCustomer(data: CreateCustomerInput) {
    const res = await api.post<{ message: string; data: CustomerEntity }>('/sales/customers', data)
    return res.data
  },

  async getCustomer(id: string) {
    const res = await api.get<{ data: CustomerEntity }>(`/sales/customers/${id}`)
    return res.data.data
  },

  async updateCustomer(id: string, data: UpdateCustomerInput) {
    const res = await api.patch<{ message: string; data: CustomerEntity }>(`/sales/customers/${id}`, data)
    return res.data
  },

  async getCustomerStatement(id: string, params?: { startDate?: string; endDate?: string }) {
    const res = await api.get<{ data: CustomerStatementReport }>(`/sales/customers/${id}/statement`, { params })
    return res.data.data
  },

  async recordLedgerAdjustment(customerId: string, data: RecordLedgerAdjustmentInput) {
    const res = await api.post<{ message: string; data: CustomerLedgerEntryEntity }>(
      `/sales/customers/${customerId}/ledger-adjustment`,
      data
    )
    return res.data
  },

  // Sales Orders & POS
  async getSales(params?: {
    branchId?: string
    customerId?: string
    paymentStatus?: string
    saleStatus?: string
    startDate?: string
    endDate?: string
  }) {
    const res = await api.get<{ data: SaleEntity[] }>('/sales', { params })
    return res.data.data
  },

  async createSale(data: CreateSaleInput) {
    const res = await api.post<{ message: string; data: SaleEntity }>('/sales', data)
    return res.data
  },

  async getSale(id: string) {
    const res = await api.get<{ data: SaleEntity }>(`/sales/${id}`)
    return res.data.data
  },

  async cancelSale(id: string, reason?: string) {
    const res = await api.post<{ message: string; data: SaleEntity }>(`/sales/${id}/cancel`, { reason })
    return res.data
  },

  // Payments
  async getPayments(params?: { customerId?: string; saleId?: string; startDate?: string; endDate?: string }) {
    const res = await api.get<{ data: PaymentEntity[] }>('/sales/payments', { params })
    return res.data.data
  },

  async recordPayment(data: RecordPaymentInput) {
    const res = await api.post<{ message: string; data: PaymentEntity }>('/sales/payments', data)
    return res.data
  },

  // Deliveries
  async getDeliveries(params?: {
    branchId?: string
    customerId?: string
    deliveryEmployeeId?: string
    status?: string
    deliveryDate?: string
  }) {
    const res = await api.get<{ data: DeliveryEntity[] }>('/sales/deliveries', { params })
    return res.data.data
  },

  async createDelivery(data: CreateDeliveryInput) {
    const res = await api.post<{ message: string; data: DeliveryEntity }>('/sales/deliveries', data)
    return res.data
  },

  async getDelivery(id: string) {
    const res = await api.get<{ data: DeliveryEntity }>(`/sales/deliveries/${id}`)
    return res.data.data
  },

  async updateDeliveryStatus(id: string, data: UpdateDeliveryStatusInput) {
    const res = await api.patch<{ message: string; data: DeliveryEntity }>(`/sales/deliveries/${id}/status`, data)
    return res.data
  },
}

export const expensesApi = {
  async getCategories() {
    const res = await api.get<{ data: ExpenseCategoryEntity[] }>('/expenses/categories')
    return res.data.data
  },

  async createCategory(data: CreateExpenseCategoryInput) {
    const res = await api.post<{ message: string; data: ExpenseCategoryEntity }>('/expenses/categories', data)
    return res.data
  },

  async updateCategory(id: string, data: UpdateExpenseCategoryInput) {
    const res = await api.patch<{ message: string; data: ExpenseCategoryEntity }>(`/expenses/categories/${id}`, data)
    return res.data
  },

  async getExpenses(params?: GetExpensesQueryInput) {
    const res = await api.get<{ data: ExpenseEntity[] }>('/expenses', { params })
    return res.data.data
  },

  async createExpense(data: CreateExpenseInput) {
    const res = await api.post<{ message: string; data: ExpenseEntity }>('/expenses', data)
    return res.data
  },

  async getExpense(id: string) {
    const res = await api.get<{ data: ExpenseEntity }>(`/expenses/${id}`)
    return res.data.data
  },

  async cancelExpense(id: string) {
    const res = await api.post<{ message: string; data: ExpenseEntity }>(`/expenses/${id}/cancel`, {})
    return res.data
  },
}

export const reportsApi = {
  async getFinancialReport(params?: ReportFilterInput) {
    const res = await api.get<{ data: FinancialReportResult }>('/reports/financial', { params })
    return res.data.data
  },

  async getBakerProductivityReport(params?: ReportFilterInput) {
    const res = await api.get<{ data: BakerProductivityReportItem[] }>('/reports/baker-productivity', { params })
    return res.data.data
  },

  async getInventoryValuationReport(params?: { branchId?: string }) {
    const res = await api.get<{ data: InventoryValuationReportResult }>('/reports/inventory-valuation', { params })
    return res.data.data
  },

  async getDashboardSummary() {
    const res = await api.get<{ data: DashboardSummaryResult }>('/reports/dashboard-summary')
    return res.data.data
  },
}

export const dashboardsApi = {
  async getLayouts() {
    const res = await api.get<{ data: DashboardLayoutEntity[] }>('/dashboards')
    return res.data.data
  },

  async createLayout(data: CreateDashboardLayoutInput) {
    const res = await api.post<{ message: string; data: DashboardLayoutEntity }>('/dashboards', data)
    return res.data.data
  },

  async getLayout(id: string) {
    const res = await api.get<{ data: DashboardLayoutEntity }>(`/dashboards/${id}`)
    return res.data.data
  },

  async updateLayout(id: string, data: UpdateDashboardLayoutInput) {
    const res = await api.put<{ message: string; data: DashboardLayoutEntity }>(`/dashboards/${id}`, data)
    return res.data.data
  },

  async deleteLayout(id: string) {
    const res = await api.delete<{ message: string }>(`/dashboards/${id}`)
    return res.data
  },
}

export const syncApi = {
  async syncBatch(data: SyncBatchInput) {
    const res = await api.post<{ message: string; data: SyncBatchResult }>('/sync/batch', data)
    return res.data.data
  },

  async getSyncStatus(params?: {
    deviceId?: string
    idempotencyKeys?: string
    status?: string
    limit?: number
  }) {
    const res = await api.get<{ data: SyncOperationEnvelopeEntity[] }>('/sync/status', { params })
    return res.data.data
  },

  async getConflicts(params?: { status?: string; limit?: number }) {
    const res = await api.get<{ data: SyncConflictEntity[] }>('/sync/conflicts', { params })
    return res.data.data
  },

  async resolveConflict(conflictId: string, data: ResolveConflictInput) {
    const res = await api.post<{ message: string; data: Record<string, unknown> }>(
      `/sync/conflicts/${conflictId}/resolve`,
      data
    )
    return res.data
  },
}

export const systemApi = {
  async getStatus() {
    const res = await api.get<{ data: SystemStatusResult }>('/system/status')
    return res.data.data
  },

  async getSettings() {
    const res = await api.get<{ data: SystemSettingsEntity }>('/system/settings')
    return res.data.data
  },

  async updateSettings(data: UpdateSystemSettingsInput) {
    const res = await api.patch<{ data: SystemSettingsEntity; message: string }>(
      '/system/settings',
      data
    )
    return res.data
  },
}

export const auditApi = {
  async getLogs(params?: {
    page?: number
    limit?: number
    action?: string
    entityType?: string
    source?: string
  }) {
    const res = await api.get<AuditLogListResponse>('/audit-logs', { params })
    return res.data
  },

  async createLog(data: {
    action: string
    entityType: string
    entityId?: string
    beforeData?: Record<string, unknown>
    afterData?: Record<string, unknown>
    reason?: string
    source?: 'WEB' | 'MOBILE' | 'OFFLINE_SYNC' | 'SYSTEM'
  }) {
    const res = await api.post<{ data: AuditLogEntity }>('/audit-logs', data)
    return res.data.data
  },
}










