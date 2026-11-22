import type {
  Calendar,
  BusinessStatus,
  CustomerType,
  Dimension,
  ExpenseCategoryType,
  ExpenseStatus,
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
  DeliveryStatus,
  LedgerTransactionType,
  SyncStatus,
  ConflictStatus,
} from './enums'

export interface BusinessEntity {
  id: string
  name: string
  legalName?: string | null
  taxId?: string | null
  calendarPreference: Calendar
  currency: string
  status: BusinessStatus
  phone?: string | null
  email?: string | null
  address?: string | null
  createdAt: string
  updatedAt: string
}

export interface BranchEntity {
  id: string
  businessId: string
  name: string
  code: string
  phone?: string | null
  address?: string | null
  isMain: boolean
  createdAt: string
  updatedAt: string
}

export interface TeamMemberEntity {
  id: string
  userId: string
  name: string
  email: string
  phone?: string | null
  roleId: string
  roleName: string
  roleDescription?: string | null
  status: string
  branchIds: string[]
  createdAt: string
}

export interface MaterialCategoryEntity {
  id: string
  businessId: string
  name: string
  description?: string | null
  isActive: boolean
}

export interface UnitOfMeasureEntity {
  id: string
  businessId: string
  name: string
  symbol: string
  dimension: Dimension
  isBaseUnit: boolean
}

export interface MaterialVarietyEntity {
  id: string
  businessId: string
  materialId: string
  name: string
  description?: string | null
  isActive: boolean
}

export interface MaterialEntity {
  id: string
  businessId: string
  categoryId: string
  categoryName?: string
  name: string
  defaultUnitId: string
  defaultUnitSymbol?: string
  minimumStock: number
  isActive: boolean
  currentStock?: number
  isLowStock?: boolean
  createdAt: string
  varieties?: MaterialVarietyEntity[]
  activeLots?: MaterialLotEntity[]
}

export interface SupplierEntity {
  id: string
  businessId: string
  name: string
  phone?: string | null
  address?: string | null
  contactPerson?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
}

export interface PurchaseItemEntity {
  id: string
  businessId: string
  purchaseId: string
  materialId: string
  varietyId?: string | null
  grossQuantity: number
  tareQuantity: number
  unusableQuantity: number
  usableQuantity: number
  unitId: string
  purchaseCost: number
  allocatedAcquisitionCost: number
  unitCost: number
}

export interface PurchaseEntity {
  id: string
  businessId: string
  branchId: string
  supplierId: string
  purchaseNumber: string
  purchaseDate: string
  totalAmount: number
  acquisitionCost: number
  paymentStatus: PaymentStatus
  status: 'DRAFT' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED'
  createdById: string
  createdAt: string
  items?: PurchaseItemEntity[]
}

export interface MaterialLotEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  materialId: string
  materialName?: string
  varietyId?: string | null
  varietyName?: string | null
  purchaseItemId?: string | null
  blendOperationId?: string | null
  lotNumber: string
  originalQuantity: number
  remainingQuantity: number
  unitId: string
  unitSymbol?: string
  totalAcquisitionCost: number
  unitCost: number
  receivedAt: string
  expiryDate?: string | null
  status: 'AVAILABLE' | 'DEPLETED' | 'BLOCKED' | 'EXPIRED'
}

export interface MaterialLotMovementEntity {
  id: string
  businessId: string
  materialLotId: string
  movementType:
    | 'PURCHASE_RECEIPT'
    | 'PRODUCTION_CONSUMPTION'
    | 'BLEND_INPUT'
    | 'BLEND_OUTPUT'
    | 'ADJUSTMENT_IN'
    | 'ADJUSTMENT_OUT'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'REVERSAL'
  quantity: number
  unitCostSnapshot: number
  totalCost: number
  referenceType: string
  referenceId: string
  occurredAt: string
  createdById: string
}

export interface FinishedProductEntity {
  id: string
  businessId: string
  name: string
  productCode: string
  size?: string | null
  unitId: string
  unitSymbol?: string
  defaultSellingPrice: number
  isActive: boolean
  createdAt: string
}

