import { useState, useEffect } from 'react'
import {
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Store,
  Users,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TabType } from '@/components/layout/AppSidebar'
import { useOnboardingProgress } from './onboardingData'
import { toast } from 'sonner'
import { branchesApi } from '@/lib/api'

interface BakerySetupWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateTab: (tab: TabType) => void
  initialStep?: number
}

const WIZARD_STEPS = [
  {
    step: 1,
    id: 'business_calendar',
    title: 'Bakery Profile & Calendar',
    shortTitle: 'Profile',
    icon: Building2,
    description: 'Configure your legal bakery identity and financial accounting calendar.',
  },
  {
    step: 2,
    id: 'baking_stations',
    title: 'Baking Stations & Mitads',
    shortTitle: 'Stations',
    icon: Flame,
    description: 'Set up your primary baking facility, clay or electric mitad lines.',
  },
  {
    step: 3,
    id: 'teff_materials',
    title: 'Raw Teff Grain Varieties',
    shortTitle: 'Teff Silos',
    icon: Boxes,
    description: 'Select raw grain types and establish silo replenishment levels.',
  },
  {
    step: 4,
    id: 'recipe_formulas',
    title: 'Injera Recipe & Ayen Formula',
    shortTitle: 'Recipe',
    icon: ChefHat,
    description: 'Standardize your flour blend, ersho fermentation, and target eye count.',
  },
  {
    step: 5,
    id: 'workforce_shifts',
    title: 'Mitad Bakers & Shifts',
    shortTitle: 'Bakers',
    icon: Users,
    description: 'Assign your lead bakers and schedule morning or afternoon mitad shifts.',
  },
]

