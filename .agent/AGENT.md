# AGENT.md --- Injera Business Manager

> **Purpose:** This file is the authoritative product, architecture,
> business-rules, and implementation brief for AI coding agents working
> on Injera Business Manager.
>
> **Instruction to the coding agent:** Read this entire document before
> making changes. Treat confirmed requirements and invariants as
> acceptance criteria. Do not silently simplify, omit, reinterpret, or
> replace business rules. If an implementation detail is genuinely
> unresolved, document the options and ask for a decision rather than
> inventing a business rule. Build incrementally by milestone; do not
> attempt to implement the entire platform in one pass.

------------------------------------------------------------------------

## 1. Product overview

### 1.1 Product vision

Build a hybrid offline/cloud Progressive Web Application (PWA) for
Ethiopian injera baking and distribution businesses. The application
helps owners and employees manage the full business lifecycle:

-   Employees, bakers, labourers, shifts and attendance.
-   Suppliers, purchasing and raw-material inventory.
-   Material lots, varieties, usable weights and purchase costs.
-   Recipes and recipe versions.
-   Production sessions and batches.
-   Actual material consumption, yield, rejection and production
    costing.
-   Finished-injera inventory, freshness and stock rotation.
-   Sales, delivery and distribution.
-   Customers, credit sales, debts and repayments.
-   Production overhead, labour cost and general expenses.
-   Financial reports, operational statistics and customizable
    dashboards.
-   Offline operation and reliable synchronization across devices.

The product is purpose-built for injera businesses, not a generic
inventory template.

### 1.2 Core product principle

**Every injera produced must have a traceable production history and a
defensible production cost.**

The system must make it possible to trace finished stock back to its
production batch, recipe version, consumed raw-material lots, actual
quantities, overhead and labour allocations. It must also show which
bakers contributed to production.

### 1.3 Target users

-   Business owners.
-   Business administrators and managers.
-   Production supervisors.
-   Bakers.
-   Labourers and production assistants.
-   Cashiers.
-   Sales and distribution employees.
-   Other authorized employees.

### 1.4 Business model and operating context

-   Initial market: Ethiopia.
-   Initial currency: Ethiopian Birr (ETB).
-   Initial interface language: English.
-   Plan for Amharic localization; Afaan Oromo may be added later.
-   Support Ethiopian and Gregorian date display.
-   Business timezone must be configurable and used consistently for
    operational dates, shifts, reports and offline timestamps.
-   Mobile-first interface with desktop support.
-   One business may have multiple branches or production locations.
-   A business may have multiple users and devices.

### 1.5 Product differentiator

Accurate, traceable production cost per **accepted, sellable injera**,
accounting for:

-   Different teff varieties and suppliers.
-   Different purchase prices and specific material lots.
-   Actual usable weight after tare and impurities.
-   Multiple ingredients and mixed teff.
-   Variable batch and barrel sizes.
-   Actual rather than merely theoretical material consumption.
-   Actual accepted and rejected output.
-   Batch-level and shared daily overhead.
-   Employee labour and labour allocation.
-   Multiple finished product types from one batch.

------------------------------------------------------------------------

## 2. Product scope

### 2.1 Included in the product

1.  Multi-tenant business and branch management.
2.  Authentication, employee accounts, roles and permissions.
3.  Employee directory and workforce management.
4.  Shift scheduling, attendance and leave records.
5.  Individual baker production tracking.
6.  Material catalog and unit management.
7.  Suppliers, purchases and lot-based raw-material inventory.
8.  Recipes, versions and mixed-teff support.
9.  Production sessions and production batches.
10. Rejection and wastage records.
11. Production overhead and labour costing.
12. Batch and per-unit production costing.
13. Finished-goods inventory and freshness.
14. Sales, delivery and distribution.
15. Customer accounts, credit, debts and repayments.
16. General business expenses.
17. Financial and operational reporting.
18. Customizable visual dashboards.
19. Offline operation and synchronization.

### 2.2 Initial exclusions

Do not implement these in the initial MVP unless explicitly approved:

-   Full payroll processing and statutory payroll compliance.
-   Full statutory accounting or tax filing.
-   Regulatory and tax-system integrations.
-   Supplier marketplace.
-   Advanced delivery-route optimization.
-   AI demand forecasting.
-   Generic multi-industry templates.

Employee compensation and labour-cost records are in scope; a complete
payroll engine is not.

------------------------------------------------------------------------

## 3. Users, businesses, branches and permissions

### 3.1 Multi-tenancy

The platform must support multiple independent businesses. Each business
may have multiple branches or production locations.

-   Every tenant-owned record must be associated with a business ID.
-   Branch/location ownership must be explicit where relevant.
-   All reads and writes must enforce tenant isolation server-side.
-   Never rely only on frontend filtering for tenant security.
-   Validate tenant membership and permission on every protected
    operation.
-   Prevent cross-tenant references, including through nested relations,
    IDs, offline sync and reports.
-   Use database constraints and transactional checks where appropriate.

### 3.2 Users and employees are related but distinct

An employee may have a login account, but not every employee must have
one. Keep the employee record separate from authentication identity and
link them when access is required.

### 3.3 Roles and permissions

Support business owners and employees with configurable roles and
permissions. Provide sensible initial roles, but do not hard-code
authorization solely around role names.

Suggested initial roles:

-   Owner.
-   Business administrator.
-   Manager.
-   Production supervisor.
-   Baker.
-   Labourer / production assistant.
-   Cashier.
-   Distributor / delivery employee.
-   Read-only auditor.

Permissions should be granular, including the ability to:

-   View/create/update employees.
-   Manage shifts and attendance.
-   Record or approve baker output.
-   Manage materials, suppliers and purchases.
-   Manage recipes.
-   Create and complete production batches.
-   Record rejections.
-   Finalize production costing.
-   Adjust inventory.
-   Create sales and payments.
-   Manage customers and debts.
-   Record expenses.
-   View financial reports.
-   Manage dashboard layouts.
-   Resolve sync conflicts.
-   Approve historical corrections.

Sensitive operations must be auditable.

------------------------------------------------------------------------

## 4. Employee and workforce management

### 4.1 Employee directory

Track:

-   Employee ID, unique within a business.
-   Full name.
-   Contact details.
-   Optional address and emergency contact, subject to privacy policy.
-   Job position.
-   Department.
-   Employment type.
-   Hire/start date.
-   Employment status (active, inactive, suspended or other configured
    statuses).
