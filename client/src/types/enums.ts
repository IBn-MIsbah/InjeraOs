// Domain Enums matching server contracts and InjeraOS business model

export const Calendar = {
  GREGORIAN: 'GREGORIAN',
  ETHIOPIAN: 'ETHIOPIAN',
} as const
export type Calendar = (typeof Calendar)[keyof typeof Calendar]

export const BusinessStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
} as const
export type BusinessStatus = (typeof BusinessStatus)[keyof typeof BusinessStatus]

export const ActiveStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const
export type ActiveStatus = (typeof ActiveStatus)[keyof typeof ActiveStatus]

export const MembershipStatus = {
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const
export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus]

export const EmploymentType = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  TEMPORARY: 'TEMPORARY',
  CONTRACT: 'CONTRACT',
} as const
export type EmploymentType = (typeof EmploymentType)[keyof typeof EmploymentType]

export const EmployeeStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  TERMINATED: 'TERMINATED',
} as const
export type EmployeeStatus = (typeof EmployeeStatus)[keyof typeof EmployeeStatus]

export const ShiftType = {
  DAY: 'DAY',
  NIGHT: 'NIGHT',
  CUSTOM: 'CUSTOM',
} as const
export type ShiftType = (typeof ShiftType)[keyof typeof ShiftType]

export const AssignmentStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus]

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  LEAVE: 'LEAVE',
  HALF_DAY: 'HALF_DAY',
} as const
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus]

export const CompensationType = {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
  PER_SHIFT: 'PER_SHIFT',
  MONTHLY: 'MONTHLY',
} as const
export type CompensationType = (typeof CompensationType)[keyof typeof CompensationType]

export const Dimension = {
  MASS: 'MASS',
  VOLUME: 'VOLUME',
  COUNT: 'COUNT',
  OTHER: 'OTHER',
} as const
export type Dimension = (typeof Dimension)[keyof typeof Dimension]

export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const DocumentStatus = {
  DRAFT: 'DRAFT',
  RECEIVED: 'RECEIVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus]

export const LotStatus = {
  AVAILABLE: 'AVAILABLE',
  DEPLETED: 'DEPLETED',
  BLOCKED: 'BLOCKED',
  EXPIRED: 'EXPIRED',
} as const
export type LotStatus = (typeof LotStatus)[keyof typeof LotStatus]

export const MaterialMovementType = {
  PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
  PRODUCTION_CONSUMPTION: 'PRODUCTION_CONSUMPTION',
  BLEND_INPUT: 'BLEND_INPUT',
  BLEND_OUTPUT: 'BLEND_OUTPUT',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  REVERSAL: 'REVERSAL',
} as const
export type MaterialMovementType = (typeof MaterialMovementType)[keyof typeof MaterialMovementType]

export const ProductionStatus = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const
export type ProductionStatus = (typeof ProductionStatus)[keyof typeof ProductionStatus]

export const BatchAssignmentRole = {
  BAKER: 'BAKER',
  LABOURER: 'LABOURER',
  SUPERVISOR: 'SUPERVISOR',
  OTHER: 'OTHER',
} as const
export type BatchAssignmentRole = (typeof BatchAssignmentRole)[keyof typeof BatchAssignmentRole]

export const RejectionReason = {
  BURNT: 'BURNT',
  TORN_DAMAGED: 'TORN_DAMAGED',
  INCORRECT_THICKNESS: 'INCORRECT_THICKNESS',
  INCORRECT_SIZE: 'INCORRECT_SIZE',
  CONTAMINATION: 'CONTAMINATION',
  OTHER: 'OTHER',
} as const
export type RejectionReason = (typeof RejectionReason)[keyof typeof RejectionReason]

export const OverheadCategory = {
  LABOUR: 'LABOUR',
  FUEL: 'FUEL',
  FIREWOOD: 'FIREWOOD',
  ELECTRICITY: 'ELECTRICITY',
  WATER: 'WATER',
  PACKAGING: 'PACKAGING',
  OTHER: 'OTHER',
} as const
export type OverheadCategory = (typeof OverheadCategory)[keyof typeof OverheadCategory]

export const OverheadAllocationType = {
  DIRECT_BATCH: 'DIRECT_BATCH',
  DAILY_SHARED: 'DAILY_SHARED',
} as const
export type OverheadAllocationType = (typeof OverheadAllocationType)[keyof typeof OverheadAllocationType]

export const AllocationMethod = {
  PRODUCTION_QUANTITY: 'PRODUCTION_QUANTITY',
  PRODUCTION_TIME: 'PRODUCTION_TIME',
  DIRECT_MATERIAL_COST: 'DIRECT_MATERIAL_COST',
  MANUAL_PERCENTAGE: 'MANUAL_PERCENTAGE',
} as const
export type AllocationMethod = (typeof AllocationMethod)[keyof typeof AllocationMethod]

export const CustomerType = {
  INDIVIDUAL: 'INDIVIDUAL',
  GROCERY_SHOP: 'GROCERY_SHOP',
  RESTAURANT: 'RESTAURANT',
  HOTEL: 'HOTEL',
  WHOLESALER: 'WHOLESALER',
  OTHER: 'OTHER',
} as const
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType]