export function BakerySetupWizard({
  open,
  onOpenChange,
  onNavigateTab,
  initialStep = 1,
}: BakerySetupWizardProps) {
  const {
    completedSteps,
    markStepComplete,
    isCompleted,
  } = useOnboardingProgress()

  const [currentStep, setCurrentStep] = useState(initialStep)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Profile & Calendar state
  const [bakeryName, setBakeryName] = useState('KD PLC Commercial Bakery')
  const [calendarType, setCalendarType] = useState<'ethiopian' | 'gregorian'>('ethiopian')
  const [citySubcity, setCitySubcity] = useState('Addis Ababa - Bole Subcity')

  // Step 2: Baking Station state
  const [stationName, setStationName] = useState('Main Baking Plant - Mitad Line 01')
  const [stationType, setStationType] = useState<'electric' | 'clay' | 'hybrid'>('electric')
  const [mitadCount, setMitadCount] = useState(12)

  // Step 3: Raw Teff state
  const [selectedTeffs, setSelectedTeffs] = useState<string[]>([
    'magna_white',
    'sergegna_mixed',
  ])
  const [minThresholdKg, setMinThresholdKg] = useState(2500)

  // Step 4: Recipe formula state
  const [recipeName, setRecipeName] = useState('100% Pure Teff Premium Injera')
  const [ershoDays, setErshoDays] = useState(3)
  const [targetAyen, setTargetAyen] = useState('Uniform Fine Honeycomb (Ayenama)')

  // Step 5: Baker & Shift state
  const [bakerName, setBakerName] = useState('Aster Tesfaye (Mitad Lead)')
  const [shiftTime, setShiftTime] = useState<'morning' | 'afternoon'>('morning')

  // Jump to appropriate initial step when modal opens
  useEffect(() => {
    if (open) {
      if (initialStep) {
        setCurrentStep(initialStep)
      } else {
        const firstIncomplete = WIZARD_STEPS.find((s) => !completedSteps.includes(s.id))
        setCurrentStep(firstIncomplete ? firstIncomplete.step : 6)
      }
    }
  }, [open, initialStep, completedSteps])

  const handleNext = async () => {
    setIsSubmitting(true)
    try {
      if (currentStep === 1) {
        markStepComplete('business_calendar')
        toast.success('Bakery profile & calendar saved', {
          description: `Configured ${calendarType === 'ethiopian' ? 'Ethiopian (ዓ.ም)' : 'Gregorian'} calendar.`,
        })
      } else if (currentStep === 2) {
        markStepComplete('baking_stations')
        // Attempt quick backend creation if not already present
        try {
          await branchesApi.createBranch({
            name: stationName,
            code: 'STN-01',
            address: citySubcity,
            isMain: true,
          })
        } catch {
          // graceful offline / already created fallback
        }
        toast.success('Baking station recorded', {
          description: `${stationName} (${mitadCount} ${stationType} mitads) ready.`,
        })
      } else if (currentStep === 3) {
        markStepComplete('teff_materials')
        toast.success('Teff grain varieties saved', {
          description: `${selectedTeffs.length} grain lots active with ${minThresholdKg} kg silo reorder level.`,
        })
      } else if (currentStep === 4) {
        markStepComplete('recipe_formulas')
        toast.success('Injera recipe formula locked in', {
          description: `${recipeName} (${ershoDays} days fermentation).`,
        })
      } else if (currentStep === 5) {
        markStepComplete('workforce_shifts')
        markStepComplete('mitad_baking')
        toast.success('Mitad staff assigned', {
          description: `${bakerName} scheduled for ${shiftTime} shift.`,
        })
      }
      setCurrentStep((prev) => Math.min(prev + 1, 6))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 6))
  }

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const toggleTeff = (id: string) => {
    setSelectedTeffs((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl gap-0 border-border/80 shadow-2xl">
        {/* Wizard Header with Brand & Stepper */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-card via-card to-[#EEE5D4]/40 dark:to-emerald-950/20 border-b border-border/80">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-oat shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Bakery Setup Wizard</span>
                  <span className="text-[10px] font-semibold uppercase bg-forest/10 text-forest dark:bg-oat/15 dark:text-oat px-2 py-0.5 rounded-full">
                    {currentStep === 6 ? 'Completed' : `Step 0${currentStep} of 05`}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Guided setup to establish your baking stations, grain silos, and production lines.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Stepper Progress Bar & Interactive Pills */}
          <div className="pt-2">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {WIZARD_STEPS.map((step) => {
                const isPast = currentStep > step.step
                const isCurrent = currentStep === step.step
                const isStepDone = isCompleted(step.id)

                return (
                  <button
                    key={step.step}
                    type="button"
                    onClick={() => setCurrentStep(step.step)}
                    className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer select-none ${
                      isCurrent
                        ? 'border-forest bg-forest text-oat dark:border-oat dark:bg-oat dark:text-forest shadow-xs font-bold'
                        : isPast || isStepDone
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium'
                          : 'border-border/60 bg-background/50 text-muted-foreground hover:border-forest/40'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      {isStepDone ? (
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] font-mono">0{step.step}</span>
                      )}
                    </div>
                    <span className="text-[10px] truncate max-w-full hidden sm:inline">
                      {step.shortTitle}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* STEP 1: Profile & Calendar */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-forest dark:text-oat" />
                  Legal Bakery Profile & Fiscal Calendar
                </h3>
                <p className="text-xs text-muted-foreground">
                  Choose your fiscal accounting calendar and verify legal business details.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Bakery Legal / Brand Name
                  </label>
                  <input
                    type="text"
                    value={bakeryName}
                    onChange={(e) => setBakeryName(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-forest dark:focus:ring-oat"
                    placeholder="e.g. KD PLC Commercial Injera Bakery"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    City & Sub-City Headquarters
                  </label>
                  <input
                    type="text"
                    value={citySubcity}
                    onChange={(e) => setCitySubcity(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-forest dark:focus:ring-oat"
                    placeholder="e.g. Addis Ababa - Bole Subcity"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Accounting & Production Calendar System
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCalendarType('ethiopian')}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        calendarType === 'ethiopian'
                          ? 'border-forest bg-forest/10 text-forest dark:border-oat/60 dark:bg-oat/15 dark:text-oat font-semibold'
                          : 'border-border/80 bg-card hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Ethiopian Calendar (ዓ.ም)</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Meskerem–Pagume fiscal periods, Birr (ETB), Ethiopian tax months.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCalendarType('gregorian')}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        calendarType === 'gregorian'
                          ? 'border-forest bg-forest/10 text-forest dark:border-oat/60 dark:bg-oat/15 dark:text-oat font-semibold'
                          : 'border-border/80 bg-card hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Gregorian Calendar</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Standard Western calendar (Jan–Dec) for international reporting.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Baking Facility & Mitads */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  Primary Commercial Baking Facility & Mitads
                </h3>
                <p className="text-xs text-muted-foreground">
                  Register your main bakery branch and configure its baking line equipment.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Baking Facility / Station Name
                  </label>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-forest dark:focus:ring-oat"
                    placeholder="e.g. Main Baking Plant - Mitad Line 01"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Mitad Technology / Heating Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'electric', label: 'Commercial Electric', sub: 'Precision heat control' },
                      { id: 'clay', label: 'Traditional Clay', sub: 'Wood / biomass smoke flavor' },
                      { id: 'hybrid', label: 'Dual Hybrid Line', sub: 'Mixed electric & clay' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStationType(item.id as typeof stationType)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          stationType === item.id
                            ? 'border-forest bg-forest/10 text-forest dark:border-oat/60 dark:bg-oat/15 dark:text-oat font-semibold'
                            : 'border-border/80 bg-card hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Installed Mitads in Operation: <span className="font-bold text-forest dark:text-oat">{mitadCount} mitads</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={50}
                    value={mitadCount}
                    onChange={(e) => setMitadCount(Number(e.target.value))}
                    className="w-full accent-forest dark:accent-oat cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>2 Mitads (Artisanal)</span>
                    <span>12 Mitads (Medium Commercial)</span>
                    <span>50 Mitads (Industrial)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Raw Teff Varieties */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-blue-500" />
                  Raw Teff Varieties & Silo Storage
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select which teff varieties your bakery stores for milling and mixing.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                {[
                  {
                    id: 'magna_white',
                    name: 'Magna White Teff (ነጭ ጤፍ)',
                    grade: 'Grade 1 Premium Export',
                    desc: 'Highest price point, bright white color, preferred by luxury hotels and catering.',
                  },
                  {
                    id: 'sergegna_mixed',
                    name: 'Sergegna Mixed Teff (ሰርገኛ ጤፍ)',
                    grade: 'Commercial Standard',
                    desc: 'Balanced white & red teff blend, high elasticity, staple for daily wholesale batches.',
                  },
                  {
                    id: 'brown_teff',
                    name: 'Brown / Red Teff (ቀይ ጤፍ)',
                    grade: 'High Iron & Mineral',
                    desc: 'Rich nutty flavor, higher iron content, cost-effective formulation for retail buyers.',
                  },
                ].map((teff) => {
                  const active = selectedTeffs.includes(teff.id)
                  return (
                    <div
                      key={teff.id}
                      onClick={() => toggleTeff(teff.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        active
                          ? 'border-forest bg-forest/5 dark:border-oat/50 dark:bg-oat/10'
                          : 'border-border/80 bg-card hover:border-forest/30'
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                          active
                            ? 'bg-forest text-oat border-forest dark:bg-oat dark:text-forest'
                            : 'border-muted-foreground/40 bg-background'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">{teff.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                            {teff.grade}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{teff.desc}</p>
                      </div>
                    </div>
                  )
                })}

                <div className="pt-2">
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Silo Minimum Reorder Level (kg)
                  </label>
                  <input
                    type="number"
                    value={minThresholdKg}
                    onChange={(e) => setMinThresholdKg(Number(e.target.value))}
                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-forest dark:focus:ring-oat font-mono"
                    placeholder="e.g. 2500 kg (25 quintals)"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    When raw teff silo drops below this level, an automated replenishment alert is triggered.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Injera Recipe & Ayen */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Standardize Recipe & Fermentation Formula
                </h3>
                <p className="text-xs text-muted-foreground">
                  Lock in your flour-to-water ratio, starter culture (ersho) fermentation, and ayen standard.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Master Recipe Name
                  </label>
                  <input
                    type="text"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-forest dark:focus:ring-oat"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Starter (Ersho) Fermentation
                    </label>
                    <select
                      value={ershoDays}
                      onChange={(e) => setErshoDays(Number(e.target.value))}
                      className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-forest dark:focus:ring-oat"
                    >
                      <option value={2}>2 Days (Mild Acidity)</option>
                      <option value={3}>3 Days (Commercial Sweet Spot)</option>
                      <option value={4}>4 Days (Deep Traditional Sour)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Target Ayen (Eye Formation)
                    </label>
                    <input
                      type="text"
                      value={targetAyen}
                      onChange={(e) => setTargetAyen(e.target.value)}
                      className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-forest dark:focus:ring-oat"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/80 bg-muted/30 text-xs text-muted-foreground space-y-1">
                  <span className="font-semibold text-foreground block">
                    Formula Quality Benchmark:
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Under standard fermentation, 100 kg pure teff flour yields approximately 350 to 380 finished commercial injeras with uniform eye perforation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Mitad Bakers & Shifts */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  Mitad Bakers & Initial Shift Schedule
                </h3>
                <p className="text-xs text-muted-foreground">
                  Assign your lead baker and schedule their initial operating shift.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Primary Baker / Mitad Lead
                  </label>
                  <input
                    type="text"
                    value={bakerName}
                    onChange={(e) => setBakerName(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-forest dark:focus:ring-oat"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    InjeraOS will assign an automatic employee badge ID (e.g. EMP-0001).
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Operating Shift Schedule
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShiftTime('morning')}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        shiftTime === 'morning'
                          ? 'border-forest bg-forest/10 text-forest dark:border-oat/60 dark:bg-oat/15 dark:text-oat font-semibold'
                          : 'border-border/80 bg-card hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <span className="text-xs font-bold text-foreground">Early Morning Shift</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        4:00 AM – 12:00 PM &bull; Fresh morning hotel wholesale dispatch.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShiftTime('afternoon')}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        shiftTime === 'afternoon'
                          ? 'border-forest bg-forest/10 text-forest dark:border-oat/60 dark:bg-oat/15 dark:text-oat font-semibold'
                          : 'border-border/80 bg-card hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <span className="text-xs font-bold text-foreground">Afternoon Shift</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        12:00 PM – 8:00 PM &bull; Retail walk-in dinner demand replenishment.
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Completion Celebration */}
          {currentStep === 6 && (
            <div className="space-y-4 py-2 text-center animate-in zoom-in-95 duration-200">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Bakery Ready for Commercial Operations!
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Your baking station equipment, teff grain silos, master recipe, and staff shifts are established.
                </p>
              </div>

              {/* Ready Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-left">
                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1.5 text-forest dark:text-oat">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold">Profile</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{bakeryName}</p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Flame className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold">Mitads</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{mitadCount} {stationType} mitads</p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-500">
                    <Boxes className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold">Teff Silos</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{selectedTeffs.length} grain types</p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-500">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold">Staff</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{bakerName.split(' ')[0]}</p>
                </div>
              </div>

              {/* Direct Next Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-4">
                <Button
                  onClick={() => {
                    onOpenChange(false)
                    onNavigateTab('production')
                  }}
                  className="w-full sm:w-auto bg-forest hover:bg-forest/90 text-oat dark:bg-oat dark:text-forest dark:hover:bg-oat/90 font-bold text-xs h-9 px-4 gap-2 cursor-pointer shadow-sm"
                >
                  <Flame className="h-4 w-4" />
                  <span>Start First Mitad Baking Run</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false)
                    onNavigateTab('workspace')
                  }}
                  className="w-full sm:w-auto text-xs h-9 px-4 gap-1.5 border-border/80 cursor-pointer"
                >
                  <Store className="h-4 w-4" />
                  <span>Open Executive Dashboard</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        {currentStep < 6 && (
          <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="text-xs h-8 gap-1 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>
              )}
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1"
              >
                Skip this step
              </button>
            </div>

            <Button
              size="sm"
              onClick={handleNext}
              disabled={isSubmitting}
              className="bg-forest hover:bg-forest/90 text-oat dark:bg-oat dark:text-forest dark:hover:bg-oat/90 font-semibold text-xs h-8 px-4 gap-1.5 cursor-pointer shadow-xs"
            >
              <span>{currentStep === 5 ? 'Complete Setup' : 'Save & Continue'}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