-   Assigned branch or production location.
-   Optional login account link.
-   Compensation arrangement and effective dates.
-   Notes.

Initial job positions/categories may include:

-   Baker.
-   Labourer.
-   Production assistant.
-   Cleaner.
-   Distributor.
-   Cashier.
-   Supervisor.
-   Manager.
-   Other configurable positions.

The system must allow businesses to add job positions and departments.

### 4.2 Employee headcount

Provide current and historical workforce statistics:

-   Total employees.
-   Active employees.
-   Employees by job position and department.
-   Employees by branch.
-   Employees currently scheduled or on shift.
-   Attendance and absence summaries.

Do not count inactive employees as current active headcount.

### 4.3 Shift management

Support configurable shifts:

-   Day shift.
-   Night shift.
-   Custom shifts.

A shift definition includes:

-   Shift name.
-   Start time.
-   End time.
-   Whether it crosses midnight, derived or explicitly represented
    safely.
-   Optional break policy.
-   Branch/location.
-   Active status.

An employee shift assignment includes:

-   Employee.
-   Shift definition.
-   Actual working date / shift start date.
-   Scheduled start and end timestamps.
-   Assigned branch.
-   Supervisor.
-   Assignment status.
-   Optional notes.

Rules:

-   A night shift crossing midnight is one shift, not two shifts.
-   Store actual timestamps with timezone-aware semantics; preserve the
    business-local date used for reporting.
-   Do not infer a shift's date solely from clock-out date.
-   Prevent overlapping confirmed assignments for the same employee
    unless an authorized exception is supported and audited.
-   Allow different shifts on different days.
-   Support day, night and custom shifts.
-   Attendance is distinct from a scheduled shift.

### 4.4 Attendance and working hours

Track:

-   Scheduled shift.
-   Actual clock-in.
-   Actual clock-out.
-   Break start/end or total break duration.
-   Total working time.
-   Overtime.
-   Late arrival.
-   Early departure.
-   Absence.
-   Leave.
-   Attendance status.
-   Recording/approving employee.
-   Correction reason and audit history.

Rules:

-   Do not equate a scheduled shift with actual attendance.
-   Support shifts crossing midnight.
-   Calculate elapsed duration using timestamps, not naive time-of-day
    subtraction.
-   Attendance corrections must be audited.
-   Leave and absence records must be distinguishable from missing clock
    events.
-   Offline attendance events must retain device ID, local timestamp and
    sync metadata.

### 4.5 Individual baker production tracking

Every baker's contribution must be recorded separately and associated
with actual production.

For each baker production record, capture:

-   Baker/employee ID.
-   Business and branch.
-   Production date.
-   Assigned shift.
-   Production session.
-   Production batch.
-   Product type / injera size.
-   Quantity produced.
-   Accepted quantity.
-   Rejected quantity attributable to that baker, when known.
-   Production start and end time, when available.
-   Recording method.
-   Recorded by / supervisor.
-   Notes and optional evidence.

Support reports by:

-   Day.
-   Week.
-   Month.
-   Custom date range.
-   Branch.
-   Shift.
-   Product type.
-   Individual baker.

Metrics:

-   Total produced.
-   Accepted quantity.
-   Rejected quantity.
-   Rejection rate.
-   Average accepted injera per shift.
-   Average accepted injera per working hour.
-   Total working hours.
-   Productivity trends.
-   Comparison between bakers.

**Critical attribution rule:** If multiple bakers work on the same
batch, do not assign the entire batch output to every baker. Individual
contribution records must reconcile to the portion of batch output
attributed to the team. The system must support the following recording
methods:

1.  **Individual counting:** Record each baker's actual output
    separately.
2.  **Supervisor allocation:** A supervisor allocates a batch's output
    among participating bakers.
3.  **Both:** Support both methods, and save the method used on each
    production record.

Do not silently mix methods or double-count output. If the team output
cannot be fully attributed, record the unallocated amount and require an
authorized resolution or clearly mark it as unallocated. The sum of
baker-attributed output plus explicitly unallocated output must
reconcile to the batch/team output for the same product and
accepted/rejected classification.

Baker productivity reports must distinguish total output from accepted
sellable output.

### 4.6 Labourers and other workforce members

Labourers and other employees require attendance and work records even
when their work is not measured in injera units.

Track:

-   Attendance.
-   Assigned shift.
-   Clock-in and clock-out.
-   Break time.
-   Working hours.
-   Overtime.
-   Absence and leave.
-   Assigned production session, batch or activity.
-   Supervisor and notes.

The system should help owners understand staffing requirements and
labour hours per production operation.

### 4.7 Compensation and labour cost

Support configurable compensation arrangements:

-   Hourly wage.
-   Daily wage.
-   Fixed shift payment.
-   Monthly salary.
-   Overtime rate.
-   Other configured compensation arrangements.

Maintain effective-dated compensation history. Changing a wage must not
alter finalized historical labour costs.

Labour cost allocation methods:

1.  **Direct allocation:** assign an employee's labour cost to a
    specific production batch.
2.  **Shared allocation:** allocate employee labour across multiple
    batches using recorded hours or another configured allocation
    method.

Rules:

-   Labour costs must not be counted both as direct batch cost and
    shared overhead.
-   Every labour-cost record must have a unique source and allocation
    status.
-   Allocations must reconcile to the source labour cost.
-   Unallocated labour cost must remain visible.
-   Preserve source attendance, compensation rate and calculation
    snapshot used.
-   Compensation records do not imply a full payroll engine.

------------------------------------------------------------------------

## 5. Material catalog and units

### 5.1 Material catalog

Allow configurable materials and categories, including:

-   Teff.
-   Additional ingredients.
-   Water.
-   Consumables.
-   Packaging.
-   Fuel or other production inputs where treated as materials.
-   Custom materials.

Teff varieties must be configurable, not hard-coded. Examples include
white, red, mixed and other.

Material fields:

-   ID.
-   Name.
-   Category.
-   Material type/variety where applicable.
-   Base unit.
-   Minimum stock threshold.
-   Active/inactive status.
-   Optional description and notes.

Users must be able to add custom ingredients without schema changes.

### 5.2 Units and conversions

Support:

