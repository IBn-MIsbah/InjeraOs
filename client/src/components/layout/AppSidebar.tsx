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
import {
  Boxes,
  Building2,
  ChefHat,
  Flame,
  GitBranch,
  LayoutDashboard,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'

export type TabType =
  | 'workspace'
  | 'branches'
  | 'workforce'
  | 'materials'
  | 'recipes'
  | 'production'
  | 'team'
  | 'settings'
  | 'unslop'

interface AppSidebarProps {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  auth: AuthContextResponse | null
  authView: 'login' | 'register'
  onSelectAuthView: (view: 'login' | 'register') => void
  onLogout: () => void
}

export function AppSidebar({
  activeTab,
  onSelectTab,
  auth,
  authView,
  onSelectAuthView,
  onLogout,
}: AppSidebarProps) {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* Sidebar Header: Brand & Business Name */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Store className="h-4 w-4" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-semibold tracking-tight text-sidebar-foreground">
              {auth?.business?.name ?? 'InjeraOS'}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              Bakery Commerce Platform
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Sidebar Content: Grouped Navigation */}
      <SidebarContent className="px-2 py-2">
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
            Utilities
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === 'unslop'}
                  onClick={() => onSelectTab('unslop')}
                  tooltip="AI Writing De-Slopper"
                  className="cursor-pointer gap-2.5 text-xs"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Unslop Editor</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer: User Details & Logout */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {auth ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-md bg-sidebar-accent/50 p-2 group-data-[collapsible=icon]:hidden">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-medium text-sidebar-foreground">
                  {auth.user.name}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {auth.user.email}
                </span>
              </div>
              <span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[9px] font-semibold text-sidebar-foreground uppercase">
                {auth.role ?? 'MEMBER'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1 group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span>Encrypted Cookie</span>
              </div>

              <SidebarMenuButton
                onClick={onLogout}
                tooltip="Sign out"
                className="cursor-pointer gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:w-8"
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
              </SidebarMenuButton>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground p-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span className="group-data-[collapsible=icon]:hidden">HttpOnly Security Active</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
