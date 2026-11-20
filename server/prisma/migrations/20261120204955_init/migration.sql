-- CreateEnum
CREATE TYPE "Calendar" AS ENUM ('GREGORIAN', 'ETHIOPIAN');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'TEMPORARY', 'CONTRACT');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('DAY', 'NIGHT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('HOURLY', 'DAILY', 'PER_SHIFT', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AttributionMethod" AS ENUM ('INDIVIDUAL_COUNT', 'SUPERVISOR_ALLOCATION');

-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('MASS', 'VOLUME', 'COUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'RECEIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('AVAILABLE', 'DEPLETED', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MaterialMovementType" AS ENUM ('PURCHASE_RECEIPT', 'PRODUCTION_CONSUMPTION', 'BLEND_INPUT', 'BLEND_OUTPUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BatchAssignmentRole" AS ENUM ('BAKER', 'LABOURER', 'SUPERVISOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RejectionReason" AS ENUM ('BURNT', 'TORN_DAMAGED', 'INCORRECT_THICKNESS', 'INCORRECT_SIZE', 'CONTAMINATION', 'OTHER');

-- CreateEnum
CREATE TYPE "OverheadCategory" AS ENUM ('LABOUR', 'FUEL', 'FIREWOOD', 'ELECTRICITY', 'WATER', 'PACKAGING', 'OTHER');

-- CreateEnum
CREATE TYPE "OverheadAllocationType" AS ENUM ('DIRECT_BATCH', 'DAILY_SHARED');

-- CreateEnum
CREATE TYPE "AllocationMethod" AS ENUM ('PRODUCTION_QUANTITY', 'PRODUCTION_TIME', 'DIRECT_MATERIAL_COST', 'MANUAL_PERCENTAGE');

-- CreateEnum
CREATE TYPE "LabourCostStatus" AS ENUM ('UNALLOCATED', 'ALLOCATED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "FinishedMovementType" AS ENUM ('PRODUCTION_IN', 'SALE_OUT', 'DAMAGE_OUT', 'SPOILAGE_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'GROCERY_SHOP', 'RESTAURANT', 'HOTEL', 'WHOLESALER', 'OTHER');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('PENDING', 'COMPLETED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerTransactionType" AS ENUM ('SALE', 'PAYMENT', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseCategoryType" AS ENUM ('OPERATING', 'ADMINISTRATIVE', 'MARKETING', 'TRANSPORT', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'RECORDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('WEB', 'MOBILE', 'OFFLINE_SYNC', 'SYSTEM');

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "legalName" VARCHAR(200),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "address" TEXT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "timezone" VARCHAR(100) NOT NULL,
    "dateCalendar" "Calendar" NOT NULL DEFAULT 'GREGORIAN',
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(30),
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "password_hash" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_memberships" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "businessId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_branch_access" (
    "id" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "branchId" UUID NOT NULL,

    CONSTRAINT "membership_branch_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_positions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "departmentId" UUID,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "job_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "userId" UUID,
    "employeeNumber" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "address" TEXT,
    "positionId" UUID NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "hireDate" DATE NOT NULL,
    "terminationDate" DATE,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "startTime" TIME(6) NOT NULL,
    "endTime" TIME(6) NOT NULL,
    "crossesMidnight" BOOLEAN NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "scheduledStart" TIMESTAMPTZ(6) NOT NULL,
    "scheduledEnd" TIMESTAMPTZ(6) NOT NULL,
    "assignedById" UUID,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "shiftAssignmentId" UUID,
    "operationalDate" DATE NOT NULL,
    "clockIn" TIMESTAMPTZ(6),
    "clockOut" TIMESTAMPTZ(6),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "recordedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_compensations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "compensationType" "CompensationType" NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_records" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "leaveType" VARCHAR(50) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(30) NOT NULL,
    "approvedById" UUID,

    CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_categories" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units_of_measure" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "isBaseUnit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "defaultUnitId" UUID NOT NULL,
    "minimumStock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_varieties" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "material_varieties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30),
    "address" TEXT,
    "contactPerson" VARCHAR(150),
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "purchaseNumber" VARCHAR(50) NOT NULL,
    "purchaseDate" TIMESTAMPTZ(6) NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "acquisitionCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "varietyId" UUID,
    "grossQuantity" DECIMAL(18,4) NOT NULL,
    "tareQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unusableQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "usableQuantity" DECIMAL(18,4) NOT NULL,
    "unitId" UUID NOT NULL,
    "purchaseCost" DECIMAL(18,4) NOT NULL,
    "allocatedAcquisitionCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_lots" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "varietyId" UUID,
    "purchaseItemId" UUID,
    "blendOperationId" UUID,
    "lotNumber" VARCHAR(100) NOT NULL,
    "originalQuantity" DECIMAL(18,4) NOT NULL,
    "remainingQuantity" DECIMAL(18,4) NOT NULL,
    "unitId" UUID NOT NULL,
    "totalAcquisitionCost" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL,
    "expiryDate" DATE,
    "status" "LotStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "material_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_lot_movements" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "materialLotId" UUID NOT NULL,
    "movementType" "MaterialMovementType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCostSnapshot" DECIMAL(18,4) NOT NULL,
    "totalCost" DECIMAL(18,4) NOT NULL,
    "referenceType" VARCHAR(50) NOT NULL,
    "referenceId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "material_lot_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finished_products" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "productCode" VARCHAR(50) NOT NULL,
    "size" VARCHAR(100),
    "unitId" UUID NOT NULL,
    "defaultSellingPrice" DECIMAL(18,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "finished_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "productId" UUID NOT NULL,
    "description" TEXT,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_versions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "referenceBatchQuantity" DECIMAL(18,4) NOT NULL,
    "expectedYield" DECIMAL(18,4) NOT NULL,
    "instructions" TEXT,
    "effectiveFrom" DATE NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "recipeVersionId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "varietyId" UUID,
    "expectedQuantity" DECIMAL(18,4) NOT NULL,
    "unitId" UUID NOT NULL,
    "notes" TEXT,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blend_operations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "operationNumber" VARCHAR(50) NOT NULL,
    "operationDate" TIMESTAMPTZ(6) NOT NULL,
    "outputQuantity" DECIMAL(18,4) NOT NULL,
    "processingLoss" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "processingCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,

    CONSTRAINT "blend_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blend_inputs" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "blendOperationId" UUID NOT NULL,
    "materialLotId" UUID NOT NULL,
    "quantityConsumed" DECIMAL(18,4) NOT NULL,
    "unitCostSnapshot" DECIMAL(18,4) NOT NULL,
    "totalCost" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "blend_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blend_outputs" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "blendOperationId" UUID NOT NULL,
    "materialLotId" UUID NOT NULL,
    "outputQuantity" DECIMAL(18,4) NOT NULL,
    "totalCost" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "blend_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_sessions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "sessionNumber" VARCHAR(50) NOT NULL,
    "operationalDate" DATE NOT NULL,
    "startTime" TIMESTAMPTZ(6) NOT NULL,
    "endTime" TIMESTAMPTZ(6),
    "shiftAssignmentId" UUID,
    "supervisorId" UUID NOT NULL,
    "status" "ProductionStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batches" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productionSessionId" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "recipeVersionId" UUID NOT NULL,
    "batchNumber" VARCHAR(50) NOT NULL,
    "plannedQuantity" DECIMAL(18,4) NOT NULL,
    "actualOutput" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "acceptedOutput" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "rejectedOutput" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "startTime" TIMESTAMPTZ(6),
    "endTime" TIMESTAMPTZ(6),
    "status" "ProductionStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMPTZ(6),
    "finalizedById" UUID,

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_employee_assignments" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productionBatchId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "assignmentRole" "BatchAssignmentRole" NOT NULL,
    "assignedStart" TIMESTAMPTZ(6) NOT NULL,
    "assignedEnd" TIMESTAMPTZ(6),
    "notes" TEXT,

    CONSTRAINT "batch_employee_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_consumptions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productionBatchId" UUID NOT NULL,
    "materialLotId" UUID NOT NULL,
    "actualQuantity" DECIMAL(18,4) NOT NULL,
    "unitId" UUID NOT NULL,
    "unitCostSnapshot" DECIMAL(18,4) NOT NULL,
    "totalCost" DECIMAL(18,4) NOT NULL,
    "consumedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "material_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_outputs" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productionBatchId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "acceptedQuantity" INTEGER NOT NULL,
    "rejectedQuantity" INTEGER NOT NULL,
    "allocationMethod" "AllocationMethod" NOT NULL,
    "allocatedCost" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "production_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rejection_records" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productionBatchId" UUID NOT NULL,
    "productionOutputId" UUID,
    "employeeId" UUID,
    "reason" "RejectionReason" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "evidenceReference" TEXT,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rejection_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baker_production_records" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "productionSessionId" UUID NOT NULL,
    "productionBatchId" UUID NOT NULL,
    "shiftAssignmentId" UUID,
    "productId" UUID NOT NULL,
    "operationalDate" DATE NOT NULL,
    "totalProduced" INTEGER NOT NULL,
    "acceptedQuantity" INTEGER NOT NULL,
    "rejectedQuantity" INTEGER NOT NULL,
    "attributionMethod" "AttributionMethod" NOT NULL,
    "recordedById" UUID,
    "approvedById" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baker_production_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overhead_records" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "productionBatchId" UUID,
    "operationalDate" DATE NOT NULL,
    "category" "OverheadCategory" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "paymentMethod" VARCHAR(50),
    "allocationType" "OverheadAllocationType" NOT NULL,
    "description" TEXT,
    "sourceReference" VARCHAR(150),
    "createdById" UUID NOT NULL,

    CONSTRAINT "overhead_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overhead_allocations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "overheadRecordId" UUID NOT NULL,
    "productionBatchId" UUID NOT NULL,
    "allocationMethod" "AllocationMethod" NOT NULL,
    "allocationPercentage" DECIMAL(7,4) NOT NULL,
    "allocatedAmount" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overhead_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_cost_records" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "attendanceRecordId" UUID,
    "operationalDate" DATE NOT NULL,
    "workedMinutes" INTEGER NOT NULL,
    "compensationTypeSnapshot" "CompensationType" NOT NULL,
    "rateSnapshot" DECIMAL(18,4) NOT NULL,
    "totalLabourCost" DECIMAL(18,4) NOT NULL,
    "status" "LabourCostStatus" NOT NULL DEFAULT 'UNALLOCATED',

    CONSTRAINT "labour_cost_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_allocations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "labourCostRecordId" UUID NOT NULL,
    "productionBatchId" UUID NOT NULL,
    "allocatedMinutes" INTEGER NOT NULL,
    "allocatedAmount" DECIMAL(18,4) NOT NULL,
    "allocationMethod" "AllocationMethod" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labour_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_cost_records" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productionBatchId" UUID NOT NULL,
    "materialCost" DECIMAL(18,4) NOT NULL,
    "directOverheadCost" DECIMAL(18,4) NOT NULL,
    "allocatedDailyOverhead" DECIMAL(18,4) NOT NULL,
    "allocatedLabourCost" DECIMAL(18,4) NOT NULL,
    "totalBatchCost" DECIMAL(18,4) NOT NULL,
    "acceptedQuantity" INTEGER NOT NULL,
    "costPerAcceptedUnit" DECIMAL(18,4),
    "calculationVersion" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMPTZ(6),

    CONSTRAINT "production_cost_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_locations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finished_inventory_lots" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productionBatchId" UUID NOT NULL,
    "productionOutputId" UUID NOT NULL,
    "stockLocationId" UUID NOT NULL,
    "productionDate" TIMESTAMPTZ(6) NOT NULL,
    "expiryAt" TIMESTAMPTZ(6),
    "originalQuantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "finished_inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finished_stock_movements" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "finishedInventoryLotId" UUID NOT NULL,
    "movementType" "FinishedMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceType" VARCHAR(50) NOT NULL,
    "referenceId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "finished_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30),
    "address" TEXT,
    "customerType" "CustomerType" NOT NULL,
    "creditLimit" DECIMAL(18,4),
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "customerId" UUID,
    "saleNumber" VARCHAR(50) NOT NULL,
    "saleDate" TIMESTAMPTZ(6) NOT NULL,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "saleStatus" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "unitCostSnapshot" DECIMAL(18,4) NOT NULL,
    "totalCOGS" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_inventory_allocations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "saleItemId" UUID NOT NULL,
    "finishedInventoryLotId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostSnapshot" DECIMAL(18,4) NOT NULL,
    "totalCost" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "sale_inventory_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID,
    "saleId" UUID,
    "amount" DECIMAL(18,4) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMPTZ(6) NOT NULL,
    "referenceNumber" VARCHAR(100),
    "receivedById" UUID NOT NULL,
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'COMPLETED',

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_ledger_entries" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "transactionType" "LedgerTransactionType" NOT NULL,
    "referenceType" VARCHAR(50) NOT NULL,
    "referenceId" UUID NOT NULL,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "transactionDate" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT,
    "createdById" UUID NOT NULL,

    CONSTRAINT "customer_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "saleId" UUID,
    "deliveryEmployeeId" UUID NOT NULL,
    "deliveryDate" TIMESTAMPTZ(6) NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_items" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "deliveredQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "categoryType" "ExpenseCategoryType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "expenseDate" TIMESTAMPTZ(6) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "description" TEXT,
    "referenceNumber" VARCHAR(100),
    "createdById" UUID NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'RECORDED',

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" UUID NOT NULL,
    "dashboardLayoutId" UUID NOT NULL,
    "widgetType" VARCHAR(100) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "deviceName" VARCHAR(150) NOT NULL,
    "deviceKey" VARCHAR(128) NOT NULL,
    "userId" UUID NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(6),
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "tokenFamilyId" UUID NOT NULL,
    "refreshTokenHash" VARCHAR(64) NOT NULL,
    "role" VARCHAR(100),
    "permissions" JSONB NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "lastUsedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),
    "revokeReason" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_operations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(150) NOT NULL,
    "operationType" VARCHAR(100) NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "clientTimestamp" TIMESTAMPTZ(6) NOT NULL,
    "operationalDate" DATE,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "serverProcessedAt" TIMESTAMPTZ(6),
    "errorDetails" JSONB,

    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "syncOperationId" UUID NOT NULL,
    "conflictType" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "serverState" JSONB NOT NULL,
    "submittedState" JSONB NOT NULL,
    "status" "ConflictStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" JSONB,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMPTZ(6),

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" UUID NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "reason" TEXT,
    "source" "AuditSource" NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branches_businessId_status_idx" ON "branches"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branches_businessId_code_key" ON "branches"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "business_memberships_businessId_status_idx" ON "business_memberships"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "business_memberships_businessId_userId_key" ON "business_memberships"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_businessId_name_key" ON "roles"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_branch_access_membershipId_branchId_key" ON "membership_branch_access"("membershipId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_businessId_name_key" ON "departments"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "job_positions_businessId_name_key" ON "job_positions"("businessId", "name");

-- CreateIndex
CREATE INDEX "employees_businessId_status_idx" ON "employees"("businessId", "status");

-- CreateIndex
CREATE INDEX "employees_branchId_status_idx" ON "employees"("branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_businessId_employeeNumber_key" ON "employees"("businessId", "employeeNumber");

-- CreateIndex
CREATE INDEX "shift_assignments_businessId_employeeId_scheduledStart_idx" ON "shift_assignments"("businessId", "employeeId", "scheduledStart");

-- CreateIndex
CREATE INDEX "attendance_records_businessId_employeeId_operationalDate_idx" ON "attendance_records"("businessId", "employeeId", "operationalDate");

-- CreateIndex
CREATE INDEX "employee_compensations_businessId_employeeId_effectiveFrom_idx" ON "employee_compensations"("businessId", "employeeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "material_categories_businessId_name_key" ON "material_categories"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "units_of_measure_businessId_symbol_key" ON "units_of_measure"("businessId", "symbol");

-- CreateIndex
CREATE INDEX "materials_businessId_isActive_idx" ON "materials"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "materials_businessId_name_key" ON "materials"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "material_varieties_materialId_name_key" ON "material_varieties"("materialId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_businessId_purchaseNumber_key" ON "purchases"("businessId", "purchaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "material_lots_purchaseItemId_key" ON "material_lots"("purchaseItemId");

-- CreateIndex
CREATE INDEX "material_lots_businessId_materialId_status_idx" ON "material_lots"("businessId", "materialId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "material_lots_businessId_lotNumber_key" ON "material_lots"("businessId", "lotNumber");

-- CreateIndex
CREATE INDEX "material_lot_movements_businessId_materialLotId_occurredAt_idx" ON "material_lot_movements"("businessId", "materialLotId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "finished_products_businessId_productCode_key" ON "finished_products"("businessId", "productCode");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_versions_recipeId_versionNumber_key" ON "recipe_versions"("recipeId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "blend_operations_businessId_operationNumber_key" ON "blend_operations"("businessId", "operationNumber");

-- CreateIndex
CREATE INDEX "production_sessions_businessId_operationalDate_idx" ON "production_sessions"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "production_sessions_businessId_sessionNumber_key" ON "production_sessions"("businessId", "sessionNumber");

-- CreateIndex
CREATE INDEX "production_batches_businessId_status_idx" ON "production_batches"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_businessId_batchNumber_key" ON "production_batches"("businessId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "batch_employee_assignments_productionBatchId_employeeId_key" ON "batch_employee_assignments"("productionBatchId", "employeeId");

-- CreateIndex
CREATE INDEX "baker_production_records_businessId_employeeId_operationalD_idx" ON "baker_production_records"("businessId", "employeeId", "operationalDate");

-- CreateIndex
CREATE INDEX "baker_production_records_businessId_productionBatchId_idx" ON "baker_production_records"("businessId", "productionBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "production_cost_records_productionBatchId_calculationVersio_key" ON "production_cost_records"("productionBatchId", "calculationVersion");

-- CreateIndex
CREATE UNIQUE INDEX "stock_locations_branchId_name_key" ON "stock_locations"("branchId", "name");

-- CreateIndex
CREATE INDEX "finished_inventory_lots_businessId_productId_status_idx" ON "finished_inventory_lots"("businessId", "productId", "status");

-- CreateIndex
CREATE INDEX "finished_stock_movements_businessId_finishedInventoryLotId__idx" ON "finished_stock_movements"("businessId", "finishedInventoryLotId", "occurredAt");

-- CreateIndex
CREATE INDEX "customers_businessId_status_idx" ON "customers"("businessId", "status");

-- CreateIndex
CREATE INDEX "sales_businessId_saleDate_idx" ON "sales"("businessId", "saleDate");

-- CreateIndex
CREATE UNIQUE INDEX "sales_businessId_saleNumber_key" ON "sales"("businessId", "saleNumber");

-- CreateIndex
CREATE INDEX "customer_ledger_entries_businessId_customerId_transactionDa_idx" ON "customer_ledger_entries"("businessId", "customerId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_businessId_name_key" ON "expense_categories"("businessId", "name");

-- CreateIndex
CREATE INDEX "expenses_businessId_expenseDate_idx" ON "expenses"("businessId", "expenseDate");

-- CreateIndex
CREATE UNIQUE INDEX "devices_businessId_userId_deviceKey_key" ON "devices"("businessId", "userId", "deviceKey");

-- CreateIndex
CREATE INDEX "auth_sessions_businessId_userId_revokedAt_idx" ON "auth_sessions"("businessId", "userId", "revokedAt");

-- CreateIndex
CREATE INDEX "auth_sessions_deviceId_revokedAt_idx" ON "auth_sessions"("deviceId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sync_operations_businessId_idempotencyKey_key" ON "sync_operations"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_entityType_entityId_idx" ON "audit_logs"("businessId", "entityType", "entityId");