export interface RecipeIngredientEntity {
  id: string
  businessId?: string
  recipeVersionId: string
  materialId: string
  materialName?: string
  varietyId?: string | null
  varietyName?: string | null
  expectedQuantity: number
  unitId: string
  unitSymbol?: string
  notes?: string | null
}

export interface RecipeVersionEntity {
  id: string
  businessId?: string
  recipeId: string
  versionNumber: number
  referenceBatchQuantity: number
  expectedYield: number
  instructions?: string | null
  effectiveFrom?: string | null
  createdById?: string
  createdAt?: string
  ingredients?: RecipeIngredientEntity[]
}

export interface RecipeEntity {
  id: string
  businessId: string
  productId: string
  productName?: string
  productCode?: string
  branchId?: string | null
  branchName?: string
  name: string
  description?: string | null
  status?: string
  currentVersionNumber?: number
  referenceBatchQuantity?: number
  expectedYield?: number
  effectiveFrom?: string | null
  versions?: RecipeVersionEntity[]
  currentVersion?: RecipeVersionEntity | null
  createdAt?: string
  updatedAt?: string
}

export interface ScaledIngredientEntity {
  id: string
  materialId: string
  materialName: string
  unitId: string
  unitSymbol: string
  varietyId?: string | null
  notes?: string | null
  baseExpectedQuantity: number
  scaledExpectedQuantity: number
}

export interface ScaledRecipeResult {
  recipeId: string
  recipeName: string
  versionNumber: number
  referenceBatchQuantity: number
  plannedBatchQuantity: number
  scalingFactor: number
  baseExpectedYield: number
  scaledExpectedYield: number
  scaledIngredients: ScaledIngredientEntity[]
}

export interface BlendInputEntity {
  id: string
  blendOperationId: string
  materialLotId: string
  lotNumber?: string
  materialId?: string
  varietyId?: string | null
  quantityConsumed: number
  unitCostSnapshot: number
  totalCost: number
}

export interface BlendOutputEntity {
  id: string
  blendOperationId: string
  materialLotId: string
  lotNumber?: string
  outputQuantity: number
  unitCost: number
  totalCost: number
}

export interface BlendOperationEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  operationNumber: string
  operationDate: string
  outputQuantity: number
  processingLoss: number
  processingCost: number
  status: 'COMPLETED' | 'CANCELLED'
  createdById: string
  inputsCount?: number
  inputs?: BlendInputEntity[]
  output?: BlendOutputEntity | null
  createdAt?: string
}

export interface ProductionSessionEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  sessionNumber: string
  operationalDate: string
  startTime: string
  endTime?: string | null
  shiftAssignmentId?: string | null
  supervisorId: string
  supervisorName?: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  notes?: string | null
  batchCount?: number
  batches?: ProductionBatchEntity[]
  createdAt: string
}

export interface BatchEmployeeAssignmentEntity {
  id: string
  businessId: string
  productionBatchId: string
  employeeId: string
  employeeName?: string
  assignmentRole: 'BAKER' | 'LABOURER' | 'SUPERVISOR' | 'OTHER'
  assignedStart: string
  assignedEnd?: string | null
  notes?: string | null
}

export interface MaterialConsumptionEntity {
  id: string
  businessId: string
  productionBatchId: string
  materialLotId: string
  lotNumber?: string
  materialName?: string
  actualQuantity: number
  unitId: string
  unitSymbol?: string
  unitCostSnapshot: number
  totalCost: number
  consumedAt: string
}

export interface ProductionOutputEntity {
  id: string
  businessId: string
  productionBatchId: string
  productId: string
  productName?: string
  totalQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  allocationMethod: string
  allocatedCost: number
  unitCost: number
}

export interface RejectionRecordEntity {
  id: string
  businessId: string
  productionBatchId: string
  productionOutputId?: string | null
  employeeId?: string | null
  employeeName?: string
  reason: 'BURNT' | 'TORN_DAMAGED' | 'INCORRECT_THICKNESS' | 'INCORRECT_SIZE' | 'CONTAMINATION' | 'OTHER'
  quantity: number
  notes?: string | null
  evidenceReference?: string | null
  recordedAt: string
}