-   Kilogram (kg).
-   Gram (g).
-   Litre (L).
-   Millilitre (ml).
-   Piece.
-   Custom units.

Conversions must be explicit and dimensionally valid. Do not convert
mass to volume (or vice versa) unless the business has configured a
valid material-specific conversion factor. Use decimal-safe arithmetic.

------------------------------------------------------------------------

## 6. Suppliers, purchasing and material lots

### 6.1 Purchase records

Each purchase must independently record:

-   Supplier.
-   Purchase date/time.
-   Material and variety/type.
-   Gross weight/quantity.
-   Packaging/tare weight.
-   Impurities or unusable weight.
-   Actual usable net weight.
-   Purchase amount.
-   Transport and other acquisition costs.
-   Payment status and payment details.
-   Notes and supporting documents where appropriate.

For weight-based purchases:

`usable_weight = gross_weight - tare_weight - unusable_weight`

`unit_cost = (purchase_cost + acquisition_costs) / usable_weight`

Validate that usable weight is positive and that quantities/costs are
valid.

Example:

-   Gross weight: 110 kg.
-   Packaging/tare: 2 kg.
-   Impurities/unusable: 3 kg.
-   Usable weight: 105 kg.
-   Purchase amount: 18,000 ETB.
-   Transport/acquisition cost: 500 ETB.
-   Unit cost: 18,500 / 105 = approximately 176.19 ETB/kg.

### 6.2 Material lots

Every received purchase creates a distinct material lot.

Each lot records:

-   Material and variety.
-   Supplier.
-   Purchase reference.
-   Received date.
-   Original usable quantity.
-   Remaining quantity.
-   Total acquisition cost.
-   Unit cost.
-   Unit of measure.
-   Status.
-   Optional expiry/quality data.
-   Source and ancestry for blended lots.

Rules:

-   Never merge different purchase lots merely because they contain the
    same material.
-   Support partial lot consumption.
-   Historical purchase values must never be overwritten.
-   Record all stock changes as movements.
-   Production consumption must reference exact material lots and
    historical lot costs.
-   No average-cost substitution for production consumption.
-   A lot's remaining balance must reconcile with its movements.
-   Prevent consumption beyond available authoritative lot stock.

### 6.3 Material lot movements

Record purchase receipt, production consumption, blend input/output,
adjustment, transfer, return, spoilage and other supported movements.
Each movement needs quantity, unit, timestamp, source reference,
actor/device and audit metadata.

------------------------------------------------------------------------

## 7. Recipes and recipe versions

### 7.1 Recipe model

A recipe is an expected production plan, not proof of what actually
happened.

A recipe includes:

-   Name and product type.
-   Version.
-   Ingredient list.
-   Teff varieties and proportions/quantities.
-   Custom ingredients.
-   Water and other inputs.
-   Expected quantities.
-   Expected yield.
-   Reference batch quantity.
-   Instructions.
-   Effective date.
-   Active status.

Recipes may contain multiple teff varieties and other ingredients.

### 7.2 Recipe versioning

-   Editing a recipe creates a new version.
-   Historical production batches retain the exact recipe version and
    expected quantities used.
-   Never rewrite historical recipe data.
-   Recipe versions must be effective-dated and auditable.

### 7.3 Variable batch size

Batch size and barrel capacity are variable; do not assume a
standardized barrel size.

`scaling_factor = planned_batch_quantity / recipe_reference_quantity`

Scale expected ingredient quantities using the factor. Allow authorized
manual adjustments. Actual consumption is recorded independently and is
the basis for actual material costing.

------------------------------------------------------------------------

## 8. Mixed teff and blending

Support both approaches.

### 8.1 Direct mixed-teff consumption

A batch may consume multiple teff varieties and multiple specific lots.
Record every lot, quantity and cost independently.

### 8.2 Pre-mixed teff inventory

Support a blending operation that:

-   Selects multiple input lots.
-   Records input quantities.
-   Calculates input costs from historical lot costs.
-   Records processing loss.
-   Records usable blend output quantity.
-   Records blend processing costs where applicable.
-   Calculates blend unit cost.
-   Creates a new traceable blend lot.
-   Preserves source lot ancestry.

When production consumes the blend, it references the blend lot.
Traceability must allow the user to inspect the original source lots and
blend operation.

------------------------------------------------------------------------

## 9. Production sessions and batches

### 9.1 Session versus batch

-   A **recipe** is the expected plan.
-   A **production batch** is what actually happened.
-   A **production session** groups one or more batches.

A session may contain multiple batches using different recipes. A batch
uses one recipe version and may produce one or multiple finished product
types.

### 9.2 Production session

Record:

-   Session ID.
-   Business and branch/location.
-   Production date.
-   Start and end time.
-   Responsible employee/supervisor.
-   Shift.
-   Status.
-   Batches.
-   Employee assignments.
-   Notes.

### 9.3 Production batch

Record:

-   Batch ID.
-   Session.
-   Recipe and immutable recipe version.
-   Planned and actual material consumption.
-   Specific consumed material lots.
-   Expected yield.
-   Actual output.
-   Accepted output.
-   Rejected output.
-   Product output types.
-   Baker contributions.
-   Employee assignments.
-   Batch-level overhead.
-   Allocated daily overhead.
-   Labour cost allocations.
-   Total cost and unit cost snapshots.
-   Timestamps.
-   Status and audit metadata.

### 9.4 Batch lifecycle

Initial lifecycle:

`Draft → In Progress → Completed`

Cancellation must use a controlled reversal process. Do not delete
finalized stock or cost movements.

Rules:

-   Variable barrel quantity is recorded on each batch.
-   Expected recipe quantities may be scaled, but actual consumption is
    recorded separately.
-   A batch may consume multiple lots of the same material.
-   A batch may use multiple teff varieties.
-   Actual consumption and actual output are required before
    finalization.
-   A batch cannot consume more than available selected-lot stock in
    authoritative online operations.
-   Finalized values are immutable.
-   Corrections require audited adjustment/reversal, not silent edits.
-   Finalization must be transactional: consume raw stock, create
    finished stock, snapshot cost, and record related movements
    atomically.

### 9.5 Output reconciliation

`actual_output = accepted_output + rejected_output`

Maintain this reconciliation per product type and in total.

One batch may create multiple finished product types (for example,
different sizes or types). Allocate total batch cost across outputs
using one configured method:

