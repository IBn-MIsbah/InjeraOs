import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { TestAgent } from './test-helper.js'
import { prisma } from '../src/lib/prisma.js'

test('Milestone 9: Expenses, Financial Reporting & Dashboard Builder Suite', async (t) => {
  const agentA = new TestAgent()
  const agentB = new TestAgent()
  await agentA.start()
  agentB.baseUrl = agentA.baseUrl

  t.after(async () => {
    await agentA.close()
  })

  // Tenant A IDs
  let businessAId: string
  let branchAId: string
  let rentCategoryId: string
  let elecCategoryId: string
  let inactiveCategoryId: string
  let expense1Id: string
  let expense2Id: string
  let expenseToCancelId: string

  // Financial reporting entity IDs
  let unitKgId: string
  let teffMaterialId: string
  let product1Id: string
  let locationId: string
  let customerId: string
  let saleId: string

  // Dashboard layout ID
  let layoutId: string

  // Tenant B IDs
  let businessBId: string

  // 1. Setup Tenant A
  await t.test('1. Setup Tenant A workspace and baseline fixtures', async () => {
    const regRes = await agentA.post('/api/auth/register', {
      name: 'Tenant A Finance Owner',
      email: `owner-finance-a-${Date.now()}@bakery.et`,
      password: 'Password123!',
      businessName: 'Addis Financial Bakery Hub',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    })
    assert.equal(regRes.status, 201)
    businessAId = regRes.body.data.business.id

    const branchRes = await agentA.post('/api/branches', {
      name: 'Addis Finance Branch',
      code: 'FIN-01',
      isMain: true,
    })
    assert.equal(branchRes.status, 201)
    branchAId = branchRes.body.data.id

    // Setup Tenant B
    const regB = await agentB.post('/api/auth/register', {
      name: 'Tenant B Finance Owner',
      email: `owner-finance-b-${Date.now()}@bakery.et`,
      password: 'Password123!',
      businessName: 'Rival Bakery Corp',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    })
    assert.equal(regB.status, 201)
    businessBId = regB.body.data.business.id
  })

  // 2. Expense Category Management
  await t.test('2. Create, validate, and update expense categories', async () => {
    // Create Operating Rent category
    const cat1 = await agentA.post('/api/expenses/categories', {
      name: 'Bakery Facility Rent',
      categoryType: 'OPERATING',
      isActive: true,
    })
    assert.equal(cat1.status, 201)
    rentCategoryId = cat1.body.data.id
    assert.equal(cat1.body.data.name, 'Bakery Facility Rent')

    // Create Electricity category
    const cat2 = await agentA.post('/api/expenses/categories', {
      name: 'Electricity & Power',
      categoryType: 'OPERATING',
      isActive: true,
    })
    assert.equal(cat2.status, 201)
    elecCategoryId = cat2.body.data.id

    // Create Inactive category
    const cat3 = await agentA.post('/api/expenses/categories', {
      name: 'Old Generator Diesel',
      categoryType: 'MAINTENANCE',
      isActive: false,
    })
    assert.equal(cat3.status, 201)
    inactiveCategoryId = cat3.body.data.id

    // Reject duplicate category name in same business
    const dupRes = await agentA.post('/api/expenses/categories', {
      name: 'Bakery Facility Rent',
      categoryType: 'OPERATING',
    })
    assert.equal(dupRes.status, 409)

    // Update category
    const updRes = await agentA.patch(`/api/expenses/categories/${cat2.body.data.id}`, {
      name: 'Electricity, Mitad Power & Water',
    })
    assert.equal(updRes.status, 200)
    assert.equal(updRes.body.data.name, 'Electricity, Mitad Power & Water')

    // List categories
    const listRes = await agentA.get('/api/expenses/categories')
    assert.equal(listRes.status, 200)
    assert.equal(listRes.body.data.length >= 3, true)
  })

  // 3. Operating Expense Recording
  await t.test('3. Record, query, and cancel operating expenses', async () => {
    // Record Rent Expense (ETB 5,000)
    const exp1 = await agentA.post('/api/expenses', {
      branchId: branchAId,
      categoryId: rentCategoryId,
      amount: 5000,
      paymentMethod: 'BANK_TRANSFER',
      description: 'Monthly facility rent payment',
      referenceNumber: 'RENT-2026-03',
    })
    assert.equal(exp1.status, 201)
    expense1Id = exp1.body.data.id
    assert.equal(exp1.body.data.amount, 5000)
    assert.equal(exp1.body.data.categoryName, 'Bakery Facility Rent')

    // Record Power Expense (ETB 1,200)
    const exp2 = await agentA.post('/api/expenses', {
      branchId: branchAId,
      categoryId: elecCategoryId,
      amount: 1200,
      paymentMethod: 'CASH',
      description: 'Electric utility bill for mitads',
    })
    assert.equal(exp2.status, 201)
    expense2Id = exp2.body.data.id

    // Reject expense for inactive category
    const inactRes = await agentA.post('/api/expenses', {
      branchId: branchAId,
      categoryId: inactiveCategoryId,
      amount: 800,
      paymentMethod: 'CASH',
    })
    assert.equal(inactRes.status, 400)
    assert.equal(inactRes.body.message, 'Expense category is inactive')

    // Record expense to be cancelled
    const expCancel = await agentA.post('/api/expenses', {
      branchId: branchAId,
      categoryId: elecCategoryId,
      amount: 300,
      paymentMethod: 'CASH',
      description: 'Accidental duplicate entry',
    })
    assert.equal(expCancel.status, 201)
    expenseToCancelId = expCancel.body.data.id

    // Cancel expense
    const cancelRes = await agentA.post(`/api/expenses/${expenseToCancelId}/cancel`, {})
    assert.equal(cancelRes.status, 200)
    assert.equal(cancelRes.body.data.status, 'CANCELLED')

    // Query active recorded expenses
    const listExp = await agentA.get(`/api/expenses?status=RECORDED&branchId=${branchAId}`)
    assert.equal(listExp.status, 200)
    assert.equal(listExp.body.data.length, 2)
    const totalExp = listExp.body.data.reduce((s: number, e: any) => s + e.amount, 0)
    assert.equal(totalExp, 6200) // 5000 + 1200
  })

  // 4. Financial Report & Profitability Calculations
  await t.test('4. Setup sales & inventory to verify financial reporting calculations', async () => {
    // Setup unit & raw material
    const unitRes = await agentA.post('/api/materials/units', {
      name: 'Kilogram',
      symbol: 'kg',
      dimension: 'MASS',
      isBaseUnit: true,
    })
    assert.equal(unitRes.status, 201)
    unitKgId = unitRes.body.data.id

    const unitPcsRes = await agentA.post('/api/materials/units', {
      name: 'Piece',
      symbol: 'pcs',
      dimension: 'COUNT',
      isBaseUnit: true,
    })
    assert.equal(unitPcsRes.status, 201)
    const unitPcsId = unitPcsRes.body.data.id

    const catRes = await agentA.post('/api/materials/categories', {
      name: 'Raw Teff Flours',
    })
    assert.equal(catRes.status, 201)

    const matRes = await agentA.post('/api/materials', {
      categoryId: catRes.body.data.id,
      name: 'Magna White Teff',
      defaultUnitId: unitKgId,
      minimumStock: 100,
    })
    assert.equal(matRes.status, 201)
    teffMaterialId = matRes.body.data.id

    // Setup Supplier & Purchase Lot for valuation
    const suppRes = await agentA.post('/api/materials/suppliers', {
      name: 'Gojjam Teff Cooperatives',
      phone: '+251911223344',
    })
    assert.equal(suppRes.status, 201)
    const supplierId = suppRes.body.data.id

    const purchRes = await agentA.post('/api/materials/purchases', {
      supplierId,
      branchId: branchAId,
      purchaseNumber: `PUR-FIN-${Date.now()}`,
      purchaseDate: new Date().toISOString(),
      acquisitionCost: 0,
      paymentStatus: 'PAID',
      receiveImmediately: true,
      items: [
        {
          materialId: teffMaterialId,
          unitId: unitKgId,
          grossQuantity: 200,
          tareQuantity: 0,
          unusableQuantity: 0,
          purchaseCost: 15000, // 200 * 75 = 15,000 raw material valuation
        },
      ],
    })
    assert.equal(purchRes.status, 201)

    // Setup Finished Product
    const prodRes = await agentA.post('/api/recipes/products', {
      name: 'Standard Injera (52cm)',
      productCode: 'INJ-STD',
      size: '52cm',
      unitId: unitPcsId,
      defaultSellingPrice: 15.0,
      description: 'Standard Teff Injera',
    })
    assert.equal(prodRes.status, 201)
    product1Id = prodRes.body.data.id

    // Setup Location & Finished Lot
    const locRes = await agentA.post('/api/inventory/locations', {
      branchId: branchAId,
      name: 'Finished Cooling Racks',
    })
    assert.equal(locRes.status, 201)
    locationId = locRes.body.data.id

    await prisma.finishedInventoryLot.create({
      data: {
        businessId: businessAId,
        branchId: branchAId,
        productId: product1Id,
        productionBatchId: crypto.randomUUID(),
        productionOutputId: crypto.randomUUID(),
        stockLocationId: locationId,
        productionDate: new Date(),
        expiryAt: new Date(Date.now() + 72 * 3600 * 1000),
        originalQuantity: 500,
        remainingQuantity: 500,
        unitCost: 8.0,
        status: 'AVAILABLE',
      },
    })

    // Setup Customer & Sale Order
    const custRes = await agentA.post('/api/sales/customers', {
      name: 'Yod Abyssinia Restaurant',
      phone: '+251911000111',
      customerType: 'RESTAURANT',
      creditLimit: 10000,
    })
    assert.equal(custRes.status, 201)
    customerId = custRes.body.data.id

    // Sale: 200 units @ ETB 15.00 = ETB 3,000 Revenue
    // COGS = 200 units * ETB 8.00 = ETB 1,600
    // Gross Profit = 3,000 - 1,600 = 1,400
    // Gross Margin % = (1,400 / 3,000) * 100 = 46.67%
    // Upfront Payment = ETB 1,000 -> Customer Credit Balance = ETB 2,000
    const saleRes = await agentA.post('/api/sales', {
      branchId: branchAId,
      customerId,
      saleNumber: `INV-TEST-${Date.now()}`,
      items: [
        {
          productId: product1Id,
          quantity: 200,
          unitPrice: 15.0,
        },
      ],
      payment: {
        amount: 1000,
        paymentMethod: 'CASH',
        referenceNumber: 'CASH-REC-01',
      },
    })
    assert.equal(saleRes.status, 201)
    saleId = saleRes.body.data.id

    // Verify Financial Report Endpoint
    const finRes = await agentA.get('/api/reports/financial')
    assert.equal(finRes.status, 200)

    const fin = finRes.body.data
    assert.equal(fin.profitability.revenue, 3000)
    assert.equal(fin.profitability.cogs, 1600)
    assert.equal(fin.profitability.grossProfit, 1400)
    assert.equal(Math.round(fin.profitability.grossMarginPercent), 47) // ~46.67%
    assert.equal(fin.profitability.operatingExpenses, 6200) // 5000 + 1200
    assert.equal(fin.profitability.netOperatingProfit, 1400 - 6200) // -4800
    assert.equal(fin.cashFlowAndCredit.cashCollected, 1000)
    assert.equal(fin.cashFlowAndCredit.accountsReceivable, 2000)
  })

  // 5. Inventory Valuation Report
  await t.test('5. Inventory valuation accurately sums raw and finished stock', async () => {
    const valRes = await agentA.get('/api/reports/inventory-valuation')
    assert.equal(valRes.status, 200)

    const val = valRes.body.data
    // Raw material: 200 kg @ 75 = 15,000
    assert.equal(val.rawMaterials.totalValuation, 15000)
    // Finished goods: originally 500 - 200 sold = 300 remaining @ 8.00 = 2,400
    assert.equal(val.finishedGoods.totalValuation, 2400)
    assert.equal(val.totalInventoryValuation, 15000 + 2400) // 17,400
  })

  // 6. Dashboard Summary Report
  await t.test('6. Executive dashboard summary report returns consolidated KPIs', async () => {
    const sumRes = await agentA.get('/api/reports/dashboard-summary')
    assert.equal(sumRes.status, 200)

    const sum = sumRes.body.data
    assert.equal(sum.today.revenue, 3000)
    assert.equal(sum.today.orderCount, 1)
    assert.equal(sum.operations.totalReceivables, 2000)
    assert.equal(sum.operations.activeCustomersCount >= 1, true)
  })

  // 7. Dashboard Layouts & Widgets Builder
  await t.test('7. Create, query, update, and delete customizable dashboard layouts', async () => {
    // Create Layout with 3 widgets
    const createLayoutRes = await agentA.post('/api/dashboards', {
      name: 'Executive Production & Sales View',
      isDefault: true,
      widgets: [
        {
          widgetType: 'FINANCIAL_METRICS_CARD',
          title: 'Daily Gross Profit & Margin',
          positionX: 0,
          positionY: 0,
          width: 6,
          height: 4,
          configuration: { metric: 'GROSS_MARGIN' },
        },
        {
          widgetType: 'INVENTORY_STOCK_LEVELS',
          title: 'Available Finished Goods',
          positionX: 6,
          positionY: 0,
          width: 6,
          height: 4,
          configuration: { view: 'FIFO_AVAILABLE' },
        },
        {
          widgetType: 'RECEIVABLES_SUMMARY',
          title: 'Outstanding Customer Credit',
          positionX: 0,
          positionY: 4,
          width: 12,
          height: 3,
          configuration: { alertOverLimit: true },
        },
      ],
    })
    assert.equal(createLayoutRes.status, 201)
    layoutId = createLayoutRes.body.data.id
    assert.equal(createLayoutRes.body.data.name, 'Executive Production & Sales View')
    assert.equal(createLayoutRes.body.data.widgets.length, 3)

    // Get Layout Details
    const getLayoutRes = await agentA.get(`/api/dashboards/${layoutId}`)
    assert.equal(getLayoutRes.status, 200)
    assert.equal(getLayoutRes.body.data.id, layoutId)
    assert.equal(getLayoutRes.body.data.widgets.length, 3)

    // Update Layout: Rearrange & rename widget
    const updateLayoutRes = await agentA.put(`/api/dashboards/${layoutId}`, {
      name: 'Executive Master Dashboard',
      isDefault: true,
      widgets: [
        {
          widgetType: 'FINANCIAL_METRICS_CARD',
          title: 'Revenue & Gross Profit',
          positionX: 0,
          positionY: 0,
          width: 12,
          height: 4,
          configuration: { showTrends: true },
        },
      ],
    })
    assert.equal(updateLayoutRes.status, 200)
    assert.equal(updateLayoutRes.body.data.name, 'Executive Master Dashboard')
    assert.equal(updateLayoutRes.body.data.widgets.length, 1)

    // List Layouts
    const listLayoutsRes = await agentA.get('/api/dashboards')
    assert.equal(listLayoutsRes.status, 200)
    assert.equal(listLayoutsRes.body.data.length, 1)
    assert.equal(listLayoutsRes.body.data[0].widgetCount, 1)

    // Delete Layout
    const delRes = await agentA.delete(`/api/dashboards/${layoutId}`)
    assert.equal(delRes.status, 200)

    const verifyDel = await agentA.get(`/api/dashboards/${layoutId}`)
    assert.equal(verifyDel.status, 404)
  })

  // 8. Cross-Tenant Isolation
  await t.test('8. Cross-tenant isolation prevents Tenant B access to Tenant A financial data', async () => {
    // Tenant B cannot view Tenant A's expense categories
    const bCatRes = await agentB.get('/api/expenses/categories')
    assert.equal(bCatRes.status, 200)
    assert.equal(bCatRes.body.data.length, 0) // Tenant B has no categories yet

    // Tenant B cannot view Tenant A's expenses
    const bExpRes = await agentB.get('/api/expenses')
    assert.equal(bExpRes.status, 200)
    assert.equal(bExpRes.body.data.length, 0)

    // Tenant B accessing Tenant A's expense by ID -> 404
    const bExpGet = await agentB.get(`/api/expenses/${expense1Id}`)
    assert.equal(bExpGet.status, 404)

    // Tenant B cancel Tenant A's expense -> 404
    const bExpCancel = await agentB.post(`/api/expenses/${expense1Id}/cancel`, {})
    assert.equal(bExpCancel.status, 404)

    // Tenant B financial report returns zeroed data
    const bFin = await agentB.get('/api/reports/financial')
    assert.equal(bFin.status, 200)
    assert.equal(bFin.body.data.profitability.revenue, 0)
    assert.equal(bFin.body.data.profitability.cogs, 0)
    assert.equal(bFin.body.data.profitability.operatingExpenses, 0)
    assert.equal(bFin.body.data.cashFlowAndCredit.accountsReceivable, 0)
  })
})