export interface BakerProductionRecordEntity {
  id: string
  businessId: string
  branchId: string
  employeeId: string
  bakerName?: string
  productionSessionId: string
  productionBatchId: string
  shiftAssignmentId?: string | null
  productId: string
  productName?: string
  operationalDate: string
  totalProduced: number
  acceptedQuantity: number
  rejectedQuantity: number
  attributionMethod: 'INDIVIDUAL_COUNT' | 'SUPERVISOR_ALLOCATION'
  recordedById?: string | null
  approvedById?: string | null
  notes?: string | null
  createdAt: string
}

export interface ProductionBatchEntity {
  id: string
  businessId: string
  productionSessionId: string
  sessionNumber?: string
  operationalDate?: string | null
  branchName?: string
  recipeId: string
  recipeName?: string
  recipeVersionId: string
  versionNumber?: number
  batchNumber: string
  plannedQuantity: number
  actualOutput: number
  acceptedOutput: number
  rejectedOutput: number
  startTime?: string | null
  endTime?: string | null
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  finalizedAt?: string | null
  finalizedById?: string | null
  consumptions?: MaterialConsumptionEntity[]
  outputs?: ProductionOutputEntity[]
  rejections?: RejectionRecordEntity[]
  bakers?: BakerProductionRecordEntity[]
  assignments?: BatchEmployeeAssignmentEntity[]
}

export interface BakerProductivitySummary {
  employeeId: string
  bakerName: string
  totalProduced: number
  acceptedQuantity: number
  rejectedQuantity: number
  rejectionRatePercentage: number
  distinctSessionsWorked: number
}

export interface BatchReconciliationReport {
  batchId: string
  batchNumber: string
  teamOutput: {
    total: number
    accepted: number
    rejected: number
  }
  bakerAttributed: {
    total: number
    accepted: number
    rejected: number
  }
  unallocated: {
    total: number
    accepted: number
    rejected: number
  }
  isReconciled: boolean
}

export interface CustomerEntity {
  id: string
  businessId: string
  name: string
  phone?: string | null
  address?: string | null
  customerType: CustomerType
  creditLimit: number | null
  status: 'ACTIVE' | 'INACTIVE'
  derivedBalance?: number
  isOverCreditLimit?: boolean
  salesCount?: number
  createdAt: string
}

export interface SaleInventoryAllocationEntity {
  id: string
  saleItemId: string
  finishedInventoryLotId: string
  quantity: number
  unitCostSnapshot: number
  totalCost: number
}

export interface SaleItemEntity {
  id: string
  saleId: string
  productId: string
  productName?: string
  productCode?: string
  productSize?: string | null
  quantity: number
  unitPrice: number
  discount: number
  totalAmount: number
  unitCostSnapshot: number
  totalCOGS: number
  allocations?: SaleInventoryAllocationEntity[]
}

export interface PaymentEntity {
  id: string
  businessId: string
  customerId?: string | null
  customerName?: string | null
  saleId?: string | null
  saleNumber?: string | null
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  referenceNumber?: string | null
  receivedById: string
  status: 'PENDING' | 'COMPLETED' | 'REVERSED' | 'CANCELLED'
}

export interface SaleEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  customerId?: string | null
  customerName?: string | null
  customerPhone?: string | null
  saleNumber: string
  saleDate: string
  subtotal: number
  discount: number
  totalAmount: number
  paymentStatus: PaymentStatus
  saleStatus: SaleStatus
  items?: SaleItemEntity[]
  payments?: PaymentEntity[]
  totalCOGS?: number
  grossProfit?: number
  grossMarginPercent?: number
  createdById: string
}

export interface CustomerLedgerEntryEntity {
  id: string
  businessId: string
  customerId: string
  transactionType: LedgerTransactionType
  referenceType: string
  referenceId: string
  debit: number
  credit: number
  runningBalance?: number
  transactionDate: string
  description?: string | null
  createdById: string
}