-   Quantity-based allocation.
-   Direct-cost allocation where output-specific costs are known.
-   Manually approved allocation percentages.

The sum of output allocations must equal the original batch cost
exactly. Handle decimal rounding through a deterministic residual rule
so no cost is lost or created.

### 9.6 Baker output reconciliation

Baker production records must reconcile with the batch/team output for
each product type. Support individual counting, supervisor allocation or
both. Record who entered or approved allocations. Never duplicate the
batch's entire output across multiple bakers.

------------------------------------------------------------------------

## 10. Rejected injera and wastage

Support both simple and detailed rejection recording.

### 10.1 Simple rejection record

Record total rejected quantity, date and batch.

### 10.2 Detailed rejection record

Record:

-   Quantity.
-   Reason.
-   Product type.
-   Batch.
-   Employee/baker, when known.
-   Notes.
-   Optional evidence.

Initial rejection reasons:

-   Burnt.
-   Torn/damaged.
-   Incorrect thickness.
-   Incorrect size.
-   Contamination.
-   Other.

### 10.3 Rejection costing and inventory

-   Rejected output must not enter sellable finished-goods inventory.
-   Rejected output remains part of actual batch output reconciliation.
-   Its cost remains in batch cost and is absorbed by accepted sellable
    output.
-   `cost_per_sellable_injera = allocated_batch_cost / accepted_quantity`
-   If accepted quantity is zero, do not divide by zero; flag the batch
    for loss treatment/authorized resolution.
-   Recoverable or reusable rejected output requires a separate
    authorized recovery workflow. Do not automatically return it to
    inventory.

------------------------------------------------------------------------

## 11. Production overhead

Support both actual batch-level overhead and daily shared production
costs.

### 11.1 Batch-level overhead

Categories may include:

-   Labour.
-   Fuel/firewood.
-   Electricity.
-   Water.
-   Packaging.
-   Other.

Record category, amount, date, batch, payment method, source, notes and
actor.

### 11.2 Daily shared overhead

Record shared daily production expenses such as:

-   Daily labour.
-   Shared fuel.
-   Shared electricity.
-   Shared water.
-   Other production costs.

Allocate across batches using configurable methods:

-   Production quantity.
-   Production time.
-   Direct material cost.
-   Manually approved percentages.

### 11.3 Double-count prevention

-   A batch-level expense cannot also be included in daily shared
    allocation.
-   Every overhead source has a unique identity and allocation status.
-   Total allocations must equal the allocatable daily overhead.
-   Unallocated amounts remain visible.
-   Production overhead must remain distinct from general operating
    expenses.
-   Rent/administration allocation is optional and must follow a
    configured policy; never double-count it.
-   Finalized allocations are immutable and corrections are audited.

------------------------------------------------------------------------

## 12. Production costing

### 12.1 Material cost

`material_cost = sum(actual_consumed_quantity × historical_specific_lot_unit_cost)`

Use the specific lot cost for each consumption. Do not use average-cost
substitution.

### 12.2 Batch cost

`total_batch_cost = material_cost + batch_overhead + allocated_daily_overhead + allocated_labour_cost`

Labour must be included exactly once. If labour is already included in a
batch-level overhead source, it must not also be included through labour
allocation.

### 12.3 Unit cost

For a single accepted output:

`unit_cost = allocated_batch_cost / accepted_sellable_quantity`

For multiple outputs, allocate batch cost to each output using the
configured allocation method, then calculate each product's unit cost
using its accepted sellable quantity.

Rejected units do not enter sellable inventory; their cost is absorbed
by accepted output.

### 12.4 Financial precision

-   Use PostgreSQL `NUMERIC` / Prisma `Decimal` or an equivalent
    decimal-safe representation.
-   Do not use binary floating-point for financial quantities or cost
    calculations.
-   Define precision and rounding policy centrally.
-   Preserve finalized historical cost snapshots.
-   Never silently recalculate historical finalized costs when prices,
    recipes, wages or overhead policies change.

------------------------------------------------------------------------

## 13. Raw-material and finished-goods inventory

### 13.1 Separate inventory domains

Keep raw-material inventory separate from finished-injera inventory.

### 13.2 Raw-material inventory

Track by material, variety and lot:

-   Original quantity.
-   Remaining quantity.
-   Unit.
-   Historical unit cost and valuation.
-   Purchase/consumption history.
-   Stock movements.
-   Minimum stock threshold.
-   Low-stock warnings.
-   Unusable/spoiled stock.
-   Optional expiry/quality data.
-   Location.

### 13.3 Finished-goods inventory

Track:

-   Product type.
-   Teff composition where known.
-   Size/diameter.
-   Unit.
-   Selling price.
-   Production batch.
-   Production date/time.
-   Accepted quantity.
-   Remaining quantity.
-   Cost per unit.
-   Storage location.
-   Freshness/expiry data.
-   Stock status.

Injera is perishable. Support freshness/expiry tracking and FIFO stock
rotation.

### 13.4 Stock movement rules

-   Purchase receipt increases raw stock.
-   Production consumption decreases raw stock.
-   Production completion increases finished stock only for accepted
    sellable output.
-   Sale decreases finished stock.
-   Damage, spoilage and adjustment use explicit movements.
-   Transfers use paired movements.
-   Finished inventory uses FIFO by default; allow traceable manual
    allocation.
-   Do not silently edit stock balances. Balances must derive from
    movements or transactionally consistent projections.
-   No negative authoritative online inventory.
-   Offline users must see stale-stock warnings where relevant.

------------------------------------------------------------------------

## 14. Sales, delivery and distribution

### 14.1 Sales

Support:

-   Customer selection or walk-in sale.
-   Product and quantity.
-   Unit price.
-   Discounts.
-   Payment method.
-   Full and partial payments.
-   Credit sales.
-   Receipt/reference.
-   Sale date/time.
-   Employee/cashier.
-   Branch/location.
-   Finished-stock lot allocation.

Sales must reference the finished inventory lots consumed.

### 14.2 Distribution and delivery

Customer types may include:

-   Grocery shops.
-   Restaurants.
-   Hotels.
-   Wholesale buyers.
-   Individuals.
-   Other configurable types.

Delivery records:

-   Customer.
-   Products.
-   Quantities.
-   Delivery date/time.
-   Assigned employee.
-   Branch/location.
-   Payment status.
-   Delivery status.
-   Notes.

