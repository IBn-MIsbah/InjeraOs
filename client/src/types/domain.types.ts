import type {
  Calendar,
  BusinessStatus,
  CustomerType,
  Dimension,
  ExpenseCategoryType,
  ExpenseStatus,
  PaymentMethod,
  PaymentStatus,
  ProductionStatus,
  RejectionReason,
  SaleStatus,
  DeliveryStatus,
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

export interface UnitOfMeasureEntity {
  id: string
  name: string
  code: string
  dimension: Dimension
}

export interface MaterialEntity {
  id: string
  businessId: string
  name: string
  code?: string | null
  categoryId?: string | null
  uomId: string
  uom?: UnitOfMeasureEntity
  minStockLevel: number
  reorderPoint: number
  costPerUnit: number
  isActive: boolean
  currentStock?: number
}

export interface FinishedProductEntity {
  id: string
  businessId: string
  name: string
  code?: string | null
  description?: string | null
  uomId: string
  uom?: UnitOfMeasureEntity
  unitPrice: number
  costPrice: number
  minStockLevel: number
  shelfLifeHours?: number | null
  isActive: boolean
}

export interface RecipeIngredientEntity {
  id: string
  recipeVersionId: string
  materialId: string
  material?: MaterialEntity
  quantity: number
  uomId: string
  uom?: UnitOfMeasureEntity
  wastagePercentage: number
}

export interface RecipeEntity {
  id: string
  businessId: string
  productId: string
  product?: FinishedProductEntity
  name: string
  description?: string | null
  yieldQuantity: number
  yieldUomId: string
  ingredients?: RecipeIngredientEntity[]
  createdAt: string
}

export interface ProductionBatchEntity {
  id: string
  businessId: string
  branchId: string
  branch?: BranchEntity
  recipeId: string
  recipe?: RecipeEntity
  batchNumber: string
  plannedQuantity: number
  scheduledDate: string
  status: ProductionStatus
  notes?: string | null
  goodQuantity?: number
  rejectedQuantity?: number
  createdAt: string
  updatedAt: string
}

export interface RejectionRecordEntity {
  id: string
  batchId: string
  quantity: number
  reason: RejectionReason
  notes?: string | null
  createdAt: string
}

export interface CustomerEntity {
  id: string
  businessId: string
  name: string
  customerType: CustomerType
  phone?: string | null
  email?: string | null
  address?: string | null
  creditLimit: number
  paymentTermsDays: number
  tinNumber?: string | null
  outstandingBalance?: number
  isActive: boolean
  createdAt: string
}

export interface SaleItemEntity {
  id: string
  saleId: string
  productId: string
  product?: FinishedProductEntity
  quantity: number
  unitPrice: number
  discountAmount: number
  lineTotal: number
}

export interface SaleEntity {
  id: string
  businessId: string
  branchId: string
  branch?: BranchEntity
  customerId?: string | null
  customer?: CustomerEntity | null
  receiptNumber: string
  saleDate: string
  status: SaleStatus
  paymentStatus: PaymentStatus
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  balanceDue: number
  notes?: string | null
  items?: SaleItemEntity[]
  createdAt: string
}

export interface PaymentEntity {
  id: string
  businessId: string
  branchId: string
  saleId?: string | null
  customerId?: string | null
  customer?: CustomerEntity | null
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  referenceNumber?: string | null
  notes?: string | null
  createdAt: string
}

export interface DeliveryEntity {
  id: string
  businessId: string
  saleId: string
  status: DeliveryStatus
  driverName?: string | null
  driverPhone?: string | null
  deliveryAddress: string
  recipientPhone?: string | null
  recipientName?: string | null
  scheduledDate: string
  completedAt?: string | null
  notes?: string | null
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
  categoryId: string
  category?: ExpenseCategoryEntity
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