export interface CustomerStatementReport {
  customer: CustomerEntity & { currentBalance: number }
  entries: CustomerLedgerEntryEntity[]
}

export interface DeliveryItemEntity {
  id: string
  deliveryId: string
  productId: string
  productName?: string
  productCode?: string
  quantity: number
  deliveredQuantity: number
}

export interface DeliveryEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  customerId: string
  customerName?: string
  customerPhone?: string | null
  deliveryAddress?: string | null
  saleId?: string | null
  deliveryEmployeeId: string
  driverName?: string
  deliveryDate: string
  status: DeliveryStatus
  notes?: string | null
  items?: DeliveryItemEntity[]
}

export interface ExpenseCategoryEntity {
  id: string
  businessId: string
  name: string
  categoryType: ExpenseCategoryType
  isActive: boolean
}

export interface ExpenseEntity {
  id: string
  businessId: string
  branchId: string
  branch?: BranchEntity
  branchName?: string
  categoryId: string
  category?: ExpenseCategoryEntity
  categoryName?: string
  categoryType?: string
  amount: number
  expenseDate: string
  paymentMethod: PaymentMethod
  referenceNumber?: string | null
  description?: string | null
  status: ExpenseStatus
  createdAt: string
}

export interface DepartmentEntity {
  id: string
  businessId: string
  name: string
  description?: string | null
  isActive: boolean
}

export interface JobPositionEntity {
  id: string
  businessId: string
  name: string
  departmentId?: string | null
  departmentName?: string | null
  description?: string | null
  isActive: boolean
}

export interface EmployeeEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  positionId: string
  positionName?: string
  userId?: string | null
  employeeNumber: string
  firstName: string
  lastName: string
  phone?: string | null
  address?: string | null
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'TEMPORARY' | 'CONTRACT'
  hireDate: string
  terminationDate?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
  createdAt: string
  updatedAt: string
}

export interface ShiftEntity {
  id: string
  businessId: string
  branchId: string
  name: string
  shiftType: 'DAY' | 'NIGHT' | 'CUSTOM'
  startTime: string
  endTime: string
  crossesMidnight: boolean
  breakMinutes: number
  isActive: boolean
  createdAt: string
}

export interface ShiftAssignmentEntity {
  id: string
  businessId: string
  branchId: string
  employeeId: string
  shiftId: string
  scheduledStart: string
  scheduledEnd: string
  assignedById?: string | null
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED'
  createdAt: string
}

export interface AttendanceRecordEntity {
  id: string
  businessId: string
  branchId: string
  employeeId: string
  shiftAssignmentId?: string | null
  operationalDate: string
  clockIn?: string | null
  clockOut?: string | null
  breakMinutes: number
  overtimeMinutes: number
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'LEAVE'
  notes?: string | null
  totalWorkingMinutes?: number
  recordedById?: string | null
  createdAt: string
  updatedAt: string
}

export interface LeaveRecordEntity {
  id: string
  businessId: string
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  reason?: string | null
  status: string
  approvedById?: string | null
}

export interface HeadcountReport {
  totalEmployees: number
  activeHeadcount: number
  inactiveCount: number
  terminatedCount: number
  byBranch: { branchId: string; branchName: string; activeCount: number }[]
  byPosition: { positionId: string; positionName: string; activeCount: number }[]
  byDepartment: { departmentId: string; departmentName: string; activeCount: number }[]
  byEmploymentType: {
    FULL_TIME: number
    PART_TIME: number
    CONTRACT: number
    TEMPORARY: number
  }
}

// ==========================================
// Milestone 6: Costing & Labour Cost Types
// ==========================================

import type { CompensationType, OverheadCategory, OverheadAllocationType } from './enums'

export type LabourCostStatus = 'UNALLOCATED' | 'ALLOCATED' | 'FINALIZED'