### 14.3 Customers and customer ledger

Customer profile:

-   Name.
-   Phone.
-   Address.
-   Customer type.
-   Purchase history.
-   Current derived balance.
-   Payment history.

Support:

-   Credit transactions.
-   Partial repayments.
-   Due dates.
-   Overdue balances.
-   Customer statements.
-   Reminders.
-   Payment history.

Customer balances must be derived from append-only ledger entries, not
manually overwritten. Corrections must use auditable ledger adjustments.

------------------------------------------------------------------------

## 15. Expenses and financial reporting

### 15.1 General business expenses

Support categories such as:

-   Rent.
-   Labour.
-   Electricity.
-   Water.
-   Transport.
-   Maintenance.
-   Packaging.
-   Administration.
-   Other.

Keep general operating expenses distinct from production overhead. Apply
an explicit policy when an expense is allocated to production. Prevent
duplicate inclusion.

### 15.2 Financial metrics

Report separately:

-   Sales revenue.
-   Cost of goods sold (COGS).
-   Gross profit.
-   Gross margin.
-   Operating expenses.
-   Net operating profit.
-   Net operating margin.
-   Accounts receivable/customer debts.
-   Cash collected.
-   Cash paid.
-   Inventory valuation.
-   Labour cost.
-   Production cost per accepted injera.

Formulas:

`Gross Profit = Revenue - COGS`

`Gross Margin = Gross Profit / Revenue × 100`

`Net Operating Profit = Gross Profit - Operating Expenses`

`Net Operating Margin = Net Operating Profit / Revenue × 100`

Sales revenue and cash collection are different. Credit sales contribute
to revenue but are not cash collected until paid. Reports must
distinguish accrual-like sales activity from cash movement.

------------------------------------------------------------------------

## 16. Customizable dashboard

### 16.1 Visual dashboard builder

Provide a visual builder that lets authorized users:

-   Add widgets.
-   Remove widgets.
-   Rearrange widgets using drag-and-drop.
-   Resize widgets.
-   Change chart presentation where supported.
-   Select date ranges.
-   Save and restore layouts.
-   Reset to a default layout.

Use `dnd-kit` or a suitable maintained equivalent.

Dashboard layouts are saved per user and business. Customization must
never change underlying business calculations or permissions.

### 16.2 Initial dashboard widgets

Production and inventory:

-   Today's production.
-   Today's accepted and rejected output.
-   Production cost per injera.
-   Raw-material stock.
-   Finished-goods stock.
-   Production wastage.
-   Production versus sales.
-   Low-stock alerts.

Sales and finance:

-   Today's sales.
-   Revenue/profit trends.
-   Customer debts/receivables.
-   Expense distribution.
-   Best-selling products.
-   Inventory valuation.

Workforce:

-   Total employees.
-   Active employees.
-   Employees currently on shift.
-   Day-shift attendance.
-   Night-shift attendance.
-   Absent employees.
-   Total bakers.
-   Daily production per baker.
-   Weekly production per baker.
-   Monthly production per baker.
-   Best-performing bakers by accepted output.
-   Rejection rate per baker.
-   Total labour costs.
-   Labour cost per injera.
-   Production output per labour hour.

All widgets must respect tenant, branch, permission and date-range
filters.

------------------------------------------------------------------------

## 17. Offline-first operation and synchronization

### 17.1 Architecture

-   Use IndexedDB for structured offline data.
-   Use a service worker for application shell/static asset caching and
    appropriate offline support.
-   Provide clear online/offline/sync status.
-   Cache only data the user is authorized to access.
-   Protect sensitive locally stored data appropriately.
-   Do not assume the browser cache is a durable database.

### 17.2 Offline-supported operations

Support offline creation/recording for:

-   Cached inventory viewing.
-   Purchases.
-   Production sessions and batches.
-   Material consumption.
-   Production output and rejection.
-   Baker contribution records.
-   Attendance and shift events.
-   Sales.
-   Payments.
-   Expenses.
-   Cached reports where data is available.

Operations must remain available after app/browser restart, subject to
local storage constraints.

### 17.3 Offline operation envelope

Every offline operation must carry:

-   Unique transaction/operation ID.
-   Business ID.
-   Device ID.
-   Actor/user ID.
-   Local timestamp.
-   Business-local operational date where relevant.
-   Operation type and schema version.
-   Payload.
-   Sync status.
-   Idempotency key.

### 17.4 Synchronization requirements

Implement:

-   Durable operation queue.
-   Idempotent server processing.
-   Duplicate prevention.
-   Retry with backoff.
-   Sync status visibility.
-   Conflict detection.
-   Conflict resolution workflow.
-   Error reporting and recovery.
-   Audit trail.
-   Safe schema/version handling.

Never silently overwrite a transaction or stock balance.

### 17.5 Concurrent offline stock conflicts

Multiple offline devices may consume the same stock while disconnected.

-   Never assume offline shared inventory is real-time.
-   Preserve both submitted transaction records.
-   Detect insufficient combined stock during server reconciliation.
-   Do not silently accept negative authoritative stock.
-   Flag conflicts for authorized resolution.
-   Preserve audit information and original device/actor timestamps.
-   Provide clear user-visible status for pending, accepted, rejected or
    conflicted operations.
-   Do not silently delete a valid user's work when a conflict occurs.

Offline stock availability is an estimate based on the last synchronized
state, not a guarantee.

------------------------------------------------------------------------

## 18. Proposed domain model / database entities

The following is a conceptual entity inventory. The implementation agent
must refine relations, constraints, indexes, enums and migration
strategy without violating the business rules.

### 18.1 Business and access

-   `Business`
-   `Branch`
-   `User`
-   `BusinessMembership`
-   `Role`
-   `Permission`
-   `Device`
-   `AuditLog`

### 18.2 Workforce

-   `Employee`
-   `Department`
-   `JobPosition`
-   `Shift`
-   `EmployeeShift`
-   `Attendance`
-   `LeaveRecord`
-   `ProductionAssignment`
-   `BakerProductionRecord`
-   `EmployeeCompensation`
-   `LabourCostRecord`
-   `LabourCostAllocation`

### 18.3 Materials and purchasing

