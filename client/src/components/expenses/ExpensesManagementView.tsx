import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import {
  expensesApi,
  branchesApi,
  type ExpenseCategoryEntity,
  type ExpenseEntity,
  type BranchEntity,
} from '@/lib/api'
import type {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
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
  Receipt,
  Plus,
  RefreshCw,
  Search,
  DollarSign,
  Ban,
  Tag,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'

type SubTab = 'expenses' | 'categories'

export function ExpensesManagementView() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('expenses')
  const [isLoading, setIsLoading] = useState(false)

  // Data states
  const [expenses, setExpenses] = useState<ExpenseEntity[]>([])
  const [categories, setCategories] = useState<ExpenseCategoryEntity[]>([])
  const [branches, setBranches] = useState<BranchEntity[]>([])

  // Filter states
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('RECORDED')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false)
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false)
  const [expenseToCancel, setExpenseToCancel] = useState<ExpenseEntity | null>(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

  // Form states: New Expense
  const [expenseBranchId, setExpenseBranchId] = useState<string>('')
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>('')
  const [expenseAmount, setExpenseAmount] = useState<number>(0)
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER'>('CASH')
  const [expenseDescription, setExpenseDescription] = useState<string>('')
  const [expenseRefNumber, setExpenseRefNumber] = useState<string>('')

  // Form states: New Category
  const [newCatName, setNewCatName] = useState<string>('')
  const [newCatType, setNewCatType] = useState<CreateExpenseCategoryInput['categoryType']>('OPERATING')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [expData, catData, branchData] = await Promise.all([
        expensesApi.getExpenses(),
        expensesApi.getCategories(),
        branchesApi.getBranches(),
      ])
      setExpenses(expData)
      setCategories(catData)
      setBranches(branchData)

      if (branchData.length > 0 && !expenseBranchId) {
        setExpenseBranchId(branchData[0].id)
      }
      if (catData.length > 0 && !expenseCategoryId) {
        setExpenseCategoryId(catData[0].id)
      }
    } catch (err) {
      console.error('Failed to load expenses data', err)
      toast.error('Failed to load expenses data')
    } finally {
      setIsLoading(false)
    }
  }, [expenseBranchId, expenseCategoryId])

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [expData, catData, branchData] = await Promise.all([
          expensesApi.getExpenses(),
          expensesApi.getCategories(),
          branchesApi.getBranches(),
        ])
        if (!isMounted) return
        setExpenses(expData)
        setCategories(catData)
        setBranches(branchData)

        if (branchData.length > 0) setExpenseBranchId(branchData[0].id)
        if (catData.length > 0) setExpenseCategoryId(catData[0].id)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to initialize expenses', err)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  // Create Category Submit
  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) {
      toast.error('Category name is required')
      return
    }
    try {
      await expensesApi.createCategory({
        name: newCatName.trim(),
        categoryType: newCatType,
        isActive: true,
      })
      toast.success('Expense category created')
      setIsNewCategoryModalOpen(false)
      setNewCatName('')
      await loadData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to create expense category')
      }
    }
  }

  // Toggle Category Active Status
  const handleToggleCategoryActive = async (cat: ExpenseCategoryEntity) => {
    try {
      await expensesApi.updateCategory(cat.id, { isActive: !cat.isActive })
      toast.success(`Category ${cat.name} ${!cat.isActive ? 'activated' : 'deactivated'}`)
      await loadData()
    } catch {
      toast.error('Failed to update category status')
    }
  }

  // Record Expense Submit
  const handleCreateExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseBranchId || !expenseCategoryId || expenseAmount <= 0) {
      toast.error('Please fill in required fields with positive amount')
      return
    }

    try {
      const payload: CreateExpenseInput = {
        branchId: expenseBranchId,
        categoryId: expenseCategoryId,
        amount: expenseAmount,
        expenseDate: new Date(expenseDate).toISOString(),
        paymentMethod: expensePaymentMethod,
        description: expenseDescription.trim() || null,
        referenceNumber: expenseRefNumber.trim() || null,
      }
      await expensesApi.createExpense(payload)
      toast.success('Operating expense recorded')
      setIsNewExpenseModalOpen(false)
      setExpenseAmount(0)
      setExpenseDescription('')
      setExpenseRefNumber('')
      await loadData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to record expense')
      }
    }
  }

  // Cancel Expense Submit
  const handleCancelExpenseSubmit = async () => {
    if (!expenseToCancel) return
    try {
      await expensesApi.cancelExpense(expenseToCancel.id)
      toast.success('Expense cancelled successfully')
      setIsCancelModalOpen(false)
      setExpenseToCancel(null)
      await loadData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message)
      } else {
        toast.error('Failed to cancel expense')
      }
    }
  }

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    if (selectedBranchId !== 'all' && e.branchId !== selectedBranchId) return false
    if (selectedCategoryId !== 'all' && e.categoryId !== selectedCategoryId) return false
    if (selectedStatus !== 'all' && e.status !== selectedStatus) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchDesc = e.description?.toLowerCase().includes(term) || false
      const matchCat = e.categoryName?.toLowerCase().includes(term) || false
      const matchRef = e.referenceNumber?.toLowerCase().includes(term) || false
      if (!matchDesc && !matchCat && !matchRef) return false
    }
    return true
  })

  // Aggregate Calculations
  const totalOperatingExpenses = expenses
    .filter((e) => e.status === 'RECORDED')
    .reduce((sum, e) => sum + e.amount, 0)
  const activeCategoriesCount = categories.filter((c) => c.isActive).length

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operating Expenses</h1>
          <p className="text-xs text-muted-foreground">
            Manage general bakery operating expenses distinct from direct production overhead.
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

          {activeSubTab === 'expenses' && (
            <Button
              size="sm"
              onClick={() => setIsNewExpenseModalOpen(true)}
              className="h-8 gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record Expense</span>
            </Button>
          )}

          {activeSubTab === 'categories' && (
            <Button
              size="sm"
              onClick={() => setIsNewCategoryModalOpen(true)}
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Category</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Operating Expenses (OPEX)</CardTitle>
            <DollarSign className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              ETB {totalOperatingExpenses.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {expenses.filter((e) => e.status === 'RECORDED').length} active recorded expenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Expense Categories</CardTitle>
            <Tag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCategoriesCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Configured categories (Rent, Power, Transport, etc.)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Operating Branches</CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Active branch cost centers</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-border/80 overflow-x-auto whitespace-nowrap scrollbar-none gap-1">
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors shrink-0 ${
            activeSubTab === 'expenses'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Expenses Ledger</span>
          <span className="rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 text-[10px]">
            {expenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors shrink-0 ${
            activeSubTab === 'categories'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Expense Categories</span>
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 text-[10px]">
            {categories.length}
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: EXPENSES LEDGER */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search description, category, or ref #..."
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
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="RECORDED">Recorded</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Expenses Table */}
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px]">
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Description / Ref</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Amount (ETB)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      No expenses found. Click &quot;Record Expense&quot; to log an operating cost.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((exp) => (
                    <TableRow key={exp.id} className="text-xs">
                      <TableCell className="font-mono text-muted-foreground">
                        {new Date(exp.expenseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">{exp.categoryName || 'General'}</span>
                        <div className="text-[10px] text-muted-foreground">{exp.categoryType}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{exp.branchName || '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <span className="text-foreground">{exp.description || '—'}</span>
                        {exp.referenceNumber && (
                          <span className="ml-1.5 text-[10px] font-mono text-muted-foreground">
                            [{exp.referenceNumber}]
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                          {exp.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">
                        ETB {exp.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            exp.status === 'RECORDED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 line-through'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {exp.status === 'RECORDED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setExpenseToCancel(exp)
                              setIsCancelModalOpen(true)
                            }}
                            className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            <span>Cancel</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EXPENSE CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          <div className="rounded-md border border-border/80 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px]">
                  <TableHead>Category Name</TableHead>
                  <TableHead>Classification Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground">
                      No categories found. Click &quot;New Category&quot; to configure one.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id} className="text-xs">
                      <TableCell className="font-semibold text-foreground">{cat.name}</TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                          {cat.categoryType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            cat.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                          }`}
                        >
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleCategoryActive(cat)}
                          className="h-7 px-2.5 text-xs"
                        >
                          {cat.isActive ? 'Deactivate' : 'Activate'}
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

      {/* MODAL 1: RECORD EXPENSE */}
      <Dialog open={isNewExpenseModalOpen} onOpenChange={setIsNewExpenseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Receipt className="h-5 w-5" />
              <span>Record Operating Expense</span>
            </DialogTitle>
            <DialogDescription>
              Record an operating expense item (Rent, Utilities, Maintenance, etc.).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExpenseSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Branch / Facility</label>
              <select
                value={expenseBranchId}
                onChange={(e) => setExpenseBranchId(e.target.value)}
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
              <label className="text-[11px] font-medium text-muted-foreground">Expense Category</label>
              <select
                value={expenseCategoryId}
                onChange={(e) => setExpenseCategoryId(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
              >
                {categories
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.categoryType})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Amount (ETB)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Expense Date</label>
                <Input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Payment Method</label>
                <select
                  value={expensePaymentMethod}
                  onChange={(e) =>
                    setExpensePaymentMethod(
                      e.target.value as 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER'
                    )
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Telebirr / Mobile Money</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Invoice / Ref #</label>
                <Input
                  placeholder="Optional"
                  value={expenseRefNumber}
                  onChange={(e) => setExpenseRefNumber(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Description / Notes</label>
              <Input
                placeholder="e.g. Monthly rent for March, generator maintenance"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewExpenseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
                Save Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: NEW CATEGORY */}
      <Dialog open={isNewCategoryModalOpen} onOpenChange={setIsNewCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-600" />
              <span>Create Expense Category</span>
            </DialogTitle>
            <DialogDescription>
              Add a new category to group business operating expenses.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCategorySubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Category Name</label>
              <Input
                required
                placeholder="e.g. Delivery Fuel, Mitad Electric Power"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Classification Type</label>
              <select
                value={newCatType}
                onChange={(e) =>
                  setNewCatType(
                    e.target.value as CreateExpenseCategoryInput['categoryType']
                  )
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
              >
                <option value="OPERATING">OPERATING (Facility Rent, Utilities, Daily Expenses)</option>
                <option value="ADMINISTRATIVE">ADMINISTRATIVE (Office Supplies, Accounting, Legal)</option>
                <option value="TRANSPORT">TRANSPORT (Fuel, Van Maintenance, Delivery Logistics)</option>
                <option value="MAINTENANCE">MAINTENANCE (Mitad Elements, Building Repairs)</option>
                <option value="MARKETING">MARKETING (Advertising, Signage, Promotions)</option>
                <option value="OTHER">OTHER (Miscellaneous)</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewCategoryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CANCEL EXPENSE CONFIRMATION */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Ban className="h-5 w-5" />
              <span>Cancel Operating Expense</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this ETB {expenseToCancel?.amount.toFixed(2)} expense ({expenseToCancel?.categoryName})?
              This record will be marked CANCELLED and excluded from P&L operating expenses.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCancelExpenseSubmit}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