export interface EmployeeCompensationEntity {
  id: string
  businessId: string
  employeeId: string
  employeeName?: string
  employeeNumber?: string
  compensationType: CompensationType
  baseRate: number
  pieceRatePerInjera?: number | null
  effectiveFrom: string
  effectiveTo?: string | null
  notes?: string | null
  createdAt: string
}

export interface OverheadAllocationEntity {
  id: string
  businessId: string
  overheadRecordId: string
  productionBatchId: string
  batchNumber?: string
  allocatedAmount: number
  allocationBasis: string
  createdAt: string
}

export interface OverheadRecordEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  productionBatchId?: string | null
  batchNumber?: string | null
  operationalDate: string
  category: OverheadCategory
  amount: number
  paymentMethod?: PaymentMethod | null
  allocationType: OverheadAllocationType
  description?: string | null
  sourceReference?: string | null
  createdById?: string | null
  createdAt: string
  allocations?: OverheadAllocationEntity[]
  allocatedAmount?: number
  remainingUnallocated?: number
}

export interface LabourAllocationEntity {
  id: string
  businessId: string
  labourCostRecordId: string
  productionBatchId: string
  batchNumber?: string
  allocatedCost: number
  allocationBasis: string
  createdAt: string
}

export interface LabourCostRecordEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  employeeId: string
  employeeName?: string
  employeeNumber?: string
  attendanceRecordId?: string | null
  operationalDate: string
  workedMinutes: number
  compensationTypeSnapshot: CompensationType
  rateSnapshot: number
  totalLabourCost: number
  status: LabourCostStatus
  createdAt: string
  allocations?: LabourAllocationEntity[]
  allocatedCost?: number
  remainingUnallocated?: number
}

export interface ProductionCostRecordEntity {
  id: string
  businessId: string
  productionBatchId: string
  batchNumber?: string
  rawMaterialCost: number
  directOverheadCost: number
  allocatedOverheadCost: number
  allocatedLabourCost: number
  totalBatchCost: number
  acceptedQuantity: number
  costPerAcceptedUnit: number
  calculationVersion: number
  calculatedAt: string
  finalizedAt?: string | null
  createdAt: string
}

export interface BatchCostingDetail {
  batch: {
    id: string
    batchNumber: string
    status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    acceptedQuantity: number
    rejectedQuantity: number
    totalQuantity: number
    productionDate: string
    sessionId: string
    sessionNumber?: string
    recipeId: string
    recipeName?: string
  }
  costSummary: {
    rawMaterialCost: number
    directOverheadCost: number
    allocatedOverheadCost: number
    allocatedLabourCost: number
    totalBatchCost: number
    acceptedQuantity: number
    costPerAcceptedUnit: number
    isFinalized: boolean
    finalizedAt?: string | null
    calculationVersion: number
  }
  breakdown: {
    materials: {
      lotId: string
      materialName: string
      lotNumber: string
      quantityUsed: number
      unitPrice: number
      materialCost: number
    }[]
    directOverheads: OverheadRecordEntity[]
    allocatedOverheads: (OverheadAllocationEntity & { category: OverheadCategory; operationalDate: string })[]
    allocatedLabour: (LabourAllocationEntity & { employeeName: string; compensationType: CompensationType })[]
  }
  history: ProductionCostRecordEntity[]
}

export interface UnitCostTrendItem {
  batchId: string
  batchNumber: string
  productionDate: string
  recipeId: string
  recipeName: string
  acceptedQuantity: number
  rejectedQuantity: number
  rejectionRatePercent: number
  rawMaterialCost: number
  directOverheadCost: number
  allocatedOverheadCost: number
  allocatedLabourCost: number
  totalBatchCost: number
  costPerAcceptedUnit: number
  finalizedAt: string
}

// Milestone 7: Inventory Management Types
export interface StockLocationEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type FinishedLotStatus = 'AVAILABLE' | 'DEPLETED' | 'BLOCKED' | 'EXPIRED'

export type FinishedMovementType =
  | 'PRODUCTION_IN'
  | 'SALE_OUT'
  | 'DAMAGE_OUT'
  | 'SPOILAGE_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'