-   `Material`
-   `MaterialCategory`
-   `MaterialType` / configurable variety
-   `UnitOfMeasure`
-   `UnitConversion`
-   `Supplier`
-   `Purchase`
-   `PurchaseItem`
-   `MaterialLot`
-   `MaterialLotMovement`

### 18.4 Recipes

-   `Recipe`
-   `RecipeVersion`
-   `RecipeIngredient`

### 18.5 Production and costing

-   `ProductionSession`
-   `ProductionBatch`
-   `MaterialConsumption`
-   `ProductionOutput`
-   `RejectionRecord`
-   `OverheadRecord`
-   `OverheadAllocation`
-   `ProductionCostRecord`
-   `BlendOperation`
-   `BlendInput`
-   `BlendOutput` or traceable blend-lot relation

### 18.6 Inventory

-   `FinishedProduct`
-   `FinishedInventoryLot`
-   `FinishedStockMovement`
-   `StockAdjustment`
-   `StockLocation`

### 18.7 Sales and customers

-   `Customer`
-   `Sale`
-   `SaleItem`
-   `Payment`
-   `CustomerLedger`
-   `DebtRecord` if needed as a projection/reference, not a competing
    source of truth
-   `Delivery`
-   `DeliveryItem`

### 18.8 Finance

-   `Expense`
-   `ExpenseCategory`
-   `FinancialTransaction` where needed for a consistent transaction
    ledger

### 18.9 Customization and synchronization

-   `DashboardLayout`
-   `DashboardWidget`
-   `BusinessSettings`
-   `SyncOperation`
-   `SyncConflict`

### 18.10 Data-model rules

-   All tenant-owned records include business ownership and appropriate
    branch ownership.
-   Use foreign keys and referential integrity.
-   Use unique constraints for tenant-scoped identifiers.
-   Index common query dimensions: business, branch, date, status,
    employee, batch, material, lot, customer.
-   Use soft deactivation for master records where historical references
    must remain valid.
-   Do not cascade-delete financial, inventory, attendance, production
    or audit history.
-   Use append-only ledger/movement patterns for stock, customer
    balances and financial history.
-   Keep stock projections transactionally consistent with movement
    records.
-   Preserve historical snapshots for recipe, purchase lot cost,
    compensation, overhead allocation and production cost.
-   Avoid storing the same fact as competing sources of truth. Derived
    balances and reports must have a clearly defined source.

------------------------------------------------------------------------

## 19. Recommended technical architecture

The following is the proposed baseline. Do not introduce microservices
for the initial product.

### 19.1 Frontend

-   Next.js 16.
-   React.
-   TypeScript.
-   App Router.
-   Tailwind CSS.
-   shadcn/ui.
-   `dnd-kit` for dashboard drag-and-drop.
-   Recharts for charts.
-   Zod for client-side/shared validation where appropriate.
-   IndexedDB for offline structured data.
-   Service Worker / PWA support.

### 19.2 Backend

-   Fastify.
-   TypeScript.
-   Modular monolith.
-   Versioned REST API.
-   Zod request validation.
-   Server-side authorization and tenant isolation.
-   Transactional domain services for inventory, production, costing,
    sales and ledgers.

### 19.3 Data layer

-   PostgreSQL.
-   Prisma ORM.
-   Prisma Decimal / PostgreSQL NUMERIC for financial values.
-   Explicit migrations.
-   Foreign keys, unique constraints and indexes.
-   Database transactions for operations that must be atomic.

### 19.4 Authentication

-   Better Auth, subject to compatibility verification with the selected
    frontend/backend deployment.
-   Authentication identity must remain distinct from employee profile.
-   Enforce session validation, membership and permission checks
    server-side.

### 19.5 Deployment and operations

-   Docker.
-   Linux VPS deployment.
-   Environment-based configuration and secrets management.
-   Automated backups.
-   Tested restore procedure.
-   Structured logging and error monitoring.
-   Database migration process.
-   Secure transport (HTTPS).
-   Versioned API and sync payloads.

### 19.6 Architecture style

Use a modular monolith with clear domain boundaries, for example:

-   Identity and tenancy.
-   Workforce.
-   Purchasing and materials.
-   Recipes.
-   Production.
-   Costing.
-   Inventory.
-   Sales and customers.
-   Finance.
-   Reporting and dashboards.
-   Offline synchronization.

Do not split into microservices prematurely.

------------------------------------------------------------------------

## 20. Security, auditability and non-functional requirements

### 20.1 Security

-   Enforce tenant isolation server-side.
-   Enforce branch and role permissions.
-   Validate all API input.
-   Protect data in transit and at rest.
-   Secure authentication and sessions.
-   Avoid exposing data through reports, exports, search or sync
    endpoints.
-   Restrict sensitive operations to authorized roles.
-   Do not store secrets in frontend code or repository.
-   Apply least privilege to devices and user sessions.

### 20.2 Auditability and immutability

Audit sensitive changes, including:

-   Employee and compensation changes.
-   Shift and attendance corrections.
-   Baker output corrections and allocations.
-   Purchases and lot adjustments.
-   Recipe version changes.
-   Production finalization and reversal.
-   Rejections and recovery.
-   Overhead and labour allocations.
-   Inventory adjustments.
-   Sales, payments and customer ledger corrections.
-   Sync conflict resolution.
-   Permission changes.

Finalized production, inventory and financial history must not be
silently edited or deleted. Corrections must use explicit, authorized,
auditable adjustment/reversal records.

### 20.3 Reliability and usability

-   Mobile-first, desktop-compatible.
-   Fast operational forms.
-   Clear, simple language for business users.
-   Useful empty, loading, offline and error states.
-   No silent data loss.
-   Automated backups and tested restore.
-   Reliable decimal calculations.
-   Consistent timezone/date behavior.
-   Accessibility and keyboard support for core workflows.
-   Graceful handling of poor connectivity.

------------------------------------------------------------------------

## 21. API and domain-operation expectations

Use a versioned REST API. Organize endpoints around domain resources and
operations rather than exposing arbitrary database CRUD.

Examples of domain capabilities (exact routes may be designed during
implementation):

-   Business, branch, membership and permissions.
-   Employee, position, department, shift, attendance and leave.
-   Employee production assignments and baker output.
-   Material, unit, supplier, purchase and material lot.
-   Recipe and recipe version.
-   Blend operation and blend lot.
-   Production session, batch, consumption, output and rejection.
-   Overhead, labour cost and allocation.
-   Raw and finished inventory, movements and adjustments.
-   Customer, sale, payment, delivery and ledger.
-   Expenses and financial reports.
-   Dashboard layout and widgets.
-   Sync operation submission, status and conflict resolution.

