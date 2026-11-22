import { useState, useEffect } from 'react'
import {
  Boxes,
  Building2,
  ChefHat,
  Flame,
  ShoppingCart,
  Users,
  WifiOff,
} from 'lucide-react'
import type { TabType } from '@/components/layout/AppSidebar'

export interface StepItem {
  id: string
  order: number
  title: string
  shortTitle: string
  description: string
  missingRequirement: string
  tab: TabType
  actionLabel: string
  icon: typeof Building2
  category: string
  role?: string
}

export const ONBOARDING_STEPS: StepItem[] = [
  {
    id: 'business_calendar',
    order: 1,
    title: 'Configure Bakery Profile & Calendar',
    shortTitle: 'Bakery Profile',
    description:
      'Set your legal bakery name, contact details, currency, and choose between the Ethiopian or Gregorian calendar for financial accounting.',
    missingRequirement: 'Missing: Legal bakery name, currency, or fiscal calendar.',
    tab: 'settings',
    actionLabel: 'Open Business Settings',
    icon: Building2,
    category: 'Setup',
  },
  {
    id: 'baking_stations',
    order: 2,
    title: 'Set Up Baking Stations & Locations',
    shortTitle: 'Baking Stations',
    description:
      'Register your primary commercial baking facility, clay or electric mitad lines, and regional depot locations.',
    missingRequirement: 'Missing: Commercial baking facility or station locations.',
    tab: 'branches',
    actionLabel: 'Manage Stations',
    icon: Building2,
    category: 'Setup',
  },
  {
    id: 'teff_materials',
    order: 3,
    title: 'Define Teff Varieties & Grain Silos',
    shortTitle: 'Teff Grain',
    description:
      'Record your raw grain inventory (Magna white, Sergegna mixed, and brown teff) and configure minimum stock reorder levels.',
    missingRequirement: 'Missing: Raw teff grain lots or warehouse silo levels.',
    tab: 'materials',
    actionLabel: 'View Grain Inventory',
    icon: Boxes,
    category: 'Inventory',
  },
  {
    id: 'recipe_formulas',
    order: 4,
    title: 'Standardize Injera Recipes & Scaling',
    shortTitle: 'Injera Recipes',
    description:
      'Define fermentation formulas, ersho (starter culture) ratios, and pre-mixed flour blending rules for uniform eye formation (ayen).',
    missingRequirement: 'Missing: Standardized flour formulation or ersho fermentation ratios.',
    tab: 'recipes',
    actionLabel: 'Open Recipe Scaling',
    icon: ChefHat,
    category: 'Production',
  },
  {
    id: 'workforce_shifts',
    order: 5,
    title: 'Register Staff & Schedule Mitad Shifts',
    shortTitle: 'Staff & Shifts',
    description:
      'Add your bakers, supervisors, and cashiers. InjeraOS automatically assigns unique employee IDs (e.g. EMP-0001).',
    missingRequirement: 'Missing: Registered staff members or scheduled mitad shifts.',
    tab: 'workforce',
    actionLabel: 'Manage Workforce',
    icon: Users,
    category: 'Operations',
  },
  {
    id: 'mitad_baking',
    order: 6,
    title: 'Run a Mitad Baking Session',
    shortTitle: 'Mitad Baking',
    description:
      'Start a baking run across clay or electric mitads, track pieces produced, and log scrap defects (burnt, cracked, thin).',
    missingRequirement: 'Missing: First logged baking session or mitad output record.',
    tab: 'production',
    actionLabel: 'Start Baking Session',
    icon: Flame,
    category: 'Production',
  },
  {
    id: 'sales_pos',
    order: 7,
    title: 'Process First Sale & Credit Ledger',
    shortTitle: 'Sales & POS',
    description:
      'Record walk-in retail purchases or wholesale hotel deliveries with cash, Telebirr, or credit accounts.',
    missingRequirement: 'Missing: Completed POS transaction or wholesale customer account.',
    tab: 'sales',
    actionLabel: 'Open POS Register',
    icon: ShoppingCart,
    category: 'Sales',
  },
  {
    id: 'offline_sync',
    order: 8,
    title: 'Verify Offline Mode & Local Queuing',
    shortTitle: 'Offline Sync',
    description:
      'When your internet connection drops, InjeraOS keeps working locally in IndexedDB and flushes data automatically when reconnected.',
    missingRequirement: 'Missing: Offline engine inspection or sync verification.',
    tab: 'sync',
    actionLabel: 'Inspect Sync Engine',
    icon: WifiOff,
    category: 'Offline',
  },
]

export const ROLE_GUIDES = [
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

export function useOnboardingProgress() {
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('injera_onboarding_completed')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem('injera_onboarding_completed')
        setCompletedSteps(stored ? JSON.parse(stored) : [])
      } catch {
        // ignore
      }
    }
    window.addEventListener('storage', handleUpdate)
    window.addEventListener('injera_onboarding_updated', handleUpdate)
    return () => {
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('injera_onboarding_updated', handleUpdate)
    }
  }, [])

  const markStepComplete = (id: string) => {
    setCompletedSteps((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      try {
        localStorage.setItem('injera_onboarding_completed', JSON.stringify(next))
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event('injera_onboarding_updated'))
      return next
    })
  }

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      try {
        localStorage.setItem('injera_onboarding_completed', JSON.stringify(next))
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event('injera_onboarding_updated'))
      return next
    })
  }

  const resetAll = () => {
    try {
      localStorage.removeItem('injera_onboarding_completed')
    } catch {
      // ignore
    }
    setCompletedSteps([])
    window.dispatchEvent(new Event('injera_onboarding_updated'))
  }

  const isCompleted = (id: string) => completedSteps.includes(id)
  const nextIncomplete = ONBOARDING_STEPS.find((s) => !completedSteps.includes(s.id))
  const nextIncompleteIndex = nextIncomplete ? ONBOARDING_STEPS.indexOf(nextIncomplete) : -1
  const isAllComplete = completedSteps.length === ONBOARDING_STEPS.length

  return {
    completedSteps,
    isCompleted,
    markStepComplete,
    toggleStep,
    resetAll,
    nextIncomplete,
    nextIncompleteIndex,
    isAllComplete,
    progressPercent: Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100),
  }
}
