import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TabType } from '@/components/layout/AppSidebar'
import {
  ONBOARDING_STEPS,
  useOnboardingProgress,
} from './onboardingData'

/**
 * Persistent Setup Order Progression Banner
 * Keeps administrators on track. Can be minimized or permanently dismissed across all pages.
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

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('injera_setup_banner_dismissed') === 'true'
    } catch {
      return false
    }
  })

  const [minimized, setMinimized] = useState(() => {
    try {
      const stored = localStorage.getItem('injera_setup_banner_minimized')
      if (stored !== null) return stored === 'true'
      if (typeof window !== 'undefined' && window.innerWidth < 768) return true
      return false
    } catch {
      return false
    }
  })

  // Listen for custom event to bring banner back if requested
  useEffect(() => {
    const handleReset = () => setDismissed(false)
    window.addEventListener('injera_setup_banner_reset', handleReset)
    return () => window.removeEventListener('injera_setup_banner_reset', handleReset)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem('injera_setup_banner_dismissed', 'true')
    } catch {
      // ignore
    }
  }

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

  // If dismissed or all completed, do not render banner across pages
  if (dismissed || isAllComplete) {
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
      <aside aria-label="Bakery Setup Tracker" className="border-b border-border/80 bg-muted/40 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest text-oat text-[10px] font-bold font-mono shrink-0">
            {completedSteps.length}
          </span>
          <span className="font-semibold text-foreground truncate">
            Setup ({completedSteps.length}/8):{' '}
            {currentStep ? currentStep.title : `Next: Step 0${nextIncompleteIndex + 1} • ${nextIncomplete?.title}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenFullGuide}
            className="h-6 text-[11px] px-2 text-forest dark:text-oat font-semibold cursor-pointer gap-1"
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">Setup Wizard</span>
          </Button>

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
              <span>Next</span>
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

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer rounded-full"
            title="Dismiss banner across pages"
            aria-label="Dismiss setup banner"
          >
            <X className="h-3.5 w-3.5" />
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
              Requirement:
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
                  className="h-8 text-xs bg-forest hover:bg-forest/90 text-oat dark:bg-oat dark:text-forest dark:hover:bg-oat/90 gap-1.5 cursor-pointer shadow-xs font-semibold"
                >
                  <span>Step 0{nextStep.order}: {nextStep.shortTitle}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => markStepComplete(currentStep.id)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark Completed</span>
                </Button>
              )}
            </>
          ) : (
            nextIncomplete && (
              <Button
                size="sm"
                onClick={() => onNavigateTab(nextIncomplete.tab)}
                className="h-8 text-xs bg-forest hover:bg-forest/90 text-oat dark:bg-oat dark:text-forest dark:hover:bg-oat/90 gap-1.5 cursor-pointer shadow-xs font-semibold"
              >
                <span>Jump to Step 0{nextIncompleteIndex + 1}: {nextIncomplete.shortTitle}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenFullGuide}
            className="h-8 text-xs text-forest dark:text-oat hover:bg-forest/10 dark:hover:bg-oat/15 font-semibold cursor-pointer px-2 gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Setup Wizard</span>
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

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer rounded-full"
            title="Permanently dismiss banner across pages"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
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