export const SaleStatus = {
  DRAFT: 'DRAFT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus]

export const PaymentMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  MOBILE_MONEY: 'MOBILE_MONEY',
  OTHER: 'OTHER',
} as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

export const PaymentRecordStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  REVERSED: 'REVERSED',
  CANCELLED: 'CANCELLED',
} as const
export type PaymentRecordStatus = (typeof PaymentRecordStatus)[keyof typeof PaymentRecordStatus]

export const LedgerTransactionType = {
  SALE: 'SALE',
  PAYMENT: 'PAYMENT',
  ADJUSTMENT: 'ADJUSTMENT',
  REVERSAL: 'REVERSAL',
} as const
export type LedgerTransactionType = (typeof LedgerTransactionType)[keyof typeof LedgerTransactionType]

export const DeliveryStatus = {
  PENDING: 'PENDING',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus]

export const ExpenseCategoryType = {
  OPERATING: 'OPERATING',
  ADMINISTRATIVE: 'ADMINISTRATIVE',
  MARKETING: 'MARKETING',
  TRANSPORT: 'TRANSPORT',
  MAINTENANCE: 'MAINTENANCE',
  OTHER: 'OTHER',
} as const
export type ExpenseCategoryType = (typeof ExpenseCategoryType)[keyof typeof ExpenseCategoryType]

export const ExpenseStatus = {
  DRAFT: 'DRAFT',
  RECORDED: 'RECORDED',
  CANCELLED: 'CANCELLED',
} as const
export type ExpenseStatus = (typeof ExpenseStatus)[keyof typeof ExpenseStatus]

export const DeviceStatus = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
} as const
export type DeviceStatus = (typeof DeviceStatus)[keyof typeof DeviceStatus]

export const SyncStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  CONFLICT: 'CONFLICT',
} as const
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus]

export const ConflictStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const
export type ConflictStatus = (typeof ConflictStatus)[keyof typeof ConflictStatus]

export const AuditSource = {
  WEB: 'WEB',
  MOBILE: 'MOBILE',
  OFFLINE_SYNC: 'OFFLINE_SYNC',
  SYSTEM: 'SYSTEM',
} as const
export type AuditSource = (typeof AuditSource)[keyof typeof AuditSource]

// Standard User Roles for Injera Commerce (InjeraOS)
export const AppRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  PRODUCTION_SUPERVISOR: 'PRODUCTION_SUPERVISOR',
  BAKER: 'BAKER',
  INVENTORY_CLERK: 'INVENTORY_CLERK',
  SALES_CASHIER: 'SALES_CASHIER',
  ACCOUNTANT: 'ACCOUNTANT',
} as const
export type AppRole = (typeof AppRole)[keyof typeof AppRole]

// Standard Granular Permissions
export const AppPermission = {
  USER_READ: 'user.read',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  ROLE_READ: 'role.read',
  ROLE_ASSIGN: 'role.assign',
  ROLE_MANAGE: 'role.manage',
  BUSINESS_MANAGE: 'business.manage',
  BRANCH_READ: 'branch.read',
  BRANCH_MANAGE: 'branch.manage',

  PRODUCT_READ: 'product.read',
  PRODUCT_MANAGE: 'product.manage',
  RECIPE_READ: 'recipe.read',
  RECIPE_MANAGE: 'recipe.manage',

  PRODUCTION_BATCH_READ: 'production.batch.read',
  PRODUCTION_BATCH_MANAGE: 'production.batch.manage',
  PRODUCTION_OUTPUT_RECORD: 'production.output.record',
  PRODUCTION_COST_READ: 'production.cost.read',

  INVENTORY_READ: 'inventory.read',
  INVENTORY_ADJUST: 'inventory.adjust',
  PURCHASE_READ: 'purchase.read',
  PURCHASE_MANAGE: 'purchase.manage',
  SUPPLIER_MANAGE: 'supplier.manage',

  SALE_READ: 'sale.read',
  SALE_CREATE: 'sale.create',
  SALE_CANCEL: 'sale.cancel',
  PAYMENT_RECORD: 'payment.record',
  CUSTOMER_READ: 'customer.read',
  CUSTOMER_MANAGE: 'customer.manage',
  DELIVERY_SCHEDULE: 'delivery.schedule',

  EXPENSE_READ: 'expense.read',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_MANAGE: 'expense.manage',
  LEDGER_READ: 'ledger.read',
  REPORT_READ: 'report.read',
} as const
export type AppPermission = (typeof AppPermission)[keyof typeof AppPermission]

