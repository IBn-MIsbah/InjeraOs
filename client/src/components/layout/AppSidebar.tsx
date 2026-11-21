import { useEffect, useState } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import type { AuthContextResponse } from '@/lib/api'
import { syncEngine } from '@/lib/sync-engine'
import {
  Boxes,
  Building2,
  ChefHat,
  Coins,
  Flame,
  GitBranch,
  Globe2,
  LayoutDashboard,
  LogIn,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Warehouse,
} from 'lucide-react'

export type TabType =
  | 'workspace'
  | 'landing'
  | 'branches'
  | 'workforce'
  | 'materials'
  | 'recipes'
  | 'production'
  | 'costing'
  | 'inventory'
  | 'sales'
  | 'expenses'
  | 'reports'
  | 'sync'
  | 'team'
  | 'roles'
  | 'profile'
  | 'settings'

interface AppSidebarProps {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  auth: AuthContextResponse | null
  authView: 'landing' | 'login' | 'register'
  onSelectAuthView: (view: 'landing' | 'login' | 'register') => void
}

export function AppSidebar({
  activeTab,
  onSelectTab,
  auth,
  authView,
  onSelectAuthView,
}: AppSidebarProps) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const updatePending = () => {
      void syncEngine.getPendingCount().then(setPendingCount)
    }
    updatePending()

    const handleOnline = () => {
      setIsOnline(true)
      updatePending()
    }
    const handleOffline = () => {
      setIsOnline(false)
      updatePending()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('injera-queue-changed', updatePending)
    window.addEventListener('injera-sync-completed', updatePending)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('injera-queue-changed', updatePending)
      window.removeEventListener('injera-sync-completed', updatePending)
    }
  }, [])
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* Sidebar Header: Brand & Business Name */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-oat shadow-xs">
            <Store className="h-4 w-4" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-bold tracking-tight text-sidebar-foreground">
                KD PLC
              </span>
              <span className="rounded bg-sidebar-primary/20 px-1 py-0.2 text-[9px] font-semibold text-sidebar-primary">
                InjeraOS
              </span>
            </div>
            <span className="truncate text-[10px] text-muted-foreground">
              {auth?.business?.name ?? 'Commercial Bakery Hub'}
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Sidebar Content: Grouped Navigation */}
      <SidebarContent className="px-2 py-1.5 overflow-y-auto">
        {auth ? (
          <>
            {/* Group 1: Operations */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Operations
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'workspace'}
                      onClick={() => onSelectTab('workspace')}
                      tooltip="Overview & Security"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Overview</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'branches'}
                      onClick={() => onSelectTab('branches')}
                      tooltip="Branches & Baking Stations"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <GitBranch className="h-4 w-4" />
                      <span>Baking Stations</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'workforce'}
                      onClick={() => onSelectTab('workforce')}
                      tooltip="Workforce, Shifts & Attendance"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Workforce & Shifts</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'materials'}
                      onClick={() => onSelectTab('materials')}
                      tooltip="Raw Materials, Purchasing & Lots"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <Boxes className="h-4 w-4" />
                      <span>Materials & Inventory</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'recipes'}
                      onClick={() => onSelectTab('recipes')}
                      tooltip="Recipes, Scaling & Teff Blending"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <ChefHat className="h-4 w-4" />
                      <span>Recipes & Formulations</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'production'}
                      onClick={() => onSelectTab('production')}
                      tooltip="Production Sessions & Baking Batches"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <Flame className="h-4 w-4 text-amber-500" />
                      <span>Production & Baking</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'costing'}
                      onClick={() => onSelectTab('costing')}
                      tooltip="Batch Costing, Labour & Overhead Absorption"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <Coins className="h-4 w-4 text-emerald-500" />
                      <span>Production Costing</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'inventory'}
                      onClick={() => onSelectTab('inventory')}
                      tooltip="Finished Goods, FIFO Lots & Stock Locations"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <Warehouse className="h-4 w-4 text-cyan-500" />
                      <span>Finished Stock & FIFO</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'sales'}
                      onClick={() => onSelectTab('sales')}
                      tooltip="Point of Sale, Customer Credit & Deliveries"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <ShoppingCart className="h-4 w-4 text-violet-500" />
                      <span>Sales & Distribution</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'expenses'}
                      onClick={() => onSelectTab('expenses')}
                      tooltip="Operating Expenses & OPEX Ledger"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <Receipt className="h-4 w-4 text-rose-500" />
                      <span>Operating Expenses</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'reports'}
                      onClick={() => onSelectTab('reports')}
                      tooltip="Financial Reports, P&L & Baker Productivity"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span>Financial Reports & P&L</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'sync'}
                      onClick={() => onSelectTab('sync')}
                      tooltip="Offline Queue & Sync Engine"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <RefreshCw className="h-4 w-4 text-sky-500" />
                      <span className="flex-1">Offline Queue & Sync</span>
                      {pendingCount > 0 && (
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                          {pendingCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-1" />

            {/* Group 2: Organization & Administration */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Organization
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'team'}
                      onClick={() => onSelectTab('team')}
                      tooltip="Staff Roster & Permissions"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <Users className="h-4 w-4" />
                      <span>Team & Staff</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'roles'}
                      onClick={() => onSelectTab('roles')}
                      tooltip="Roles & Permissions Governance"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>Roles & Permissions</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === 'settings'}
                      onClick={() => onSelectTab('settings')}
                      tooltip="Business Profile & Calendar"
                      className="cursor-pointer gap-2.5 text-xs"
                    >
                      <Building2 className="h-4 w-4" />
                      <span>Business Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          /* Unauthenticated Navigation Group */
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Authentication
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === 'workspace' && authView === 'login'}
                    onClick={() => {
                      onSelectTab('workspace')
                      onSelectAuthView('login')
                    }}
                    tooltip="Sign in"
                    className="cursor-pointer gap-2.5 text-xs"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === 'workspace' && authView === 'register'}
                    onClick={() => {
                      onSelectTab('workspace')
                      onSelectAuthView('register')
                    }}
                    tooltip="Create account"
                    className="cursor-pointer gap-2.5 text-xs"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Create Account</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator className="my-1" />

        {/* Group 3: Tools & Utilities */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === 'landing'}
                  onClick={() => onSelectTab('landing')}
                  tooltip="KD PLC Company & Platform Overview"
                  className="cursor-pointer gap-2.5 text-xs"
                >
                  <Globe2 className="h-4 w-4 text-emerald-400" />
                  <span>KD PLC Landing Page</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer: Compact Status Indicator */}
      <SidebarFooter className="border-t border-sidebar-border px-3 py-2.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground group-data-[collapsible=icon]:justify-center">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span className="group-data-[collapsible=icon]:hidden font-medium">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              <span className="group-data-[collapsible=icon]:hidden font-medium">Offline ({pendingCount})</span>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden font-mono">
            KD InjeraOS
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