Every endpoint must validate tenant membership, authorization, input
schema and state transition. Critical operations must execute in
database transactions.

------------------------------------------------------------------------

## 22. MVP implementation milestones

Implement one milestone at a time. Do not build the entire application
in one agent run.

### Milestone 1 --- Foundation

-   Repository and project structure.
-   Frontend/backend setup.
-   PostgreSQL and Prisma.
-   Initial schema and migrations.
-   Authentication.
-   Business registration.
-   Multi-tenant isolation.
-   Memberships, roles and permissions.
-   Branch/location foundation.
-   Business settings.
-   Basic audit infrastructure.

**Acceptance:** A user can register/sign in, create or join a business,
manage authorized memberships and access only that business's data.
Automated tests prove cross-tenant access is blocked.

### Milestone 2 --- Employee and workforce foundation

-   Employee directory.
-   Departments and job positions.
-   Employee status and branch assignment.
-   Shift definitions and employee shift assignments.
-   Day, night and custom shifts.
-   Overnight shift correctness.
-   Attendance and working hours.
-   Leave/absence records.
-   Initial employee/headcount reports.

**Acceptance:** A business can manage employees, schedule day/night
shifts, record attendance across midnight and report headcount and
attendance without confusing scheduled shifts with actual attendance.

### Milestone 3 --- Materials and purchasing

-   Material catalog and configurable categories/types.
-   Unit of measure and explicit conversions.
-   Suppliers.
-   Purchases and purchase items.
-   Gross, tare and unusable weight calculations.
-   Usable net weight and acquisition unit cost.
-   Material lots.
-   Lot movements and balances.
-   Low-stock indicators.

**Acceptance:** A purchase creates a distinct lot with correct usable
quantity and unit cost; historical purchase values remain unchanged;
partial consumption and movement reconciliation work.

### Milestone 4 --- Recipes and mixed teff

-   Recipe creation.
-   Recipe versions.
-   Ingredients and configurable teff varieties.
-   Variable reference batch size and scaling.
-   Manual expected-quantity adjustment.
-   Direct multi-variety/lot support.
-   Pre-mix/blending operations and traceable blend lots.

**Acceptance:** Recipe changes create versions; historical versions
remain stable; blend cost and source ancestry reconcile correctly.

### Milestone 5 --- Production sessions and batches

-   Production sessions.
-   Multiple batches per session.
-   Different recipe versions per batch.
-   Planned and actual consumption.
-   Exact material lot selection.
-   Variable barrel/batch size.
-   Production assignments.
-   Accepted/rejected output.
-   Multiple product outputs.
-   Simple and detailed rejection records.
-   Baker individual counting and supervisor allocation.
-   Output reconciliation and batch lifecycle.

**Acceptance:** A session can contain different recipe batches; each
batch consumes exact lots; output and rejections reconcile; baker
contributions reconcile to team output without double-counting.

### Milestone 6 --- Production costing and labour cost

-   Specific-lot material costing.
-   Batch overhead.
-   Daily shared overhead.
-   Allocation methods.
-   Labour compensation history.
-   Labour cost records.
-   Direct and shared labour allocation.
-   Multi-output cost allocation.
-   Accepted-unit costing.
-   Cost snapshots and immutable finalization.
-   Double-count prevention.

**Acceptance:** Calculated costs match known test scenarios; rejected
output cost is absorbed by accepted output; daily overhead and labour
are allocated exactly once; historical costs do not change after source
rates change.

### Milestone 7 --- Inventory

-   Raw-material stock views and valuation.
-   Finished product catalog.
-   Finished inventory lots.
-   Production-to-finished-stock posting.
-   FIFO stock rotation.
-   Sale-ready stock.
-   Freshness/expiry.
-   Stock transfers, damage and adjustments.
-   Movement-based balances and reconciliation.

**Acceptance:** Purchases, consumption, production, rejection and
adjustments produce correct raw/finished balances; rejected units never
enter sellable stock; all movements are traceable.

### Milestone 8 --- Sales, customers and finance

-   Sales and sale items.
-   Finished-stock lot allocation.
-   Payments and partial payments.
-   Credit sales.
-   Customer profiles and append-only ledger.
-   Repayments, due dates and overdue balances.
-   Delivery and distribution.
-   General expenses.
-   Financial reports and profitability metrics.
-   Cash versus credit/revenue separation.

**Acceptance:** Sales reduce correct finished lots; customer balances
reconcile to ledger; partial payments work; revenue, COGS, profit,
expenses and cash flow are not conflated.

### Milestone 9 --- Reporting and dashboard builder

-   Reporting API and aggregation layer.
-   Daily/weekly/monthly baker productivity reports.
-   Workforce and shift reports.
-   Production, stock, sales and financial reports.
-   Dashboard widgets.
-   Add/remove/rearrange/resize.
-   Date-range selection.
-   Per-user/per-business saved layouts.
-   Permission-aware reporting.

**Acceptance:** Reports reconcile with source records; layouts persist;
dashboard customization cannot change business calculations or bypass
permissions.

### Milestone 10 --- Offline PWA and synchronization

-   PWA manifest and service worker.
-   IndexedDB data model.
-   Offline operation queue.
-   Offline attendance, purchases, production, baker output, sales,
    payments and expenses.
-   Idempotent sync API.
-   Retry and status visibility.
-   Duplicate prevention.
-   Multi-device stock conflict detection.
-   Authorized conflict resolution.
-   Restart/recovery tests.

**Acceptance:** Offline transactions survive application restart and
synchronize without loss or duplication; concurrent offline stock
consumption is detected and never silently produces negative
authoritative inventory.

The milestone order may be refined only when dependencies require it. Do
not skip the tests or business invariants of an earlier milestone.

------------------------------------------------------------------------

## 23. Required acceptance scenarios

Implement automated tests for at least these scenarios. Add unit,
integration and end-to-end coverage appropriate to each milestone.

### A. Purchase lots with different prices

Purchase the same teff at different prices. Consume from both lots in
one batch. Verify that each consumed quantity uses its own historical
lot unit cost.

