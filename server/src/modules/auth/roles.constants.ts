/**
 * System-wide standard roles for Injera Commerce (InjeraOS)
 */
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

/**
 * Metadata and descriptions for each standard role
 */
export const ROLE_DEFINITIONS: Record<
  AppRole,
  { name: string; description: string; isSystem: boolean }
> = {
  [AppRole.OWNER]: {
    name: 'OWNER',
    description: 'Proprietor with unconstrained access across all branches, financials, and configurations.',
    isSystem: true,
  },
  [AppRole.ADMIN]: {
    name: 'ADMIN',
    description: 'General operations manager with full administrative rights across business units.',
    isSystem: true,
  },
  [AppRole.BRANCH_MANAGER]: {
    name: 'BRANCH_MANAGER',
    description: 'Manages baking schedules, staff shifts, local sales, and daily branch overhead.',
    isSystem: true,
  },
  [AppRole.PRODUCTION_SUPERVISOR]: {
    name: 'PRODUCTION_SUPERVISOR',
    description: 'Oversees teff batter mixing, fermentation cycles, baking runs, QA yields, and defect logging.',
    isSystem: true,
  },
  [AppRole.BAKER]: {
    name: 'BAKER',
    description: 'Baking technician operating mitad stoves; logs batch counts, piece rates, and burnt/torn discards.',
    isSystem: true,
  },
  [AppRole.INVENTORY_CLERK]: {
    name: 'INVENTORY_CLERK',
    description: 'Handles raw teff flour, firewood/gas deliveries, vendor purchases, and stock reconciliations.',
    isSystem: true,
  },
  [AppRole.SALES_CASHIER]: {
    name: 'SALES_CASHIER',
    description: 'Point of sale operator handling walk-in orders, restaurant deliveries, and Telebirr/cash receipts.',
    isSystem: true,
  },
  [AppRole.ACCOUNTANT]: {
    name: 'ACCOUNTANT',
    description: 'Audits daily sales reconciliation, customer ledger credit, supplier payables, and operating expenses.',
    isSystem: true,
  },
}

/**
 * Standard granular permission codes
 */
export const AppPermission = {
  // Business & Administration
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

  // Product & Recipe Engineering
  PRODUCT_READ: 'product.read',
  PRODUCT_MANAGE: 'product.manage',
  RECIPE_READ: 'recipe.read',
  RECIPE_MANAGE: 'recipe.manage',

  // Production Operations
  PRODUCTION_BATCH_READ: 'production.batch.read',
  PRODUCTION_BATCH_MANAGE: 'production.batch.manage',
  PRODUCTION_OUTPUT_RECORD: 'production.output.record',
  PRODUCTION_COST_READ: 'production.cost.read',

  // Inventory & Procurement
  INVENTORY_READ: 'inventory.read',
  INVENTORY_ADJUST: 'inventory.adjust',
  PURCHASE_READ: 'purchase.read',
  PURCHASE_MANAGE: 'purchase.manage',
  SUPPLIER_MANAGE: 'supplier.manage',

  // Sales, POS, Customers & Delivery
  SALE_READ: 'sale.read',
  SALE_CREATE: 'sale.create',
  SALE_CANCEL: 'sale.cancel',
  PAYMENT_RECORD: 'payment.record',
  CUSTOMER_READ: 'customer.read',
  CUSTOMER_MANAGE: 'customer.manage',
  DELIVERY_SCHEDULE: 'delivery.schedule',

  // Finance, Expenses & Analytics
  EXPENSE_READ: 'expense.read',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_MANAGE: 'expense.manage',
  LEDGER_READ: 'ledger.read',
  REPORT_READ: 'report.read',
} as const

export type AppPermission = (typeof AppPermission)[keyof typeof AppPermission]

/**
 * Permission descriptions for auditing and seeding
 */
