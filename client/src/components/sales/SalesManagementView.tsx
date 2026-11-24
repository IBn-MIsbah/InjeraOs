import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import {
  salesApi,
  recipesApi,
  branchesApi,
  workforceApi,
  inventoryApi,
  type CustomerEntity,
  type SaleEntity,
  type PaymentEntity,
  type SaleItemEntity,
  type DeliveryEntity,
  type DeliveryItemEntity,
  type CustomerStatementReport,
  type CustomerLedgerEntryEntity,
  type FinishedProductEntity,
  type BranchEntity,
  type EmployeeEntity,
  type FinishedInventoryLotEntity,
} from '@/lib/api'
import type {
  CreateCustomerInput,
  CreateSaleInput,
  SaleItemInput,
  RecordPaymentInput,
  RecordLedgerAdjustmentInput,
  CreateDeliveryInput,
  UpdateDeliveryStatusInput,
} from '@/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ShoppingCart,
  Users,
  Truck,
  Plus,
  RefreshCw,
  Search,
  DollarSign,
  FileText,
  AlertTriangle,
  CreditCard,
  Ban,
  Receipt,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

type SubTab = 'pos' | 'customers' | 'deliveries'

export function SalesManagementView() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('pos')
  const [isLoading, setIsLoading] = useState(false)

  // Data states
  const [sales, setSales] = useState<SaleEntity[]>([])
  const [customers, setCustomers] = useState<CustomerEntity[]>([])
  const [deliveries, setDeliveries] = useState<DeliveryEntity[]>([])
  const [products, setProducts] = useState<FinishedProductEntity[]>([])
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [employees, setEmployees] = useState<EmployeeEntity[]>([])
  const [saleReadyStock, setSaleReadyStock] = useState<FinishedInventoryLotEntity[]>([])

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all')
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>('all')
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false)
  const [isSaleDetailModalOpen, setIsSaleDetailModalOpen] = useState(false)
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleEntity | null>(null)
  const [isCancelSaleModalOpen, setIsCancelSaleModalOpen] = useState(false)
  const [saleToCancel, setSaleToCancel] = useState<SaleEntity | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false)
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false)
  const [customerStatement, setCustomerStatement] = useState<CustomerStatementReport | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<CustomerEntity | null>(null)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [selectedCustomerForAdjustment, setSelectedCustomerForAdjustment] = useState<CustomerEntity | null>(null)

  const [isScheduleDeliveryModalOpen, setIsScheduleDeliveryModalOpen] = useState(false)
  const [isUpdateDeliveryModalOpen, setIsUpdateDeliveryModalOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryEntity | null>(null)

  // Form states: New Customer
  const [newCustomerForm, setNewCustomerForm] = useState<CreateCustomerInput>({
    name: '',
    phone: '',
    address: '',
    customerType: 'INDIVIDUAL',
    creditLimit: 0,
  })

  // Form states: New POS Sale
  const [saleBranchId, setSaleBranchId] = useState<string>('')
  const [saleCustomerId, setSaleCustomerId] = useState<string>('') // empty = walk-in
  const [saleNumber, setSaleNumber] = useState<string>('')
  const [saleDiscount, setSaleDiscount] = useState<number>(0)
  const [saleCartItems, setSaleCartItems] = useState<SaleItemInput[]>([])
  const [currentItemProductId, setCurrentItemProductId] = useState<string>('')
  const [currentItemQty, setCurrentItemQty] = useState<number>(1)
  const [currentItemPrice, setCurrentItemPrice] = useState<number>(15)
  const [currentItemDiscount, setCurrentItemDiscount] = useState<number>(0)
  const [hasUpfrontPayment, setHasUpfrontPayment] = useState<boolean>(true)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER'>('CASH')
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('')

  // Form states: Repayment
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0)
  const [repaymentMethod, setRepaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER'>('CASH')
  const [repaymentRef, setRepaymentRef] = useState<string>('')

  // Form states: Ledger Adjustment
  const [adjustmentDirection, setAdjustmentDirection] = useState<'DEBIT' | 'CREDIT'>('CREDIT')
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0)
  const [adjustmentReason, setAdjustmentReason] = useState<string>('')

  // Form states: Delivery
  const [deliveryBranchId, setDeliveryBranchId] = useState<string>('')
  const [deliveryCustomerId, setDeliveryCustomerId] = useState<string>('')
  const [deliverySaleId, setDeliverySaleId] = useState<string>('')
  const [deliveryEmployeeId, setDeliveryEmployeeId] = useState<string>('')
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [deliveryNotes, setDeliveryNotes] = useState<string>('')
  const [deliveryItems, setDeliveryItems] = useState<{ productId: string; quantity: number }[]>([])
  const [currentDelivProdId, setCurrentDelivProdId] = useState<string>('')
  const [currentDelivQty, setCurrentDelivQty] = useState<number>(1)

  // Form states: Update Delivery Status
  const [updateDelivStatus, setUpdateDelivStatus] = useState<'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'>('DELIVERED')
  const [updateDelivNotes, setUpdateDelivNotes] = useState<string>('')
  const [updateDelivItemQuantities, setUpdateDelivItemQuantities] = useState<Record<string, number>>({})

  // Fetch initial data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [
        salesData,
        customersData,
        deliveriesData,
        productsData,
        branchesData,
        employeesData,
        stockData,
      ] = await Promise.all([
        salesApi.getSales(),
        salesApi.getCustomers(),
        salesApi.getDeliveries(),
        recipesApi.getProducts(),
        branchesApi.getBranches(),
        workforceApi.getEmployees(),
        inventoryApi.getSaleReadyStock(),
      ])
      setSales(salesData)
      setCustomers(customersData)
      setDeliveries(deliveriesData)
      setProducts(productsData)
      setBranches(branchesData)
      setEmployees(employeesData)
      setSaleReadyStock(stockData)

      if (branchesData.length > 0 && !saleBranchId) {
        setSaleBranchId(branchesData[0].id)
        setDeliveryBranchId(branchesData[0].id)
      }
      if (productsData.length > 0 && !currentItemProductId) {
        setCurrentItemProductId(productsData[0].id)
        setCurrentDelivProdId(productsData[0].id)
      }
    } catch (err) {
      console.error('Failed to load sales data', err)
      toast.error('Failed to load sales data')
    } finally {
      setIsLoading(false)
    }
  }, [saleBranchId, currentItemProductId])

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [
          salesData,
          customersData,
          deliveriesData,
          productsData,
          branchesData,
          employeesData,
          stockData,
        ] = await Promise.all([
          salesApi.getSales(),
          salesApi.getCustomers(),
          salesApi.getDeliveries(),
          recipesApi.getProducts(),
          branchesApi.getBranches(),
          workforceApi.getEmployees(),
          inventoryApi.getSaleReadyStock(),
        ])
        if (!isMounted) return
        setSales(salesData)
        setCustomers(customersData)
        setDeliveries(deliveriesData)
        setProducts(productsData)
        setBranches(branchesData)
        setEmployees(employeesData)
        setSaleReadyStock(stockData)

        if (branchesData.length > 0) {
          setSaleBranchId(branchesData[0].id)
          setDeliveryBranchId(branchesData[0].id)
        }
        if (productsData.length > 0) {
          setCurrentItemProductId(productsData[0].id)
          setCurrentDelivProdId(productsData[0].id)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to initialize sales data', err)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  // Calculations for current cart
  const cartSubtotal = saleCartItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice - (item.discount || 0),
    0
  )
  const cartTotal = Math.max(0, cartSubtotal - saleDiscount)

  // Calculate remaining stock for selected product at selected branch
  const getProductAvailableStock = (prodId: string, brId: string) => {
    return saleReadyStock
      .filter((lot) => lot.productId === prodId && lot.branchId === brId)
      .reduce((sum, lot) => sum + lot.remainingQuantity, 0)
  }

  const selectedCustomerObj = customers.find((c) => c.id === saleCustomerId)

  // Open New Sale Modal
  const handleOpenNewSale = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    setSaleNumber(`INV-${dateStr}-${randomSuffix}`)
    setSaleCartItems([])
    setSaleDiscount(0)
    setPaymentAmount(0)
    setHasUpfrontPayment(true)
    setPaymentRefNumber('')
    setIsNewSaleModalOpen(true)
  }

  // Add Item to Sale Cart
  const handleAddToCart = () => {
    if (!currentItemProductId || currentItemQty <= 0 || currentItemPrice <= 0) {
      toast.error('Please enter valid product, quantity, and unit price')
      return
    }

    const avail = getProductAvailableStock(currentItemProductId, saleBranchId)
    const existingInCart = saleCartItems
      .filter((i) => i.productId === currentItemProductId)
      .reduce((s, i) => s + i.quantity, 0)

    if (existingInCart + currentItemQty > avail) {
      toast.warning(
        `Notice: Available finished stock is ${avail} units. Backorder or FIFO allocation might fail if unreserved stock is lower.`
      )
    }

    const newItem: SaleItemInput = {
      productId: currentItemProductId,
      quantity: currentItemQty,
      unitPrice: currentItemPrice,
      discount: currentItemDiscount,
    }

    setSaleCartItems([...saleCartItems, newItem])
    // Update upfront payment default to new total
    const newSub =
      cartSubtotal + currentItemQty * currentItemPrice - currentItemDiscount
    const newTot = Math.max(0, newSub - saleDiscount)
    if (hasUpfrontPayment) {
      setPaymentAmount(newTot)
    }
    setCurrentItemQty(1)
    setCurrentItemDiscount(0)
  }

  const handleRemoveFromCart = (index: number) => {
    const updated = saleCartItems.filter((_, i) => i !== index)
    setSaleCartItems(updated)
    const newSub = updated.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice - (item.discount || 0),
      0
    )
    const newTot = Math.max(0, newSub - saleDiscount)
    if (hasUpfrontPayment) {
      setPaymentAmount(newTot)
    }
  }

  // Submit Sale Order
  const handleCreateSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!saleBranchId) {
      toast.error('Branch is required')
      return
    }
    if (saleCartItems.length === 0) {
      toast.error('Please add at least one item to the sale')
      return
    }

    // Invariant check: Walk-in customers cannot make credit purchases
    if (!saleCustomerId) {
      if (!hasUpfrontPayment || paymentAmount < cartTotal) {
        toast.error('Walk-in customers must pay in full. Credit sales require a registered customer.')
        return
      }
    }

    // Invariant check: Customer credit limit check preview
    if (selectedCustomerObj && selectedCustomerObj.creditLimit !== null) {
      const unpaidPortion = Math.max(0, cartTotal - (hasUpfrontPayment ? paymentAmount : 0))
      const currentBal = selectedCustomerObj.derivedBalance || 0
      if (currentBal + unpaidPortion > selectedCustomerObj.creditLimit) {
        toast.error(
          `Customer credit limit exceeded! Limit: ETB ${selectedCustomerObj.creditLimit.toFixed(2)}, Current Debt: ETB ${currentBal.toFixed(2)}, Proposed Unpaid: ETB ${unpaidPortion.toFixed(2)}`
        )
        return
      }
    }

    try {
      const payload: CreateSaleInput = {
        branchId: saleBranchId,
        customerId: saleCustomerId || null,
        saleNumber,
        discount: saleDiscount,
        items: saleCartItems,
        payment:
          hasUpfrontPayment && paymentAmount > 0
            ? {
                amount: paymentAmount,
                paymentMethod,
                referenceNumber: paymentRefNumber || null,
              }
            : null,
      }

      await salesApi.createSale(payload)
      toast.success('Sale order completed and finished inventory allocated via FIFO!')
      setIsNewSaleModalOpen(false)
      await loadData()
    } catch (err: unknown) {
      console.error('Failed to create sale', err)
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to record sale')
      }
    }
  }

  // View Sale Details
  const handleViewSale = async (sale: SaleEntity) => {
    try {
      const full = await salesApi.getSale(sale.id)
      setSelectedSaleDetail(full)
      setIsSaleDetailModalOpen(true)
    } catch {
      setSelectedSaleDetail(sale)
      setIsSaleDetailModalOpen(true)
    }
  }

  // Cancel Sale
  const handleConfirmCancelSale = async () => {
    if (!saleToCancel) return
    try {
      await salesApi.cancelSale(saleToCancel.id, cancelReason)
      toast.success('Sale cancelled. Finished stock returned to inventory and ledger reversed.')
      setIsCancelSaleModalOpen(false)
      setSaleToCancel(null)
      setCancelReason('')
      if (isSaleDetailModalOpen) {
        setIsSaleDetailModalOpen(false)
      }
      await loadData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to cancel sale')
      }
    }
  }

  // Customer Statement
  const handleViewStatement = async (cust: CustomerEntity) => {
    try {
      const st = await salesApi.getCustomerStatement(cust.id)
      setCustomerStatement(st)
      setIsStatementModalOpen(true)
    } catch {
      toast.error('Failed to fetch customer statement')
    }
  }

  // Create Customer Submit
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await salesApi.createCustomer(newCustomerForm)
      toast.success('Customer registered successfully')
      setIsNewCustomerModalOpen(false)
      setNewCustomerForm({
        name: '',
        phone: '',
        address: '',
        customerType: 'INDIVIDUAL',
        creditLimit: 0,
      })
      await loadData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to register customer')
      }
    }
  }

  // Repayment Submit
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerForPayment || repaymentAmount <= 0) {
      toast.error('Please enter a valid repayment amount')
      return
    }

    try {
      const payload: RecordPaymentInput = {
        customerId: selectedCustomerForPayment.id,
        amount: repaymentAmount,
        paymentMethod: repaymentMethod,
        referenceNumber: repaymentRef || null,
      }
      await salesApi.recordPayment(payload)
      toast.success('Repayment recorded! Customer credit ledger credited and sales updated.')
      setIsPaymentModalOpen(false)
      setSelectedCustomerForPayment(null)
      setRepaymentAmount(0)
      setRepaymentRef('')
      await loadData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to record payment')
      }
    }
  }

  // Ledger Adjustment Submit
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerForAdjustment || adjustmentAmount <= 0 || !adjustmentReason.trim()) {
      toast.error('Please enter valid adjustment amount and reason')
      return
    }

    try {
      const payload: RecordLedgerAdjustmentInput = {
        direction: adjustmentDirection,
        amount: adjustmentAmount,
        description: adjustmentReason.trim(),
      }
      await salesApi.recordLedgerAdjustment(selectedCustomerForAdjustment.id, payload)
      toast.success(`Auditable ${adjustmentDirection} adjustment logged on customer ledger`)
      setIsAdjustmentModalOpen(false)
      setSelectedCustomerForAdjustment(null)
      setAdjustmentAmount(0)
      setAdjustmentReason('')
      await loadData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to log adjustment')
      }
    }
  }

  // Schedule Delivery Submit
  const handleAddDeliveryItem = () => {
    if (!currentDelivProdId || currentDelivQty <= 0) return
    setDeliveryItems([...deliveryItems, { productId: currentDelivProdId, quantity: currentDelivQty }])
    setCurrentDelivQty(1)
  }

  const handleCreateDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliveryBranchId || !deliveryCustomerId || !deliveryEmployeeId || deliveryItems.length === 0) {
      toast.error('Please fill in required delivery fields and at least one item')
      return
    }

    try {
      const payload: CreateDeliveryInput = {
        branchId: deliveryBranchId,
        customerId: deliveryCustomerId,
        saleId: deliverySaleId || null,
        deliveryEmployeeId,
        deliveryDate: new Date(deliveryDate).toISOString(),
        notes: deliveryNotes || null,
        items: deliveryItems,
      }
      await salesApi.createDelivery(payload)
      toast.success('Delivery route scheduled successfully')
      setIsScheduleDeliveryModalOpen(false)
      setDeliveryItems([])
      setDeliveryNotes('')
      await loadData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to schedule delivery')
      }
    }
  }

  // Open Update Delivery Modal
  const handleOpenUpdateDelivery = (delivery: DeliveryEntity) => {
    setSelectedDelivery(delivery)
    setUpdateDelivStatus(delivery.status)
    setUpdateDelivNotes(delivery.notes || '')
    const quantities: Record<string, number> = {}
    delivery.items?.forEach((item: DeliveryItemEntity) => {
      quantities[item.id] = item.deliveredQuantity || item.quantity
    })
    setUpdateDelivItemQuantities(quantities)
    setIsUpdateDeliveryModalOpen(true)
  }

  const handleUpdateDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDelivery) return

    try {
      const payload: UpdateDeliveryStatusInput = {
        status: updateDelivStatus,
        notes: updateDelivNotes || null,
        items:
          selectedDelivery.items?.map((item: DeliveryItemEntity) => ({
            deliveryItemId: item.id,
            deliveredQuantity: updateDelivItemQuantities[item.id] ?? item.quantity,
          })) || [],
      }
      await salesApi.updateDeliveryStatus(selectedDelivery.id, payload)
      toast.success(`Delivery status updated to ${updateDelivStatus}`)
      setIsUpdateDeliveryModalOpen(false)
      setSelectedDelivery(null)
      await loadData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to update delivery status')
      }
    }
  }

  // Filtered lists
  const filteredSales = sales.filter((s) => {
    if (selectedBranchId !== 'all' && s.branchId !== selectedBranchId) return false
    if (selectedPaymentStatus !== 'all' && s.paymentStatus !== selectedPaymentStatus) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchNum = s.saleNumber.toLowerCase().includes(term)
      const matchCust = s.customerName?.toLowerCase().includes(term) || false
      if (!matchNum && !matchCust) return false
    }
    return true
  })

  const filteredCustomers = customers.filter((c) => {
    if (selectedCustomerType !== 'all' && c.customerType !== selectedCustomerType) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchName = c.name.toLowerCase().includes(term)
      const matchPhone = c.phone?.toLowerCase().includes(term) || false
      if (!matchName && !matchPhone) return false
    }
    return true
  })

  const filteredDeliveries = deliveries.filter((d) => {
    if (selectedBranchId !== 'all' && d.branchId !== selectedBranchId) return false
    if (selectedDeliveryStatus !== 'all' && d.status !== selectedDeliveryStatus) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchCust = d.customerName?.toLowerCase().includes(term) || false
      const matchDriver = d.driverName?.toLowerCase().includes(term) || false
      if (!matchCust && !matchDriver) return false
    }
    return true
  })

  // Aggregate KPI Calculations
  const totalSalesRevenue = sales
    .filter((s) => s.saleStatus === 'COMPLETED')
    .reduce((sum, s) => sum + s.totalAmount, 0)
  const totalOutstandingCredit = customers.reduce(
    (sum, c) => sum + Math.max(0, c.derivedBalance || 0),
    0
  )
  const overLimitCustomersCount = customers.filter((c) => c.isOverCreditLimit).length
  const pendingDeliveriesCount = deliveries.filter((d) => d.status === 'PENDING').length

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales & Distribution</h1>
          <p className="text-xs text-muted-foreground">
            Point of sale orders, FIFO inventory allocation, customer credit ledger, and delivery tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {activeSubTab === 'pos' && (
            <Button
              size="sm"
              onClick={handleOpenNewSale}
              className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>New POS Sale</span>
            </Button>
          )}

          {activeSubTab === 'customers' && (
            <Button
              size="sm"
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Customer</span>
            </Button>
          )}

          {activeSubTab === 'deliveries' && (
            <Button
              size="sm"
              onClick={() => setIsScheduleDeliveryModalOpen(true)}
              className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Schedule Delivery</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Completed Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {totalSalesRevenue.toFixed(2)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {sales.filter((s) => s.saleStatus === 'COMPLETED').length} completed transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Receivables (Credit)</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ETB {totalOutstandingCredit.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Derived from append-only credit ledger
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Over-Limit Customers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {overLimitCustomersCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Accounts with balance exceeding credit limit
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pending Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {pendingDeliveriesCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Scheduled distribution routes</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-border/80 overflow-x-auto whitespace-nowrap scrollbar-none gap-1">
        <button
          onClick={() => setActiveSubTab('pos')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors shrink-0 ${
            activeSubTab === 'pos'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Point of Sale & Orders</span>
          <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.2 text-[10px]">
            {sales.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors shrink-0 ${
            activeSubTab === 'customers'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Customers & Credit Ledger</span>
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[10px]">
            {customers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('deliveries')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors shrink-0 ${
            activeSubTab === 'deliveries'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Distribution & Deliveries</span>
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 text-[10px]">
            {deliveries.length}
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: POINT OF SALE & ORDERS */}
      {activeSubTab === 'pos' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by invoice # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>

          {/* Sales Orders Table */}
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px]">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Total (ETB)</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Gross Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground">
                      No sales records found. Click &quot;New POS Sale&quot; to ring up an order.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="text-xs">
                      <TableCell className="font-mono font-medium">{sale.saleNumber}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {sale.customerName ? (
                          <span className="font-medium text-foreground">{sale.customerName}</span>
                        ) : (
                          <span className="italic text-muted-foreground">Walk-in Customer</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{sale.branchName || '—'}</TableCell>
                      <TableCell className="text-right font-medium">
                        ETB {sale.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            sale.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : sale.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {sale.paymentStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {sale.grossMarginPercent !== undefined ? (
                          <span
                            className={`font-medium ${
                              sale.grossMarginPercent >= 30
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {sale.grossMarginPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            sale.saleStatus === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : sale.saleStatus === 'CANCELLED'
                              ? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 line-through'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {sale.saleStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSale(sale)}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Invoice</span>
                          </Button>
                          {sale.saleStatus === 'COMPLETED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSaleToCancel(sale)
                                setIsCancelSaleModalOpen(true)
                              }}
                              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <Ban className="h-3 w-3" />
                              <span>Cancel</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CUSTOMERS & CREDIT LEDGER */}
      {activeSubTab === 'customers' && (
        <div className="space-y-4">
          {/* Customer Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search customers by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <select
              value={selectedCustomerType}
              onChange={(e) => setSelectedCustomerType(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">All Customer Types</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="GROCERY_SHOP">Grocery Shop</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="HOTEL">Hotel</option>
              <option value="WHOLESALER">Wholesaler</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Customers Table */}
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px]">
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone / Contact</TableHead>
                  <TableHead className="text-right">Credit Limit (ETB)</TableHead>
                  <TableHead className="text-right">Derived Balance (Debt)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No customers found. Click &quot;New Customer&quot; to create a profile.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((cust) => {
                    const balance = cust.derivedBalance || 0
                    const isOver = cust.isOverCreditLimit || false
                    return (
                      <TableRow key={cust.id} className="text-xs">
                        <TableCell className="font-medium text-foreground">{cust.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                            {cust.customerType}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{cust.phone || '—'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {cust.creditLimit !== null ? `ETB ${cust.creditLimit.toFixed(2)}` : 'Unlimited'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <div className="flex items-center justify-end gap-1.5">
                            <span
                              className={
                                balance > 0
                                  ? isOver
                                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                                    : 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }
                            >
                              ETB {balance.toFixed(2)}
                            </span>
                            {isOver && (
                              <span className="rounded-xs bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-1 text-[9px] font-bold">
                                OVER LIMIT
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              cust.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                            }`}
                          >
                            {cust.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewStatement(cust)}
                              className="h-7 px-2 text-xs gap-1"
                              title="View Running Ledger Statement"
                            >
                              <Receipt className="h-3 w-3" />
                              <span>Statement</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomerForPayment(cust)
                                setRepaymentAmount(cust.derivedBalance && cust.derivedBalance > 0 ? cust.derivedBalance : 0)
                                setIsPaymentModalOpen(true)
                              }}
                              className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                              title="Record Repayment"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Pay</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomerForAdjustment(cust)
                                setIsAdjustmentModalOpen(true)
                              }}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Auditable Ledger Adjustment"
                            >
                              <span>Adjust</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DISTRIBUTION & DELIVERIES */}
      {activeSubTab === 'deliveries' && (
        <div className="space-y-4">
          {/* Deliveries Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search deliveries by customer or driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={selectedDeliveryStatus}
              onChange={(e) => setSelectedDeliveryStatus(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">All Delivery Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Deliveries Table */}
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px]">
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Staff / Driver</TableHead>
                  <TableHead>Destination Address</TableHead>
                  <TableHead>Items Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No distribution deliveries found. Click &quot;Schedule Delivery&quot; to assign a route.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeliveries.map((deliv) => (
                    <TableRow key={deliv.id} className="text-xs">
                      <TableCell className="font-mono text-muted-foreground">
                        {new Date(deliv.deliveryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {deliv.customerName || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {deliv.driverName || 'Assigned Driver'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {deliv.deliveryAddress || 'Branch default / On record'}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                          {deliv.items?.reduce((s: number, i: DeliveryItemEntity) => s + i.quantity, 0) || 0} units
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            deliv.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : deliv.status === 'IN_TRANSIT'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : deliv.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                          }`}
                        >
                          {deliv.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenUpdateDelivery(deliv)}
                          className="h-7 px-2.5 text-xs"
                        >
                          Update Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* MODAL 1: NEW POS SALE */}
      <Dialog open={isNewSaleModalOpen} onOpenChange={setIsNewSaleModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-violet-600" />
              <span>Point of Sale (New Order)</span>
            </DialogTitle>
            <DialogDescription>
              Create a sales order with automatic FIFO finished stock lot allocation and COGS snapshotting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSaleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Baking Station / Branch</label>
                <select
                  value={saleBranchId}
                  onChange={(e) => setSaleBranchId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Customer</label>
                <select
                  value={saleCustomerId}
                  onChange={(e) => setSaleCustomerId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">Walk-in Customer (Full Cash Only)</option>
                  {customers
                    .filter((c) => c.status === 'ACTIVE')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.creditLimit !== null ? `(Limit: ETB ${c.creditLimit})` : ''}
                      </option>
                    ))}
                </select>
                {selectedCustomerObj && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Current Balance: ETB {(selectedCustomerObj.derivedBalance || 0).toFixed(2)}
                    {selectedCustomerObj.creditLimit !== null && (
                      <span className="ml-2">
                        Available Credit: ETB{' '}
                        {Math.max(
                          0,
                          selectedCustomerObj.creditLimit - (selectedCustomerObj.derivedBalance || 0)
                        ).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Invoice Number</label>
                <Input
                  value={saleNumber}
                  onChange={(e) => setSaleNumber(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Order Discount (ETB)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={saleDiscount}
                  onChange={(e) => setSaleDiscount(parseFloat(e.target.value) || 0)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Cart Items Builder */}
            <div className="border border-border/70 rounded-md p-3 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Sale Line Items</span>
                <span className="text-[11px] text-muted-foreground">
                  Available Stock: {getProductAvailableStock(currentItemProductId, saleBranchId)} units
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <label className="text-[10px] font-medium text-muted-foreground">Product</label>
                  <select
                    value={currentItemProductId}
                    onChange={(e) => setCurrentItemProductId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.size ? `(${p.size})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-medium text-muted-foreground">Qty</label>
                  <Input
                    type="number"
                    min="1"
                    value={currentItemQty}
                    onChange={(e) => setCurrentItemQty(parseInt(e.target.value) || 1)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="col-span-3">
                  <label className="text-[10px] font-medium text-muted-foreground">Price (ETB)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={currentItemPrice}
                    onChange={(e) => setCurrentItemPrice(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="col-span-3">
                  <Button
                    type="button"
                    onClick={handleAddToCart}
                    size="sm"
                    className="w-full h-8 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Item</span>
                  </Button>
                </div>
              </div>

              {/* Items List in Cart */}
              <div className="rounded border border-border/60 bg-background overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-[10px]">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                      <TableHead className="text-right">Remove</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleCartItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-16 text-center text-xs text-muted-foreground">
                          No items added yet. Select a product and click &quot;Add Item&quot;.
                        </TableCell>
                      </TableRow>
                    ) : (
                      saleCartItems.map((item, idx) => {
                        const prod = products.find((p) => p.id === item.productId)
                        const lineTotal = item.quantity * item.unitPrice - (item.discount || 0)
                        return (
                          <TableRow key={idx} className="text-xs">
                            <TableCell className="font-medium">{prod?.name || 'Product'}</TableCell>
                            <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono">
                              ETB {item.unitPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ETB {lineTotal.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromCart(idx)}
                                className="h-6 px-1.5 text-rose-500 hover:text-rose-700"
                              >
                                &times;
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="rounded-md border border-border/80 bg-muted/40 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono">ETB {cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Discount:</span>
                <span className="font-mono text-emerald-600">- ETB {saleDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5">
                <span>Grand Total:</span>
                <span>ETB {cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Upfront Payment Section */}
            <div className="border border-border/70 rounded-md p-3 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasUpfrontPayment}
                    onChange={(e) => {
                      setHasUpfrontPayment(e.target.checked)
                      if (e.target.checked) setPaymentAmount(cartTotal)
                    }}
                    className="rounded border-input"
                  />
                  <span>Record Upfront Payment</span>
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Unpaid remainder will post to customer credit ledger
                </span>
              </div>

              {hasUpfrontPayment && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Amount (ETB)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER'
                        )
                      }
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="MOBILE_MONEY">Telebirr / Mobile Money</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Ref / Transaction #</label>
                    <Input
                      placeholder="Optional"
                      value={paymentRefNumber}
                      onChange={(e) => setPaymentRefNumber(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {!saleCustomerId && (!hasUpfrontPayment || paymentAmount < cartTotal) && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Walk-in customers cannot make partial/credit purchases. Full payment required.</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewSaleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white"
                disabled={saleCartItems.length === 0}
              >
                Complete Sale & Ring Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: SALE DETAIL / INVOICE */}
      <Dialog open={isSaleDetailModalOpen} onOpenChange={setIsSaleDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSaleDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-violet-600" />
                    <span>Invoice: {selectedSaleDetail.saleNumber}</span>
                  </DialogTitle>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      selectedSaleDetail.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : selectedSaleDetail.paymentStatus === 'PARTIAL'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {selectedSaleDetail.paymentStatus}
                  </span>
                </div>
                <DialogDescription>
                  Date: {new Date(selectedSaleDetail.saleDate).toLocaleString()} &bull; Station:{' '}
                  {selectedSaleDetail.branchName || 'Main Bakery'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* Customer Information */}
                <div className="rounded-md border border-border p-3 bg-muted/20">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Customer Information
                  </span>
                  <div className="mt-1 font-medium text-sm text-foreground">
                    {selectedSaleDetail.customerName || 'Walk-in Customer'}
                  </div>
                  {selectedSaleDetail.customerPhone && (
                    <div className="text-muted-foreground">{selectedSaleDetail.customerPhone}</div>
                  )}
                </div>

                {/* Line Items & COGS Breakdown */}
                <div>
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Sold Items & FIFO COGS Allocation
                  </span>
                  <div className="mt-1 rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 text-[10px]">
                          <TableHead>Item / Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total COGS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSaleDetail.items?.map((item: SaleItemEntity) => (
                          <TableRow key={item.id} className="text-xs">
                            <TableCell className="font-medium">{item.productName || 'Item'}</TableCell>
                            <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono">
                              ETB {item.unitPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ETB {item.totalAmount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              ETB {item.unitCostSnapshot.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              ETB {item.totalCOGS.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-mono">ETB {selectedSaleDetail.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Discount:</span>
                    <span className="font-mono text-emerald-600">
                      - ETB {selectedSaleDetail.discount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t border-border pt-1">
                    <span>Total Order Amount:</span>
                    <span>ETB {selectedSaleDetail.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground border-t border-border pt-1">
                    <span>Total Cost of Goods Sold (COGS):</span>
                    <span className="font-mono">ETB {(selectedSaleDetail.totalCOGS || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Gross Profit (Margin):</span>
                    <span>
                      ETB {(selectedSaleDetail.grossProfit || 0).toFixed(2)} (
                      {(selectedSaleDetail.grossMarginPercent || 0).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Payments Section */}
                <div>
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Payments Recorded
                  </span>
                  <div className="mt-1 space-y-1">
                    {selectedSaleDetail.payments && selectedSaleDetail.payments.length > 0 ? (
                      selectedSaleDetail.payments.map((p: PaymentEntity) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-md border border-border/60 bg-background p-2"
                        >
                          <div>
                            <span className="font-medium">{p.paymentMethod}</span>
                            {p.referenceNumber && (
                              <span className="ml-2 text-muted-foreground text-[10px]">
                                Ref: {p.referenceNumber}
                              </span>
                            )}
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(p.paymentDate).toLocaleString()}
                            </div>
                          </div>
                          <span className="font-mono font-semibold text-emerald-600">
                            + ETB {p.amount.toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground italic p-2 border border-border/40 rounded">
                        No payments received on this sale yet (fully posted to credit ledger).
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between">
                <div>
                  {selectedSaleDetail.saleStatus === 'COMPLETED' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSaleToCancel(selectedSaleDetail)
                        setIsCancelSaleModalOpen(true)
                      }}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      <span>Cancel Sale & Restore Stock</span>
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSaleDetailModalOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CANCEL SALE CONFIRMATION */}
      <Dialog open={isCancelSaleModalOpen} onOpenChange={setIsCancelSaleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Cancel Sale Order</span>
            </DialogTitle>
            <DialogDescription>
              Cancelling sale {saleToCancel?.saleNumber} will restore consumed finished inventory lots
              back to AVAILABLE stock and reverse any ledger charges.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Cancellation Reason (Required for Audit Trail)
              </label>
              <Input
                placeholder="e.g. Customer returned items, order entered in error"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelSaleModalOpen(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCancelSale}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: NEW CUSTOMER */}
      <Dialog open={isNewCustomerModalOpen} onOpenChange={setIsNewCustomerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <span>New Customer Profile</span>
            </DialogTitle>
            <DialogDescription>
              Register an institutional or individual client with configurable credit limits.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomerSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Customer Name</label>
              <Input
                required
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Customer Type</label>
                <select
                  value={newCustomerForm.customerType}
                  onChange={(e) =>
                    setNewCustomerForm({
                      ...newCustomerForm,
                      customerType: e.target.value as CreateCustomerInput['customerType'],
                    })
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="GROCERY_SHOP">Grocery Shop</option>
                  <option value="RESTAURANT">Restaurant</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="WHOLESALER">Wholesaler</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Credit Limit (ETB)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newCustomerForm.creditLimit ?? 0}
                  onChange={(e) =>
                    setNewCustomerForm({
                      ...newCustomerForm,
                      creditLimit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Phone Number</label>
              <Input
                placeholder="+251 9..."
                value={newCustomerForm.phone || ''}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Address / Delivery Point</label>
              <Input
                placeholder="e.g. Bole Sub-city, Woreda 03, House #124"
                value={newCustomerForm.address || ''}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewCustomerModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: CUSTOMER STATEMENT & RUNNING LEDGER */}
      <Dialog open={isStatementModalOpen} onOpenChange={setIsStatementModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {customerStatement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  <span>Statement of Account: {customerStatement.customer.name}</span>
                </DialogTitle>
                <DialogDescription>
                  Append-only credit ledger showing running balance, debits (sales), credits (payments),
                  and adjustments.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* Balance Summary Header */}
                <div className="grid grid-cols-3 gap-3 rounded-md border border-border p-3 bg-muted/20">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Credit Limit
                    </span>
                    <div className="font-semibold text-sm">
                      {customerStatement.customer.creditLimit !== null
                        ? `ETB ${customerStatement.customer.creditLimit.toFixed(2)}`
                        : 'Unlimited'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Current Derived Balance
                    </span>
                    <div
                      className={`font-bold text-sm ${
                        customerStatement.customer.currentBalance > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      ETB {customerStatement.customer.currentBalance.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Status
                    </span>
                    <div className="font-medium text-xs mt-0.5">
                      {customerStatement.customer.currentBalance >
                      (customerStatement.customer.creditLimit || Infinity) ? (
                        <span className="text-rose-600 font-bold">OVER CREDIT LIMIT</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Good Standing</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-[10px]">
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description / Ref</TableHead>
                        <TableHead className="text-right">Debit (+) / Sale</TableHead>
                        <TableHead className="text-right">Credit (-) / Payment</TableHead>
                        <TableHead className="text-right">Running Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerStatement.entries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">
                            No ledger entries found for this customer.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customerStatement.entries.map((entry: CustomerLedgerEntryEntity) => (
                          <TableRow key={entry.id} className="text-xs">
                            <TableCell className="font-mono text-muted-foreground">
                              {new Date(entry.transactionDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-medium ${
                                  entry.transactionType === 'SALE'
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                    : entry.transactionType === 'PAYMENT'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                }`}
                              >
                                {entry.transactionType}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {entry.description || `${entry.referenceType}: ${entry.referenceId}`}
                            </TableCell>
                            <TableCell className="text-right font-mono text-rose-600">
                              {entry.debit > 0 ? `ETB ${entry.debit.toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600">
                              {entry.credit > 0 ? `ETB ${entry.credit.toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-foreground">
                              ETB {(entry.runningBalance || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsStatementModalOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 6: RECORD REPAYMENT */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <span>Record Customer Repayment</span>
            </DialogTitle>
            <DialogDescription>
              Record an incoming payment to credit {selectedCustomerForPayment?.name}&apos;s ledger.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
            <div className="rounded border border-border p-2.5 bg-muted/30 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Outstanding Debt:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  ETB {(selectedCustomerForPayment?.derivedBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Repayment Amount (ETB)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(parseFloat(e.target.value) || 0)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Payment Method</label>
              <select
                value={repaymentMethod}
                onChange={(e) =>
                  setRepaymentMethod(
                    e.target.value as 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER'
                  )
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer (CBE / Awash / etc.)</option>
                <option value="MOBILE_MONEY">Telebirr / Mobile Money</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Transaction / Slip Reference
              </label>
              <Input
                placeholder="e.g. TXN-928174 or Bank Slip #"
                value={repaymentRef}
                onChange={(e) => setRepaymentRef(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 7: AUDITABLE LEDGER ADJUSTMENT */}
      <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <span>Auditable Ledger Adjustment</span>
            </DialogTitle>
            <DialogDescription>
              Create an auditable credit or debit adjustment on {selectedCustomerForAdjustment?.name}&apos;s ledger.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Adjustment Direction</label>
                <select
                  value={adjustmentDirection}
                  onChange={(e) => setAdjustmentDirection(e.target.value as 'DEBIT' | 'CREDIT')}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                >
                  <option value="CREDIT">CREDIT (Decrease Debt / Write-off)</option>
                  <option value="DEBIT">DEBIT (Increase Debt / Surcharge)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Amount (ETB)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Reason / Description (Required for Audit Trail)
              </label>
              <Input
                required
                placeholder="e.g. Goodwill credit discount, dispute settlement"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAdjustmentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Log Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 8: SCHEDULE DELIVERY */}
      <Dialog open={isScheduleDeliveryModalOpen} onOpenChange={setIsScheduleDeliveryModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <span>Schedule Distribution Delivery</span>
            </DialogTitle>
            <DialogDescription>
              Assign a delivery route to dispatch finished injera packages to clients.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDeliverySubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Origin Branch</label>
                <select
                  value={deliveryBranchId}
                  onChange={(e) => setDeliveryBranchId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Recipient Customer</label>
                <select
                  value={deliveryCustomerId}
                  onChange={(e) => setDeliveryCustomerId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Delivery Staff / Driver</label>
                <select
                  value={deliveryEmployeeId}
                  onChange={(e) => setDeliveryEmployeeId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                >
                  <option value="">Select driver / staff...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.employeeNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Scheduled Date</label>
                <Input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Linked Sales Order (Optional)
              </label>
              <select
                value={deliverySaleId}
                onChange={(e) => setDeliverySaleId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
              >
                <option value="">None / Standalone Delivery</option>
                {sales
                  .filter((s) => !deliveryCustomerId || s.customerId === deliveryCustomerId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.saleNumber} — ETB {s.totalAmount.toFixed(2)} ({s.paymentStatus})
                    </option>
                  ))}
              </select>
            </div>

            {/* Delivery Items Selection */}
            <div className="border border-border/70 rounded-md p-3 bg-muted/20 space-y-2">
              <span className="text-xs font-semibold">Delivery Manifest Items</span>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-7">
                  <label className="text-[10px] font-medium text-muted-foreground">Product</label>
                  <select
                    value={currentDelivProdId}
                    onChange={(e) => setCurrentDelivProdId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-medium text-muted-foreground">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={currentDelivQty}
                    onChange={(e) => setCurrentDelivQty(parseInt(e.target.value) || 1)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    type="button"
                    onClick={handleAddDeliveryItem}
                    size="sm"
                    className="w-full h-8 text-xs"
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                {deliveryItems.map((item, idx) => {
                  const p = products.find((prod) => prod.id === item.productId)
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-background p-1.5 rounded border border-border"
                    >
                      <span>{p?.name || 'Product'}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{item.quantity} units</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeliveryItems(deliveryItems.filter((_, i) => i !== idx))}
                          className="h-5 px-1 text-rose-500"
                        >
                          &times;
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Notes / Instructions</label>
              <Input
                placeholder="e.g. Ring bell at delivery gate, deliver before 10 AM"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScheduleDeliveryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={deliveryItems.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Schedule Delivery
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 9: UPDATE DELIVERY STATUS */}
      <Dialog open={isUpdateDeliveryModalOpen} onOpenChange={setIsUpdateDeliveryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <span>Update Delivery Status</span>
            </DialogTitle>
            <DialogDescription>
              Progression: PENDING &rarr; IN_TRANSIT &rarr; DELIVERED / CANCELLED
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateDeliverySubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Status</label>
              <select
                value={updateDelivStatus}
                onChange={(e) =>
                  setUpdateDelivStatus(
                    e.target.value as 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
                  )
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="PENDING">PENDING (Preparing order)</option>
                <option value="IN_TRANSIT">IN_TRANSIT (Out on road)</option>
                <option value="DELIVERED">DELIVERED (Successfully received)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            {updateDelivStatus === 'DELIVERED' && selectedDelivery?.items && (
              <div className="space-y-2 border border-border/80 rounded p-2.5 bg-muted/20 text-xs">
                <span className="font-semibold text-[11px]">Confirm Delivered Quantities:</span>
                {selectedDelivery.items.map((item: DeliveryItemEntity) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span>{item.productName || 'Product'} (Ordered: {item.quantity})</span>
                    <Input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={updateDelivItemQuantities[item.id] ?? item.quantity}
                      onChange={(e) =>
                        setUpdateDelivItemQuantities({
                          ...updateDelivItemQuantities,
                          [item.id]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-7 w-20 text-right text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Delivery Notes</label>
              <Input
                placeholder="Driver notes or recipient signature confirmation"
                value={updateDelivNotes}
                onChange={(e) => setUpdateDelivNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUpdateDeliveryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
