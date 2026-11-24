import { useState } from 'react'
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  RotateCcw,
  Sparkles,
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
import {
  ONBOARDING_STEPS,
  ROLE_GUIDES,
  useOnboardingProgress,
} from './onboardingData'
import { BakerySetupWizard } from './BakerySetupWizard'

export { SetupProgressionBanner } from './SetupProgressionBanner'
export { BakerySetupWizard } from './BakerySetupWizard'

export function OnboardingGuideModal({
  open,
  onOpenChange,
  onNavigateTab,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateTab: (tab: TabType) => void
}) {
  const {
    completedSteps,
    toggleStep,
    markStepComplete,
    resetAll,
    nextIncomplete,
    progressPercent,
  } = useOnboardingProgress()

  const [activeTab, setActiveTab] = useState<'wizard' | 'checklist' | 'roles' | 'offline'>('wizard')

  // If in wizard mode, display the step-by-step Bakery Setup Wizard
  if (activeTab === 'wizard') {
    return (
      <BakerySetupWizard
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen)
          if (!isOpen) setActiveTab('wizard')
        }}
        onNavigateTab={onNavigateTab}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl gap-0 border-border/80 shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-br from-card via-card to-[#EEE5D4]/30 dark:to-emerald-950/20 border-b border-border/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-oat shadow-xs">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  InjeraOS Bakery Onboarding Reference
                  <span className="text-[10px] font-semibold uppercase bg-forest/10 text-forest dark:bg-oat/15 dark:text-oat px-2 py-0.5 rounded-full">
                    Setup Directory
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Ordered roadmap for launching commercial mitad baking, sales, and inventory operations.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('wizard')}
              className="text-xs h-8 border-forest/30 text-forest dark:text-oat gap-1.5 cursor-pointer font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Open Guided Wizard</span>
            </Button>
          </div>

          {/* Progress Bar & Next Step Indicator */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Setup Sequence Progress
              </span>
              <span className="font-mono text-muted-foreground tabular-nums">
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
              onClick={() => setActiveTab('wizard')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-forest dark:text-oat hover:bg-forest/10 dark:hover:bg-oat/15 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              <span>Step-by-Step Wizard</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'checklist'
                  ? 'bg-forest text-oat dark:bg-oat dark:text-forest font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Tasks ({completedSteps.length}/{ONBOARDING_STEPS.length})
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
              Role Orientation
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
              Offline Resilience
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* TAB 1: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span>Follow the setup order sequentially. Complete each task then move to the next:</span>
                {completedSteps.length > 0 && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="flex items-center gap-1 text-[11px] hover:text-foreground text-muted-foreground cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset sequence</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {ONBOARDING_STEPS.map((step, idx) => {
                  const isDone = completedSteps.includes(step.id)
                  const isNext = nextIncomplete?.id === step.id
                  const Icon = step.icon

                  return (
                    <div
                      key={step.id}
                      className={`flex flex-col sm:flex-row sm:items-start gap-3 p-3.5 rounded-xl border text-xs transition-colors ${
                        isDone
                          ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10'
                          : isNext
                            ? 'border-forest bg-forest/5 dark:border-oat/50 dark:bg-oat/10'
                            : 'border-border/80 bg-card hover:border-forest/30'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
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

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span
                              className={`font-semibold text-xs flex flex-wrap items-center gap-1.5 ${
                                isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              <span className="text-[10px] font-mono font-bold text-muted-foreground">
                                Step 0{idx + 1}.
                              </span>
                              <span>{step.title}</span>
                              {isNext && (
                                <span className="rounded bg-forest text-oat dark:bg-oat dark:text-forest text-[9px] font-bold px-1.5 py-0.2 uppercase">
                                  Next Task
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded">
                              {step.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                          <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                            {step.missingRequirement}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:shrink-0 sm:self-center pl-8 sm:pl-0">
                        {!isDone && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              markStepComplete(step.id)
                              const nextIdx = idx + 1
                              if (nextIdx < ONBOARDING_STEPS.length) {
                                onNavigateTab(ONBOARDING_STEPS[nextIdx].tab)
                              }
                              onOpenChange(false)
                            }}
                            className="text-xs h-7 px-2 bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest cursor-pointer gap-1"
                            title="Mark Done & Proceed to Next Task in sequence"
                          >
                            <Check className="h-3 w-3" />
                            <span className="hidden sm:inline">Done & Next</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onNavigateTab(step.tab)
                            onOpenChange(false)
                          }}
                          className="text-xs h-7 gap-1 border-border/80 cursor-pointer"
                        >
                          <Icon className="h-3 w-3 text-forest dark:text-oat" />
                          <span className="hidden sm:inline">{step.actionLabel}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Onboarding Card for the Executive Dashboard
 */
export function OnboardingDashboardWidget({
  onNavigateTab,
}: {
  onNavigateTab: (tab: TabType) => void
}) {
  const {
    completedSteps,
    nextIncomplete,
    nextIncompleteIndex,
    isAllComplete,
    progressPercent,
  } = useOnboardingProgress()

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('injera_onboarding_widget_dismissed') === 'true'
    } catch {
      return false
    }
  })
  const [wizardOpen, setWizardOpen] = useState(false)

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem('injera_onboarding_widget_dismissed', 'true')
    } catch {
      // ignore
    }
  }

  if (dismissed && !isAllComplete) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4 text-forest dark:text-oat" />
          <span>Need to configure your bakery stations, teff silos, or staff? Launch setup wizard anytime.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWizardOpen(true)}
          className="text-xs h-7 gap-1.5 border-forest/30 text-forest dark:text-oat font-semibold cursor-pointer"
        >
          <Sparkles className="h-3 w-3" />
          <span>Launch Setup Wizard</span>
        </Button>
        <BakerySetupWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onNavigateTab={onNavigateTab}
        />
      </div>
    )
  }

  if (isAllComplete) {
    return null
  }

  return (
    <>
      <div className="rounded-xl border border-forest/30 bg-gradient-to-r from-card via-card to-forest/5 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-oat dark:bg-oat dark:text-forest shadow-xs shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">
                  Bakery Setup Wizard
                </span>
                <span className="text-[10px] font-mono font-bold text-forest dark:text-oat bg-forest/10 dark:bg-oat/15 px-1.5 py-0.2 rounded-full">
                  {completedSteps.length} of {ONBOARDING_STEPS.length} Completed ({progressPercent}%)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {nextIncomplete
                  ? `Next Step 0${nextIncompleteIndex + 1}: ${nextIncomplete.title} (${nextIncomplete.missingRequirement})`
                  : 'All primary bakery assets configured.'}
              </p>
              <div className="h-1.5 w-44 sm:w-64 bg-muted rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-forest dark:bg-oat transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              size="sm"
              onClick={() => setWizardOpen(true)}
              className="h-8 text-xs bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest font-bold cursor-pointer gap-1.5 px-3.5 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Launch Setup Wizard</span>
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              title="Dismiss card"
              aria-label="Dismiss setup card"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <BakerySetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onNavigateTab={onNavigateTab}
      />
    </>
  )
}
