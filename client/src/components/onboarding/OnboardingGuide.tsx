import { useState } from 'react'
import {
  BookOpen,
  Boxes,
  Building2,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Circle,
  ExternalLink,
  Flame,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Users,
  WifiOff,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { TabType } from '@/components/layout/AppSidebar'

interface StepItem {
  id: string
  title: string
  description: string
  tab: TabType
  actionLabel: string
  icon: typeof Building2
  category: string
  role?: string
}

const ONBOARDING_STEPS: StepItem[] = [
  {
    id: 'business_calendar',
    title: 'Configure Bakery Profile & Calendar',
    description:
      'Set your legal bakery name, contact details, currency, and choose between the Ethiopian or Gregorian calendar for financial accounting.',
    tab: 'settings',
    actionLabel: 'Open Business Settings',
    icon: Building2,
    category: 'Setup',
  },
  {
    id: 'baking_stations',
    title: 'Set Up Baking Stations & Locations',
    description:
      'Register your primary commercial baking facility, retail pickup spots, and regional depot locations.',
    tab: 'branches',
    actionLabel: 'Manage Stations',
    icon: Building2,
    category: 'Setup',
  },
  {
    id: 'teff_materials',
    title: 'Define Teff Varieties & Grain Silos',
    description:
      'Record your raw grain inventory (Magna white, Sergegna mixed, and brown teff) and configure minimum stock reorder levels.',
    tab: 'materials',
    actionLabel: 'View Grain Inventory',
    icon: Boxes,
    category: 'Inventory',
  },
  {
    id: 'recipe_formulas',
    title: 'Standardize Injera Recipes & Scaling',
    description:
      'Define fermentation formulas, ersho (starter culture) ratios, and pre-mixed flour blending rules for uniform eye formation (ayen).',
    tab: 'recipes',
    actionLabel: 'Open Recipe Scaling',
    icon: ChefHat,
    category: 'Production',
  },
  {
    id: 'workforce_shifts',
    title: 'Register Staff & Schedule Mitad Shifts',
    description:
      'Add your bakers, supervisors, and cashiers. InjeraOS automatically assigns unique employee IDs (e.g. EMP-0001).',
    tab: 'workforce',
    actionLabel: 'Manage Workforce',
    icon: Users,
    category: 'Operations',
  },
  {
    id: 'mitad_baking',
    title: 'Run a Mitad Baking Session',
    description:
      'Start a baking run across clay or electric mitads, track pieces produced, and log scrap defects (burnt, cracked, thin).',
    tab: 'production',
    actionLabel: 'Start Baking Session',
    icon: Flame,
    category: 'Production',
  },
  {
    id: 'sales_pos',
    title: 'Process First Sale & Credit Ledger',
    description:
      'Record walk-in retail purchases or wholesale hotel deliveries with cash, Telebirr, or credit accounts.',
    tab: 'sales',
    actionLabel: 'Open POS Register',
    icon: ShoppingCart,
    category: 'Sales',
  },
  {
    id: 'offline_sync',
    title: 'Learn Offline Mode & Local Queuing',
    description:
      'When your internet connection drops, InjeraOS keeps working locally in IndexedDB and flushes data automatically when reconnected.',
    tab: 'sync',
    actionLabel: 'Inspect Sync Engine',
    icon: WifiOff,
    category: 'Offline',
  },
]

const ROLE_GUIDES = [
  {
    role: 'OWNER / ADMIN',
    title: 'Bakery Management & Financial Oversight',
    tips: [
      'Monitor real-time accrual revenue, batch unit costs, and net margin from the Executive Dashboard.',
      'Tune system tolerances like minimum baking yield % and auto employee numbering under System Settings.',
      'Review immutable compliance logs in the Audit Trail whenever operational tweaks or sync resolutions occur.',
    ],
  },
  {
    role: 'BAKER / MITAD LEAD',
    title: 'Floor Baking & Mitad Operations',
    tips: [
      'Clock in at the start of your shift to record active attendance on your designated mitad cluster.',
      'Log finished injera pieces per session and promptly record defect reasons (overcooked, broken, thin edge).',
      'Check the Baker Yield Rankings widget on the dashboard to see productivity and quality benchmark scores.',
    ],
  },
  {
    role: 'CASHIER / SALES',
    title: 'Front-Counter POS & Customer Credit',
    tips: [
      'Use the POS view to ring up restaurant orders, standing wholesale contracts, or individual customers.',
      'Check customer credit ledgers before extending terms for wholesale hotel accounts.',
      'All transactions queue safely in offline mode if the local connection becomes intermittent.',
    ],
  },
  {
    role: 'STOREKEEPER',
    title: 'Grain Silos, Flour Blends & FIFO Depots',
    tips: [
      'Record grain deliveries with supplier lot numbers to maintain complete origin traceability.',
      'Track pre-mixed flour blending so baking lines never run out of prepared batter.',
      'Inspect finished goods depots to ensure oldest baked lots are dispatched first under strict FIFO.',
    ],
  },
]

export function OnboardingGuideModal({
  open,
  onOpenChange,
  onNavigateTab,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateTab: (tab: TabType) => void
}) {
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('injera_onboarding_completed')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [activeTab, setActiveTab] = useState<'checklist' | 'roles' | 'offline'>('checklist')

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      try {
        localStorage.setItem('injera_onboarding_completed', JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const resetAll = () => {
    setCompletedSteps([])
    try {
      localStorage.removeItem('injera_onboarding_completed')
    } catch {
      // ignore
    }
  }

  const progressPercent = Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl gap-0">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-br from-card via-card to-[#EEE5D4]/30 dark:to-emerald-950/20 border-b border-border/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-oat shadow-xs">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  InjeraOS Bakery Onboarding Guide
                  <span className="text-[10px] font-semibold uppercase bg-forest/10 text-forest dark:bg-oat/15 dark:text-oat px-2 py-0.5 rounded-full">
                    Getting Started
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Step-by-step orientation for setting up commercial mitad baking, sales, and inventory operations.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Setup Progress
              </span>
              <span className="font-mono text-muted-foreground">
                {completedSteps.length} of {ONBOARDING_STEPS.length} steps completed ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-forest dark:bg-oat transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border/50">
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'checklist'
                  ? 'bg-forest text-oat dark:bg-oat dark:text-forest font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Setup Checklist ({completedSteps.length}/{ONBOARDING_STEPS.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-forest text-oat dark:bg-oat dark:text-forest font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Role Guidance (Bakers, Cashiers, Admins)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('offline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'offline'
                  ? 'bg-forest text-oat dark:bg-oat dark:text-forest font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Offline Resilience Guide
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* TAB 1: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span>Click the checkbox when you complete a setup task:</span>
                {completedSteps.length > 0 && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="flex items-center gap-1 text-[11px] hover:text-foreground text-muted-foreground cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset checklist</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {ONBOARDING_STEPS.map((step, idx) => {
                  const isDone = completedSteps.includes(step.id)
                  const Icon = step.icon

                  return (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3.5 p-3.5 rounded-xl border text-xs transition-colors ${
                        isDone
                          ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10'
                          : 'border-border/80 bg-card hover:border-forest/30'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleStep(step.id)}
                        className="mt-0.5 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                        title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/50 hover:text-foreground" />
                        )}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-semibold text-xs flex items-center gap-1.5 ${
                              isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            <span className="text-[10px] font-mono font-bold text-muted-foreground">
                              {idx + 1}.
                            </span>
                            {step.title}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded">
                            {step.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onNavigateTab(step.tab)
                          onOpenChange(false)
                        }}
                        className="text-xs h-7 gap-1 shrink-0 border-border/80 cursor-pointer self-center"
                      >
                        <Icon className="h-3 w-3 text-forest dark:text-oat" />
                        <span className="hidden sm:inline">{step.actionLabel}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ROLE GUIDANCE */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                InjeraOS provides tailored workflows for each position in your commercial bakery:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {ROLE_GUIDES.map((rg) => (
                  <Card key={rg.role} className="border-border/80 shadow-xs">
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{rg.title}</span>
                        <span className="text-[9px] font-bold text-forest dark:text-oat uppercase bg-forest/10 dark:bg-oat/15 px-2 py-0.5 rounded-full">
                          {rg.role}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                        {rg.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-forest dark:text-oat font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: OFFLINE RESILIENCE */}
          {activeTab === 'offline' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <WifiOff className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-foreground">Zero Data-Loss Architecture:</span>
                  <p className="leading-relaxed">
                    Bakery production facilities often face power fluctuations or unstable internet. InjeraOS is architected to operate fully offline.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border bg-card space-y-1">
                  <span className="font-bold text-foreground block">1. Local Storage</span>
                  <p className="text-[11px] text-muted-foreground">
                    When disconnected, attendance, sales tickets, and baking logs commit directly into local browser IndexedDB.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border bg-card space-y-1">
                  <span className="font-bold text-foreground block">2. Automatic Reconnection</span>
                  <p className="text-[11px] text-muted-foreground">
                    As soon as network connectivity is restored, the background synchronization engine flushes the pending queue.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border bg-card space-y-1">
                  <span className="font-bold text-foreground block">3. Conflict Resolution</span>
                  <p className="text-[11px] text-muted-foreground">
                    If two terminals sell the same inventory lot simultaneously, the conflict resolution console flags it for supervisor review.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onNavigateTab('sync')
                    onOpenChange(false)
                  }}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <WifiOff className="h-3.5 w-3.5 text-primary" />
                  <span>Inspect Offline Sync Console</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Collapsible Onboarding Checklist Card displayed directly on the Dashboard
 */
export function OnboardingDashboardWidget({
  onNavigateTab,
}: {
  onNavigateTab: (tab: TabType) => void
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('injera_onboarding_widget_dismissed') === 'true'
    } catch {
      return false
    }
  })
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('injera_onboarding_completed')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [modalOpen, setModalOpen] = useState(false)

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem('injera_onboarding_widget_dismissed', 'true')
    } catch {
      // ignore
    }
  }

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      try {
        localStorage.setItem('injera_onboarding_completed', JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  if (dismissed) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="h-4 w-4 text-forest dark:text-oat" />
          <span>Need help setting up your bakery? Open the setup guide anytime.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="text-xs h-7 gap-1 border-border/80 cursor-pointer"
        >
          <BookOpen className="h-3 w-3" />
          <span>Open Guide</span>
        </Button>
        <OnboardingGuideModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onNavigateTab={onNavigateTab}
        />
      </div>
    )
  }

  const progressPercent = Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100)

  return (
    <>
      <div className="rounded-2xl border border-forest/30 bg-gradient-to-br from-card via-card to-[#EEE5D4]/25 dark:to-emerald-950/20 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-oat shadow-xs shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Bakery Setup & Onboarding Checklist
                </h3>
                <span className="text-[10px] font-bold text-forest dark:text-oat uppercase bg-forest/10 dark:bg-oat/15 px-2 py-0.2 rounded-full">
                  {completedSteps.length}/{ONBOARDING_STEPS.length} Completed
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Follow these essential operational steps to configure recipes, workforce, and mitad baking lines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="text-xs h-8 gap-1.5 border-border/80 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-forest dark:text-oat" />
              <span>Full Guide</span>
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Dismiss checklist banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3.5 space-y-1">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-forest dark:bg-oat transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Top 4 Priority Next Steps */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {ONBOARDING_STEPS.slice(0, 4).map((step, idx) => {
            const isDone = completedSteps.includes(step.id)
            const Icon = step.icon

            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-colors ${
                  isDone
                    ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10'
                    : 'border-border/80 bg-background/80 hover:border-forest/30'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">
                      Step 0{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id)}
                      className="cursor-pointer"
                      title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/50 hover:text-foreground" />
                      )}
                    </button>
                  </div>
                  <span
                    className={`font-semibold block ${
                      isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                <div className="pt-2.5 mt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{step.category}</span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab(step.tab)}
                    className="inline-flex items-center gap-1 font-semibold text-forest dark:text-oat text-[11px] hover:underline cursor-pointer"
                  >
                    <Icon className="h-3 w-3" />
                    <span>Open</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <OnboardingGuideModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onNavigateTab={onNavigateTab}
      />
    </>
  )
}