### B. Variable recipe scaling

Scale a recipe to a variable batch quantity. Adjust actual consumption.
Verify costing uses actual consumption, not only scaled estimates.

### C. Multiple teff varieties

Consume two teff varieties from different lots. Verify each variety/lot
cost is calculated independently and summed correctly.

### D. Pre-mixed teff

Blend multiple lots. Calculate usable blend quantity and unit cost,
account for processing loss, preserve source traceability, then consume
the blend lot in production.

### E. Multiple recipes in one session

Create one session with two batches using different recipes. Verify
independent consumption, output and costs, plus correct session totals.

### F. Rejections

Record actual output, accepted quantity, rejected quantity and rejection
reasons. Verify only accepted units enter finished inventory and
rejected cost is absorbed by accepted yield.

### G. Overhead allocation

Record daily fuel overhead and batch-level labour. Allocate once. Verify
no duplicate inclusion and that allocated totals equal source totals.

### H. Full inventory lifecycle

Purchase, consume, produce, sell and reconcile every raw and finished
stock movement.

### I. Offline transaction lifecycle

Record offline production and sales, restart the application, reconnect
and sync. Verify no lost or duplicate transactions.

### J. Overnight shifts

Schedule a night shift that starts on one date and ends the next. Verify
attendance duration, shift association and reporting date are correct.

### K. Baker productivity

Record a batch produced by multiple bakers. Use individual counting and
supervisor allocation in separate test cases. Verify each baker's daily,
weekly and monthly totals and ensure team output is not duplicated.

### L. Labour cost allocation

Record employee compensation and attendance across multiple batches.
Allocate labour by hours. Verify allocation totals equal the source
labour cost and no employee cost is counted twice.

### M. Tenant isolation

Attempt to read, update, allocate, report or synchronize another
business's records. Every unauthorized attempt must fail.

### N. Immutable historical cost

Finalize a batch, then change recipe, material purchase prices,
compensation rates or allocation settings. Verify the finalized batch
cost remains unchanged.

------------------------------------------------------------------------

## 24. Implementation quality gates

Every milestone must include all of the following before it is reported
complete:

1.  Working implementation of the milestone scope.
2.  Database migrations where schema changes are needed.
3.  Automated tests for business rules and critical edge cases.
4.  API validation and authorization.
5.  Tenant isolation tests for affected resources.
6.  Error, loading, empty and permission-denied UI states.
7.  Documentation updates.
8.  Seed/demo data where useful.
9.  A completion report listing:
    -   Implemented features.
    -   Files/modules changed.
    -   Migrations created.
    -   Tests run and results.
    -   Known limitations.
    -   Unresolved decisions.
    -   Exact next milestone and prerequisites.

Do not claim a milestone is complete when tests are missing, migrations
are unapplied, core acceptance criteria fail or known data-integrity
issues remain.

### 24.1 Coding-agent workflow

For each milestone:

1.  Read this `AGENT.md` and identify the relevant requirements.
2.  Inspect the existing repository before changing anything.
3.  Report the current state and proposed implementation plan.
4.  Identify dependencies and any genuinely unresolved decisions.
5.  Implement only the approved milestone scope.
6.  Add/update migrations.
7.  Add tests alongside implementation.
8.  Run formatting, linting, type checking, tests and build.
9.  Fix failures rather than hiding or bypassing them.
10. Update documentation and provide the completion report.
11. Do not begin the next milestone unless instructed or explicitly
    authorized by the project owner.

### 24.2 Repository discipline

-   Use clear domain-oriented module boundaries.
-   Avoid giant files and duplicated business logic.
-   Keep business rules in testable domain/service layers, not only UI
    components.
-   Keep API contracts typed and validated.
-   Use database transactions for critical multi-record operations.
-   Do not bypass authorization for convenience.
-   Do not use floating-point arithmetic for money/costs.
-   Do not silently delete business records.
-   Do not fabricate test results or claim commands were run when they
    were not.
-   Do not introduce unnecessary dependencies or microservices.
-   Keep secrets and local environment files out of version control.
-   Document important trade-offs and decisions.

------------------------------------------------------------------------

## 25. Important invariants --- never violate

1.  Production cost is based on actual consumed quantities and specific
    historical material lots.
2.  Purchase history and material lot unit costs are immutable.
3.  Recipe changes create versions; historical batches retain their
    original version.
4.  Barrel and batch quantities are variable.
5.  A production session may contain multiple batches and recipes.
6.  Actual output equals accepted plus rejected output.
7.  Rejected injera never enters sellable finished stock.
8.  Rejected output cost is absorbed by accepted sellable output,
    subject to zero-accepted-output handling.
9.  Multiple output products must receive allocations that sum exactly
    to total batch cost.
10. Baker contributions must not duplicate team output.
11. Individual baker output and supervisor allocation must both be
    supported and identified per record.
12. Day and night shifts must support shifts crossing midnight.
13. Scheduled shifts and actual attendance are separate.
14. Compensation history must not rewrite historical labour costs.
15. Batch, daily overhead and labour costs must never be double-counted.
16. Stock balances must reconcile to stock movements.
17. Customer balances must reconcile to append-only ledger entries.
18. Sales revenue and cash collected are different metrics.
19. Finalized production, inventory and financial history cannot be
    silently edited or deleted.
20. Tenant isolation is enforced on the server and in synchronization.
21. Offline operations must be idempotent and recoverable.
22. Conflicting offline stock operations must never silently create
    negative authoritative inventory.
23. Dashboard customization must not alter underlying calculations or
    permissions.
24. Use decimal-safe arithmetic for all financial and quantity
    calculations where precision matters.

------------------------------------------------------------------------

## 26. First instruction to the coding agent

**Do not start implementing the entire application.**

First inspect the repository and report:

1.  Whether the repository is empty or already contains code.
2.  Existing frontend/backend/database setup.
3.  Existing package manager and scripts.
4.  Existing schema and migrations, if any.
5.  Any existing implementation that overlaps this specification.
6.  Any conflicts between the repository and this document.

Then propose a concrete implementation plan for **Milestone 1 ---
Foundation only**. Wait for approval before making broad changes. If the
project owner has already explicitly authorized implementation of
Milestone 1, proceed only within that milestone and satisfy all quality
gates above.

------------------------------------------------------------------------

**End of authoritative product and implementation brief.**
