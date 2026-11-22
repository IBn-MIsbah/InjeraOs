import { useState } from 'react'
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  ExternalLink,
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

/**
 * Persistent Setup Order Progression Banner
 * Keeps administrators on track without having to navigate back to the overview to find out what's next.
 */
export function SetupProgressionBanner({
  activeTab,
  onNavigateTab,
  onOpenFullGuide,
}: {
  activeTab: TabType
  onNavigateTab: (tab: TabType) => void
  onOpenFullGuide: () => void
}) {
  const {
    completedSteps,
    isCompleted,
    markStepComplete,
    nextIncomplete,
    nextIncompleteIndex,
    isAllComplete,
    progressPercent,
  } = useOnboardingProgress()

  const [minimized, setMinimized] = useState(() => {
    try {
      return localStorage.getItem('injera_setup_banner_minimized') === 'true'
    } catch {
      return false
    }
  })

  const toggleMinimized = () => {
    setMinimized((prev) => {
      const next = !prev
      try {
        localStorage.setItem('injera_setup_banner_minimized', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // If all completed, hide the setup progression banner
  if (isAllComplete) {
    return null
  }

  const currentStep = ONBOARDING_STEPS.find((s) => s.tab === activeTab)
  const currentStepIndex = currentStep ? ONBOARDING_STEPS.indexOf(currentStep) : -1
  const nextStep =
    currentStepIndex >= 0 && currentStepIndex < ONBOARDING_STEPS.length - 1
      ? ONBOARDING_STEPS[currentStepIndex + 1]
      : null
  const prevStep = currentStepIndex > 0 ? ONBOARDING_STEPS[currentStepIndex - 1] : null

  // If minimized, render sleek, non-intrusive strip
  if (minimized) {
    return (
      <aside aria-label="Bakery Setup Tracker" className="border-b border-border/80 bg-muted/40 px-4 py-1.5 flex items-center justify-between text-xs backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest text-oat text-[10px] font-bold font-mono">
            {completedSteps.length}
          </span>
          <span className="font-semibold text-foreground truncate">
            Setup Order ({completedSteps.length}/8):{' '}
            {currentStep ? currentStep.title : `Next: Step 0${nextIncompleteIndex + 1} • ${nextIncomplete?.title}`}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentStep && nextStep && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                markStepComplete(currentStep.id)
                onNavigateTab(nextStep.tab)
              }}
              className="h-6 text-[11px] px-2 gap-1 border-forest/30 text-forest dark:text-oat cursor-pointer"
            >
              <span>Next: {nextStep.shortTitle}</span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
          {!currentStep && nextIncomplete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateTab(nextIncomplete.tab)}
              className="h-6 text-[11px] px-2 gap-1 border-forest/30 text-forest dark:text-oat cursor-pointer"
            >
              <span>Go to Step 0${nextIncompleteIndex + 1}</span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleMinimized}
            className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <span>Expand</span>
          </Button>
        </div>
      </aside>
    )
  }

  return (
    <aside aria-label="Bakery Setup Progression Tracker" className="border-b border-forest/20 bg-forest/5 dark:bg-oat/5 px-4 py-3 text-xs">
      {/* Top row: Status, Title, Missing Info, Next CTA */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-md bg-forest text-oat dark:bg-oat dark:text-forest px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {currentStep
                ? `Setup Order: Step 0${currentStep.order} of 08`
                : `Setup Order: ${completedSteps.length} of 08 Completed (${progressPercent}%)`}
            </span>
            <span className="font-bold text-sm text-foreground">
              {currentStep ? currentStep.title : `Next Task: Step 0${nextIncompleteIndex + 1} • ${nextIncomplete?.title}`}
            </span>
            {currentStep && isCompleted(currentStep.id) && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                Done
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs text-pretty">
            {currentStep
              ? currentStep.description
              : `Accomplish next: ${nextIncomplete?.description}`}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-200 font-medium pt-0.5">
            <span className="font-bold uppercase tracking-wide text-[10px] bg-amber-500/15 px-1.5 py-0.2 rounded">
              Requirement / Missing:
            </span>
            <span>
              {currentStep
                ? isCompleted(currentStep.id)
                  ? 'Task recorded. Ready to advance to the next setup order.'
                  : currentStep.missingRequirement
                : nextIncomplete?.missingRequirement}
            </span>
          </div>
        </div>

        {/* Right CTA Actions: Advance directly without leaving the view */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          {currentStep ? (
            <>
              {prevStep && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateTab(prevStep.tab)}
                  className="h-8 text-xs border-border/80 gap-1 cursor-pointer"
                  title={`Go back to Step 0${prevStep.order}: ${prevStep.shortTitle}`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Step 0{prevStep.order}</span>
                </Button>
              )}

              {nextStep ? (
                <Button
                  size="sm"
                  onClick={() => {
                    markStepComplete(currentStep.id)
                    onNavigateTab(nextStep.tab)
                  }}
                  className="h-8 text-xs bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest font-semibold gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Mark Done & Next: {nextStep.shortTitle}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    markStepComplete(currentStep.id)
                    onNavigateTab('workspace')
                  }}
                  className="h-8 text-xs bg-emerald-600 text-white hover:bg-emerald-700 font-semibold gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Finish Setup & Go to Overview</span>
                </Button>
              )}
            </>
          ) : (
            nextIncomplete && (
              <Button
                size="sm"
                onClick={() => onNavigateTab(nextIncomplete.tab)}
                className="h-8 text-xs bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest font-semibold gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Continue Setup: Step 0{nextIncompleteIndex + 1} ({nextIncomplete.shortTitle})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenFullGuide}
            className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2"
          >
            <span>All Steps</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={toggleMinimized}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Minimize setup guide bar"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stepper track: All 8 sequential setup steps */}
      <nav aria-label="Setup Steps Trail" className="mt-3 pt-2.5 border-t border-border/40 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {ONBOARDING_STEPS.map((step, idx) => {
          const isDone = isCompleted(step.id)
          const isCurrent = currentStep?.id === step.id
          const isNextTarget = !currentStep && nextIncomplete?.id === step.id

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onNavigateTab(step.tab)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer shrink-0 border select-none ${
                isCurrent
                  ? 'bg-forest text-oat border-forest dark:bg-oat dark:text-forest font-semibold shadow-xs'
                  : isDone
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15'
                    : isNextTarget
                      ? 'border-forest/60 bg-forest/10 text-forest dark:border-oat/50 dark:bg-oat/15 dark:text-oat font-medium'
                      : 'border-border/60 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title={`Step 0${step.order}: ${step.title} • ${step.missingRequirement}`}
            >
              {isDone ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-mono font-bold ${
                    isCurrent ? 'bg-oat text-forest dark:bg-forest dark:text-oat' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </span>
              )}
              <span>{step.shortTitle}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

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
    nextIncompleteIndex,
    progressPercent,
  } = useOnboardingProgress()

  const [activeTab, setActiveTab] = useState<'checklist' | 'roles' | 'offline'>('checklist')

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
                    Sequential Setup
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Ordered roadmap for launching commercial mitad baking, sales, and inventory operations.
                </DialogDescription>
              </div>
            </div>
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

            {nextIncomplete && (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-forest/20 bg-forest/5 dark:bg-oat/5 text-xs mt-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="text-[10px] bg-forest text-oat px-1.5 py-0.2 rounded font-mono">
                      UP NEXT: STEP 0{nextIncompleteIndex + 1}
                    </span>
                    <span>{nextIncomplete.title}</span>
                  </div>
                  <span className="text-[11px] text-amber-800 dark:text-amber-200 block">
                    {nextIncomplete.missingRequirement}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onNavigateTab(nextIncomplete.tab)
                    onOpenChange(false)
                  }}
                  className="h-7 text-xs bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest font-semibold gap-1 shrink-0 ml-2 cursor-pointer"
                >
                  <span>Continue Step 0{nextIncompleteIndex + 1}</span>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
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
              Setup Order ({completedSteps.length}/{ONBOARDING_STEPS.length})
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
                      className={`flex items-start gap-3.5 p-3.5 rounded-xl border text-xs transition-colors ${
                        isDone
                          ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10'
                          : isNext
                            ? 'border-forest bg-forest/5 dark:border-oat/50 dark:bg-oat/10'
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
                              Step 0{idx + 1}.
                            </span>
                            {step.title}
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

                      <div className="flex items-center gap-1.5 shrink-0 self-center">
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
 * Collapsible Onboarding Checklist Card displayed directly on the Dashboard Overview
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
  const [modalOpen, setModalOpen] = useState(false)

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem('injera_onboarding_widget_dismissed', 'true')
    } catch {
      // ignore
    }
  }

  if (dismissed) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="h-4 w-4 text-forest dark:text-oat" />
          <span>Need help setting up your bakery? Open the setup roadmap anytime.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="text-xs h-7 gap-1 border-border/80 cursor-pointer"
        >
          <BookOpen className="h-3 w-3" />
          <span>Open Setup Order</span>
        </Button>
        <OnboardingGuideModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onNavigateTab={onNavigateTab}
        />
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest/10 text-forest dark:bg-oat/15 dark:text-oat shrink-0">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-foreground">
                  {isAllComplete
                    ? 'Bakery Setup Complete'
                    : nextIncomplete
                      ? `Step 0${nextIncompleteIndex + 1}: ${nextIncomplete.title}`
                      : 'Bakery Setup'}
                </span>
                <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                  {completedSteps.length}/{ONBOARDING_STEPS.length}
                </span>
              </div>
              {!isAllComplete && nextIncomplete && (
                <div className="text-[10px] text-amber-800 dark:text-amber-200 font-medium truncate max-w-sm">
                  {nextIncomplete.missingRequirement}
                </div>
              )}
              <div className="h-1 w-36 sm:w-48 bg-muted rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-forest dark:bg-oat transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {!isAllComplete && nextIncomplete && (
              <Button
                size="sm"
                onClick={() => onNavigateTab(nextIncomplete.tab)}
                className="h-7 text-xs bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest cursor-pointer gap-1 px-2.5 font-semibold"
              >
                <span>{nextIncomplete.actionLabel}</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2"
            >
              <span>Setup Order</span>
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
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