export interface FinishedStockMovementEntity {
  id: string
  finishedInventoryLotId: string
  movementType: FinishedMovementType
  quantity: number
  unitCostSnapshot: number
  totalCost: number
  reason?: string | null
  referenceId?: string | null
  notes?: string | null
  createdAt: string
}

export interface FinishedInventoryLotEntity {
  id: string
  businessId: string
  branchId: string
  branchName?: string
  productId: string
  productName?: string
  productCode?: string
  productSize?: string | null
  productionBatchId?: string | null
  batchNumber?: string | null
  stockLocationId: string
  locationName?: string
  productionDate: string
  expiryAt?: string | null
  originalQuantity: number
  remainingQuantity: number
  unitCost: number
  status: FinishedLotStatus
  fifoSequence?: number
  hoursOld?: number
  hoursToExpiry?: number | null
  isExpiringSoon?: boolean
  isExpired?: boolean
  movements?: FinishedStockMovementEntity[]
  createdAt: string
  updatedAt: string
}

export interface RawMaterialStockSummary {
  materialId: string
  materialName: string
  materialCode: string
  unitSymbol: string
  categoryName?: string | null
  minimumStock: number
  totalRemainingQuantity: number
  isLowStock: boolean
  averageUnitCost: number
  totalStockValuation: number
  lotsCount: number
}

export interface LotReconciliationReport {
  lotId: string
  originalQuantity: number
  remainingQuantity: number
  totalIn: number
  totalOut: number
  calculatedBalance: number
  reconciles: boolean
  movements: FinishedStockMovementEntity[]
}

// Milestone 9: Reporting, Analytics & Customizable Dashboard Types
export interface FinancialReportResult {
  period: {
    startDate: string | null
    endDate: string | null
    branchId: string | null
  }
  profitability: {
    totalSalesCount: number
    grossSales: number
    totalDiscounts: number
    revenue: number
    cogs: number
    grossProfit: number
    grossMarginPercent: number
    operatingExpenses: number
    expensesByCategory: Record<string, number>
    netOperatingProfit: number
    netOperatingMarginPercent: number
  }
  cashFlowAndCredit: {
    cashCollected: number
    accountsReceivable: number
    customersWithDebtCount: number
  }
  productionOutput: {
    totalBatchesCount: number
    totalAcceptedProduced: number
    totalProductionCost: number
    averageProductionCostPerUnit: number
  }
}

export interface BakerProductivityReportItem {
  employeeId: string
  employeeName: string
  employeeNumber: string
  recordCount: number
  totalQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  rejectionRatePercent: number
  yieldPercent: number
}

export interface InventoryValuationReportResult {
  totalInventoryValuation: number
  rawMaterials: {
    totalValuation: number
    materials: {
      materialId: string
      materialName: string
      totalRemainingQuantity: number
      totalValuation: number
    }[]
  }
  finishedGoods: {
    totalValuation: number
    products: {
      productId: string
      productName: string
      totalRemainingQuantity: number
      totalValuation: number
    }[]
  }
}

export interface DashboardSummaryResult {
  today: {
    revenue: number
    orderCount: number
  }
  currentMonth: {
    revenue: number
    orderCount: number
    operatingExpenses: number
  }
  operations: {
    activeBatchesCount: number
    pendingDeliveriesCount: number
    activeCustomersCount: number
    totalReceivables: number
  }
  sevenDayRevenue?: {
    day: string
    date: string
    revenue: number
    orderCount: number
  }[]
  qualityBreakdown?: {
    totalProduced: number
    acceptedProduced: number
    rejectedProduced: number
    yieldPercent: number
    defects: {
      reason: string
      count: number
      percent: number
    }[]
  }
  grainStock?: {
    totalStockKg: number
    materials: {
      materialId: string
      materialName: string
      remainingKg: number
      percentage: number
    }[]
  }
  topBakers?: {
    employeeId: string
    name: string
    acceptedCount: number
    speed: string
    yieldPercent: number
  }[]
}