export const PERMISSION_DEFINITIONS: Record<AppPermission, string> = {
  [AppPermission.USER_READ]: 'View business team members and profiles',
  [AppPermission.USER_CREATE]: 'Invite or create new team members',
  [AppPermission.USER_UPDATE]: 'Modify team member details and statuses',
  [AppPermission.USER_DELETE]: 'Revoke or remove team member access',
  [AppPermission.ROLE_READ]: 'View roles and their assigned permissions',
  [AppPermission.ROLE_ASSIGN]: 'Assign or alter user membership roles',
  [AppPermission.ROLE_MANAGE]: 'Create or configure custom business roles',
  [AppPermission.BUSINESS_MANAGE]: 'Update business profile, tax ID, and calendar settings',
  [AppPermission.BRANCH_READ]: 'View bakery branches and stations',
  [AppPermission.BRANCH_MANAGE]: 'Create, modify, and configure branch locations',

  [AppPermission.PRODUCT_READ]: 'View units of measure, raw grains, and finished injera catalog',
  [AppPermission.PRODUCT_MANAGE]: 'Create and update products, materials, and pricing',
  [AppPermission.RECIPE_READ]: 'Inspect flour-to-water ratios, fermentation recipes, and yield metrics',
  [AppPermission.RECIPE_MANAGE]: 'Author and revise production recipes and ingredient bill-of-materials',

  [AppPermission.PRODUCTION_BATCH_READ]: 'View scheduled and in-progress bakery production batches',
  [AppPermission.PRODUCTION_BATCH_MANAGE]: 'Schedule, dispatch, and cancel production batches',
  [AppPermission.PRODUCTION_OUTPUT_RECORD]: 'Record baked unit yields, rejected piece counts, and mitad logs',
  [AppPermission.PRODUCTION_COST_READ]: 'View calculated batch costs, flour attribution, and unit economics',

  [AppPermission.INVENTORY_READ]: 'View raw grain silos, flour lots, stock movements, and balances',
  [AppPermission.INVENTORY_ADJUST]: 'Perform stock level reconciliations and scrap adjustments',
  [AppPermission.PURCHASE_READ]: 'View grain and fuel procurement orders',
  [AppPermission.PURCHASE_MANAGE]: 'Record inbound grain shipments, lot numbers, and vendor invoices',
  [AppPermission.SUPPLIER_MANAGE]: 'Manage grain mills, distributors, and supplier contacts',

  [AppPermission.SALE_READ]: 'View customer orders, sales receipts, and dispatch history',
  [AppPermission.SALE_CREATE]: 'Create point-of-sale orders and wholesale dispatch receipts',
  [AppPermission.SALE_CANCEL]: 'Void sales tickets or process returns',
  [AppPermission.PAYMENT_RECORD]: 'Record customer settlements (Cash, Telebirr, CBEBirr, Bank Transfer)',
  [AppPermission.CUSTOMER_READ]: 'View customer directory and outstanding ledger balances',
  [AppPermission.CUSTOMER_MANAGE]: 'Register new commercial customers, credit limits, and terms',
  [AppPermission.DELIVERY_SCHEDULE]: 'Assign drivers and dispatch delivery runs to restaurants/hotels',

  [AppPermission.EXPENSE_READ]: 'View operational and overhead expenses',
  [AppPermission.EXPENSE_CREATE]: 'Record daily expenses (fuel, firewood, electric tokens, maintenance)',
  [AppPermission.EXPENSE_MANAGE]: 'Configure expense categories and approve or void expenditures',
  [AppPermission.LEDGER_READ]: 'Audit customer ledger credit lines and receivables',
  [AppPermission.REPORT_READ]: 'Access production yield dashboards, profit & loss, and audit analytics',
}

/**
 * Standard matrix of permissions assigned to each role by default
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, readonly string[]> = {
  [AppRole.OWNER]: ['*'],

  [AppRole.ADMIN]: Object.values(AppPermission),

  [AppRole.BRANCH_MANAGER]: [
    AppPermission.USER_READ,
    AppPermission.BRANCH_READ,
    AppPermission.PRODUCT_READ,
    AppPermission.RECIPE_READ,
    AppPermission.PRODUCTION_BATCH_READ,
    AppPermission.PRODUCTION_BATCH_MANAGE,
    AppPermission.PRODUCTION_OUTPUT_RECORD,
    AppPermission.INVENTORY_READ,
    AppPermission.INVENTORY_ADJUST,
    AppPermission.PURCHASE_READ,
    AppPermission.SALE_READ,
    AppPermission.SALE_CREATE,
    AppPermission.PAYMENT_RECORD,
    AppPermission.CUSTOMER_READ,
    AppPermission.CUSTOMER_MANAGE,
    AppPermission.DELIVERY_SCHEDULE,
    AppPermission.EXPENSE_READ,
    AppPermission.EXPENSE_CREATE,
    AppPermission.REPORT_READ,
  ],

  [AppRole.PRODUCTION_SUPERVISOR]: [
    AppPermission.PRODUCT_READ,
    AppPermission.RECIPE_READ,
    AppPermission.RECIPE_MANAGE,
    AppPermission.PRODUCTION_BATCH_READ,
    AppPermission.PRODUCTION_BATCH_MANAGE,
    AppPermission.PRODUCTION_OUTPUT_RECORD,
    AppPermission.PRODUCTION_COST_READ,
    AppPermission.INVENTORY_READ,
  ],

  [AppRole.BAKER]: [
    AppPermission.PRODUCTION_BATCH_READ,
    AppPermission.PRODUCTION_OUTPUT_RECORD,
  ],

  [AppRole.INVENTORY_CLERK]: [
    AppPermission.PRODUCT_READ,
    AppPermission.PRODUCT_MANAGE,
    AppPermission.INVENTORY_READ,
    AppPermission.INVENTORY_ADJUST,
    AppPermission.PURCHASE_READ,
    AppPermission.PURCHASE_MANAGE,
    AppPermission.SUPPLIER_MANAGE,
  ],

  [AppRole.SALES_CASHIER]: [
    AppPermission.PRODUCT_READ,
    AppPermission.CUSTOMER_READ,
    AppPermission.CUSTOMER_MANAGE,
    AppPermission.SALE_READ,
    AppPermission.SALE_CREATE,
    AppPermission.PAYMENT_RECORD,
    AppPermission.DELIVERY_SCHEDULE,
  ],

  [AppRole.ACCOUNTANT]: [
    AppPermission.SALE_READ,
    AppPermission.PAYMENT_RECORD,
    AppPermission.CUSTOMER_READ,
    AppPermission.LEDGER_READ,
    AppPermission.PURCHASE_READ,
    AppPermission.EXPENSE_READ,
    AppPermission.EXPENSE_CREATE,
    AppPermission.EXPENSE_MANAGE,
    AppPermission.REPORT_READ,
    AppPermission.PRODUCTION_COST_READ,
  ],
}