export const ROLE_OPTIONS = [
  {
    value: AppRole.OWNER,
    label: 'Proprietor / Owner (ባለቤት)',
    description: 'Full unconstrained access to all branches, billing, and settings.',
  },
  {
    value: AppRole.ADMIN,
    label: 'General Manager (ዋና ስራ አስኪያጅ)',
    description: 'Complete operational and administrative control across all departments.',
  },
  {
    value: AppRole.BRANCH_MANAGER,
    label: 'Branch Manager (የቅርንጫፍ ስራ አስኪያጅ)',
    description: 'Manages baking shifts, inventory, local sales, and daily branch expenses.',
  },
  {
    value: AppRole.PRODUCTION_SUPERVISOR,
    label: 'Production Supervisor (የምርት ተቆጣጣሪ)',
    description: 'Oversees flour mixing, fermentation, baking batches, yields, and defect logging.',
  },
  {
    value: AppRole.BAKER,
    label: 'Baker / Operator (ጋጋሪ)',
    description: 'Logs stove batch counts, piece rates, and burnt or torn discards.',
  },
  {
    value: AppRole.INVENTORY_CLERK,
    label: 'Inventory & Silo Clerk (የዕቃ ግምጃ ቤት)',
    description: 'Receives grain shipments, logs firewood/gas purchases, and tracks stock levels.',
  },
  {
    value: AppRole.SALES_CASHIER,
    label: 'Sales Cashier / POS (ካሸር)',
    description: 'Handles walk-in sales, restaurant dispatches, and Telebirr/cash payments.',
  },
  {
    value: AppRole.ACCOUNTANT,
    label: 'Accountant & Auditor (ሒሳብ ሹም)',
    description: 'Reconciles daily ledgers, manages vendor debts, and reviews financial reports.',
  },
] as const

// Helper UI option lists for dropdowns and selects
export const PAYMENT_METHOD_OPTIONS = [
  { value: PaymentMethod.CASH, label: 'Cash' },
  { value: PaymentMethod.MOBILE_MONEY, label: 'Mobile Money (Telebirr / CBEBirr)' },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
  { value: PaymentMethod.OTHER, label: 'Other' },
] as const

export const CUSTOMER_TYPE_OPTIONS = [
  { value: CustomerType.INDIVIDUAL, label: 'Individual / Retail' },
  { value: CustomerType.RESTAURANT, label: 'Restaurant' },
  { value: CustomerType.HOTEL, label: 'Hotel' },
  { value: CustomerType.GROCERY_SHOP, label: 'Grocery / Mini-market' },
  { value: CustomerType.WHOLESALER, label: 'Wholesaler / Distributor' },
  { value: CustomerType.OTHER, label: 'Other' },
] as const

export const EXPENSE_CATEGORY_TYPE_OPTIONS = [
  { value: ExpenseCategoryType.OPERATING, label: 'Operating (Flour, Yeast, Fuel, Electricity)' },
  { value: ExpenseCategoryType.ADMINISTRATIVE, label: 'Administrative & Office' },
  { value: ExpenseCategoryType.TRANSPORT, label: 'Transport & Logistics' },
  { value: ExpenseCategoryType.MAINTENANCE, label: 'Mitad & Equipment Maintenance' },
  { value: ExpenseCategoryType.MARKETING, label: 'Marketing & Sales' },
  { value: ExpenseCategoryType.OTHER, label: 'Other Expenses' },
] as const

export const REJECTION_REASON_OPTIONS = [
  { value: RejectionReason.BURNT, label: 'Burnt (ከልክ በላይ የበሰለ)' },
  { value: RejectionReason.TORN_DAMAGED, label: 'Torn / Damaged (የተቀደደ)' },
  { value: RejectionReason.INCORRECT_THICKNESS, label: 'Incorrect Thickness (ቅጥነት/ውፍረት)' },
  { value: RejectionReason.INCORRECT_SIZE, label: 'Incorrect Size (መጠን ያልጠበቀ)' },
  { value: RejectionReason.CONTAMINATION, label: 'Contamination' },
  { value: RejectionReason.OTHER, label: 'Other Defect' },
] as const