export interface DashboardWidgetEntity {
  id: string
  dashboardLayoutId: string
  widgetType: string
  title: string
  positionX: number
  positionY: number
  width: number
  height: number
  configuration: Record<string, unknown>
  createdAt: string
}

export interface DashboardLayoutEntity {
  id: string
  businessId: string
  userId: string
  name: string
  isDefault: boolean
  widgetCount?: number
  widgets?: DashboardWidgetEntity[]
  createdAt: string
  updatedAt: string
}

// Milestone 10: Offline PWA & Synchronization Engine Types

export interface SyncOperationEnvelopeEntity {
  id: string
  deviceId: string
  actorId?: string
  idempotencyKey: string
  operationType: string
  schemaVersion: number
  payload: Record<string, unknown>
  clientTimestamp: string
  operationalDate?: string | null
  syncStatus: SyncStatus
  serverProcessedAt?: string | null
  errorDetails?: Record<string, unknown> | null
  createdAt?: string
}

export interface SyncConflictEntity {
  id: string
  businessId: string
  syncOperationId: string
  conflictType: string
  description?: string | null
  serverState: Record<string, unknown>
  submittedState: Record<string, unknown>
  status: ConflictStatus
  resolution?: Record<string, unknown> | null
  resolvedById?: string | null
  resolvedAt?: string | null
}

export interface SyncBatchResult {
  total: number
  processed: number
  conflicts: number
  failed: number
  results: {
    idempotencyKey: string
    operationType: string
    status: SyncStatus
    idempotent?: boolean
    operationId: string
    conflictId?: string
    message?: string
    data?: Record<string, unknown>
  }[]
}

export interface SystemStatusResult {
  health: 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE'
  database: {
    status: 'CONNECTED' | 'DISCONNECTED'
    latencyMs: number
    provider: string
    poolStatus: string
  }
  runtime: {
    uptimeSeconds: number
    uptimeFormatted: string
    platform: string
    nodeVersion: string
    environment: string
    architecture: string
  }
  memory: {
    heapUsedMb: number
    heapTotalMb: number
    rssMb: number
    externalMb: number
    usagePercent: number
  }
  syncEngine: {
    pendingOperations: number
    openConflicts: number
    status: 'SYNCHRONIZING' | 'SYNCHRONIZED'
    autoSyncIntervalSeconds: number
  }
  security: {
    activeUserSessions: number
    registeredDevices: number
    cookieMode: string
    sessionDurationMinutes: number
  }
  business: {
    id: string
    name: string
    status: string
  }
  timestamp: string
}

export interface SystemSettingsEntity {
  businessId: string
  employeeNumberPrefix: string
  minQualityYieldPercent: number
  tokenSessionDurationMinutes: number
  maintenanceMode: boolean
  autoSyncIntervalSeconds: number
  enforceShiftClockInGraceMinutes: number
  allowOfflineTransactions: boolean
  currency: string
  timezone: string
  dateCalendar: 'GREGORIAN' | 'ETHIOPIAN'
  updatedAt: string
}

export interface UpdateSystemSettingsInput {
  employeeNumberPrefix?: string
  minQualityYieldPercent?: number
  tokenSessionDurationMinutes?: number
  maintenanceMode?: boolean
  autoSyncIntervalSeconds?: number
  enforceShiftClockInGraceMinutes?: number
  allowOfflineTransactions?: boolean
  currency?: string
  timezone?: string
  dateCalendar?: 'GREGORIAN' | 'ETHIOPIAN'
}

export interface AuditLogEntity {
  id: string
  businessId: string
  actorId?: string | null
  action: string
  entityType: string
  entityId: string
  beforeData?: Record<string, unknown> | null
  afterData?: Record<string, unknown> | null
  reason?: string | null
  source: 'WEB' | 'MOBILE' | 'OFFLINE_SYNC' | 'SYSTEM'
  occurredAt: string
  actor?: {
    id: string
    name: string
    email: string
  }
}

export interface AuditLogListResponse {
  data: AuditLogEntity[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}





