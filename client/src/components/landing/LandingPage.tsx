import { useState } from 'react'
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Coins,
  Cpu,
  Flame,
  HardDrive,
  Layers,
  Lock,
  LogIn,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserPlus,
  Warehouse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface LandingPageProps {
  onEnterWorkspace: () => void
  onOpenLogin: () => void
  onOpenRegister: () => void
  isAuthenticated: boolean
}

export function LandingPage({
  onEnterWorkspace,
  onOpenLogin,
  onOpenRegister,
  isAuthenticated,
}: LandingPageProps) {
  // Interactive Calculator State
  const [teffBatchKg, setTeffBatchKg] = useState<number>(100)
  const [teffPricePerKg, setTeffPricePerKg] = useState<number>(145)
  const [overheadAndLabour, setOverheadAndLabour] = useState<number>(2800)
  const [expectedInjeraYield, setExpectedInjeraYield] = useState<number>(380)

  // Calculations
  const rawMaterialCost = teffBatchKg * teffPricePerKg
  const totalBatchCost = rawMaterialCost + overheadAndLabour
  const costPerInjera = expectedInjeraYield > 0 ? totalBatchCost / expectedInjeraYield : 0
  const suggestedSellingPrice = Number((costPerInjera * 1.35).toFixed(2))
  const projectedGrossMargin =
    suggestedSellingPrice > 0
      ? (((suggestedSellingPrice - costPerInjera) / suggestedSellingPrice) * 100).toFixed(1)
      : '0'

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased selection:bg-forest selection:text-oat">
      {/* Floating Island Navigation Bar */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl">
        <nav className="flex items-center justify-between rounded-full border border-forest/20 bg-background/85 px-4 sm:px-6 py-2.5 shadow-xl backdrop-blur-xl transition-all">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-oat shadow-xs">
              <Store className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-forest dark:text-oat">
                KD PLC
              </span>
              <span className="hidden sm:inline-block rounded-full bg-forest/10 px-2 py-0.5 text-[9px] font-bold text-forest dark:bg-oat/15 dark:text-oat uppercase tracking-wider">
                InjeraOS
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-foreground/80">
            <a href="#pillars" className="hover:text-forest transition-colors">
              Pillars
            </a>
            <a href="#calculator" className="hover:text-forest transition-colors">
              Cost Engine
            </a>
            <a href="#security" className="hover:text-forest transition-colors">
              Security
            </a>
          </div>

          {/* Floating Island CTA */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button
                onClick={onEnterWorkspace}
                className="bg-forest text-oat hover:bg-forest-light rounded-full text-xs font-semibold gap-1.5 px-4 h-8 shadow-sm cursor-pointer"
              >
                <span>Launch Workspace</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenLogin}
                  className="rounded-full text-xs font-semibold text-forest dark:text-oat hover:bg-forest/10 h-8 px-3 gap-1 cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Button>
                <Button
                  size="sm"
                  onClick={onOpenRegister}
                  className="bg-forest text-oat hover:bg-forest-light rounded-full text-xs font-semibold h-8 px-3.5 gap-1 shadow-sm cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Get Started</span>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-24 border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(29,74,53,0.15),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/25 bg-forest/5 px-4 py-1 text-xs font-semibold text-forest dark:border-oat/20 dark:bg-oat/10 dark:text-oat">
              <Award className="h-3.5 w-3.5" />
              <span>Commercial Injera Production & Distribution System</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-balance text-forest dark:text-oat">
              Industrial Precision for Traditional Ethiopian Injera
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">
              Engineered exclusively for <strong className="text-foreground font-semibold">KD PLC</strong>.
              From grain shipment intake and teff blending, to automated mitad baking sessions,
              FIFO freshness dispatching, customer credit ledgers, and zero-downtime offline synchronization.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  onClick={onEnterWorkspace}
                  className="bg-forest text-oat hover:bg-forest-light rounded-xl gap-2 px-6 font-semibold shadow-md cursor-pointer"
                >
                  <span>Go to Management Dashboard</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={onOpenRegister}
                    className="bg-forest text-oat hover:bg-forest-light rounded-xl gap-2 px-6 font-semibold shadow-md cursor-pointer"
                  >
                    <span>Register Business</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={onOpenLogin}
                    className="rounded-xl border-border hover:bg-muted text-xs font-semibold px-5 cursor-pointer"
                  >
                    Sign in to Workspace
                  </Button>
                </>
              )}
            </div>

            {/* Quick Metrics Ticker (12-Grid System) */}
            <div className="pt-8 grid grid-cols-12 gap-3 max-w-4xl mx-auto text-left">
              <div className="col-span-6 sm:col-span-3 rounded-xl border border-border bg-card/70 p-3.5 backdrop-blur-sm shadow-xs">
                <div className="text-xs font-medium text-muted-foreground">Production Costing</div>
                <div className="text-lg font-bold font-mono tabular-nums text-forest dark:text-oat">100% Traceable</div>
                <div className="text-[11px] text-muted-foreground">Every accepted injera accounted</div>
              </div>

              <div className="col-span-6 sm:col-span-3 rounded-xl border border-border bg-card/70 p-3.5 backdrop-blur-sm shadow-xs">
                <div className="text-xs font-medium text-muted-foreground">Mitad Efficiency</div>
                <div className="text-lg font-bold font-mono tabular-nums text-forest dark:text-oat">94.8% Average Yield</div>
                <div className="text-[11px] text-muted-foreground">Burnt/torn rejection logging</div>
              </div>

              <div className="col-span-6 sm:col-span-3 rounded-xl border border-border bg-card/70 p-3.5 backdrop-blur-sm shadow-xs">
                <div className="text-xs font-medium text-muted-foreground">Stock Integrity</div>
                <div className="text-lg font-bold font-mono tabular-nums text-forest dark:text-oat">Strict FIFO Rotation</div>
                <div className="text-[11px] text-muted-foreground">Freshness countdown & alerts</div>
              </div>

              <div className="col-span-6 sm:col-span-3 rounded-xl border border-border bg-card/70 p-3.5 backdrop-blur-sm shadow-xs">
                <div className="text-xs font-medium text-muted-foreground">Offline Reliability</div>
                <div className="text-lg font-bold font-mono tabular-nums text-forest dark:text-oat">Zero Data Loss</div>
                <div className="text-[11px] text-muted-foreground">IndexedDB queued operations</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operational Pillars Section */}
      <section id="pillars" className="py-16 sm:py-20 bg-muted/30 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-forest dark:text-oat">
              Built for Scale & Tradition
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Six Pillars of the Injera Commerce Engine
            </h3>
            <p className="text-xs text-muted-foreground">
              Purpose-built workflows replacing paper logs and generic spreadsheets with tailored bakery intelligence.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Pillar 1 */}
            <Card className="col-span-12 sm:col-span-6 lg:col-span-4 border-border hover:border-forest/40 transition-all hover:shadow-md bg-card">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-forest/10 flex items-center justify-center text-forest dark:bg-oat/15 dark:text-oat mb-2">
                  <Flame className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">
                  Mitad Baking & Shift Roster
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Manage electric and clay mitad stations across morning, afternoon, and overnight shifts.
                  Track individual baker output, hourly speed, and individual piece-rate compensation.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-forest dark:text-oat font-semibold text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Supports overnight midnight rollover</span>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 2 */}
            <Card className="col-span-12 sm:col-span-6 lg:col-span-4 border-border hover:border-forest/40 transition-all hover:shadow-md bg-card">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-forest/10 flex items-center justify-center text-forest dark:bg-oat/15 dark:text-oat mb-2">
                  <Layers className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">
                  Teff Blending & Usable Weights
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Formulate custom ratios of Magna, Sergegna, and Tikur teff. Account for gross tare,
                  unusable impurities, and milling losses to guarantee exact flour cost attribution.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-forest dark:text-oat font-semibold text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Traceable blend lot genealogical ancestry</span>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 3 */}
            <Card className="col-span-12 sm:col-span-6 lg:col-span-4 border-border hover:border-forest/40 transition-all hover:shadow-md bg-card">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-forest/10 flex items-center justify-center text-forest dark:bg-oat/15 dark:text-oat mb-2">
                  <Warehouse className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">
                  FIFO Freshness Stock Rotation
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Injera must move fresh. Our FIFO lot algorithm strictly prevents stock staleness,
                  allocating oldest sellable production first with live shelf-life degradation monitors.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-forest dark:text-oat font-semibold text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Defect units never enter sellable inventory</span>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 4 */}
            <Card className="col-span-12 sm:col-span-6 lg:col-span-4 border-border hover:border-forest/40 transition-all hover:shadow-md bg-card">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-forest/10 flex items-center justify-center text-forest dark:bg-oat/15 dark:text-oat mb-2">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">
                  POS & Customer Credit Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Walk-in cash sales, Telebirr mobile transfers, and recurring credit lines for restaurants and hotels.
                  Append-only immutable customer debt statements with clear aging intervals.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-forest dark:text-oat font-semibold text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Cash flow separated cleanly from accrual revenue</span>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 5 */}
            <Card className="col-span-12 sm:col-span-6 lg:col-span-4 border-border hover:border-forest/40 transition-all hover:shadow-md bg-card">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-forest/10 flex items-center justify-center text-forest dark:bg-oat/15 dark:text-oat mb-2">
                  <Coins className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">
                  Defensible Batch Costing
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Absorb flour, yeast, firewood, water, and baking labour directly into accepted sellable units.
                  Snapshots lock historical production costs against subsequent grain price swings.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-forest dark:text-oat font-semibold text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Rejection cost absorbed by accepted output</span>
                </div>
              </CardContent>
            </Card>

            {/* Pillar 6 */}
            <Card className="col-span-12 sm:col-span-6 lg:col-span-4 border-border hover:border-forest/40 transition-all hover:shadow-md bg-card">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-forest/10 flex items-center justify-center text-forest dark:bg-oat/15 dark:text-oat mb-2">
                  <Cpu className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">
                  Offline-First PWA Synchronization
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Bakeries face intermittent internet. Cashiers, flour clerks, and delivery drivers work uninterrupted
                  with client IndexedDB storage, auto-syncing upon reconnection with stock conflict safeguards.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-forest dark:text-oat font-semibold text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Zero negative authoritative stock anomaly guarantee</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Interactive Teff-to-Injera Cost Calculator Section */}
      <section id="calculator" className="py-16 sm:py-20 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-3 py-0.5 text-xs font-semibold text-forest dark:bg-oat/15 dark:text-oat">
                <Coins className="h-3.5 w-3.5" />
                <span>Live Interactive Simulator</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Simulate Your Real Cost Per Injera
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Traditional bakeries lose profit by guessing flour costs and failing to account for baking overhead.
                Use our formula engine to see how grain purity and baker yield impact your bottom line.
              </p>

              <div className="pt-2 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Real-time absorption of fuel, water, and mitad maintenance</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Instant gross margin forecast for restaurant contracts</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <Card className="border-forest/20 shadow-lg bg-card">
                <CardHeader className="bg-forest text-oat rounded-t-lg pb-4">
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>KD PLC Batch Costing Simulator</span>
                    <span className="text-xs font-mono font-normal opacity-90">ETB Currency</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-semibold block mb-1 text-foreground">
                        Teff Grain Lot Size (kg)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={teffBatchKg}
                        onChange={(e) => setTeffBatchKg(Math.max(1, Number(e.target.value)))}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-foreground">
                        Teff Purchase Price / kg (ETB)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={teffPricePerKg}
                        onChange={(e) => setTeffPricePerKg(Math.max(1, Number(e.target.value)))}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-foreground">
                        Shared Labour & Overhead (ETB)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={overheadAndLabour}
                        onChange={(e) => setOverheadAndLabour(Math.max(0, Number(e.target.value)))}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-foreground">
                        Expected Accepted Yield (Injera)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={expectedInjeraYield}
                        onChange={(e) => setExpectedInjeraYield(Math.max(1, Number(e.target.value)))}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Simulator Outputs (12-Grid System) */}
                  <div className="rounded-xl border border-border bg-muted/40 p-4 grid grid-cols-12 gap-3 text-center">
                    <div className="col-span-6 sm:col-span-3">
                      <div className="text-[11px] text-muted-foreground">Total Batch Cost</div>
                      <div className="text-base font-bold font-mono tabular-nums text-foreground mt-0.5">
                        {totalBatchCost.toLocaleString()} ETB
                      </div>
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <div className="text-[11px] text-muted-foreground">Cost per Injera</div>
                      <div className="text-base font-bold font-mono tabular-nums text-forest dark:text-oat mt-0.5">
                        {costPerInjera.toFixed(2)} ETB
                      </div>
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <div className="text-[11px] text-muted-foreground">Suggested Price</div>
                      <div className="text-base font-bold font-mono tabular-nums text-foreground mt-0.5">
                        {suggestedSellingPrice.toFixed(2)} ETB
                      </div>
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <div className="text-[11px] text-muted-foreground">Projected Margin</div>
                      <div className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                        +{projectedGrossMargin}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Security & Offline Tech Section */}
      <section id="security" className="py-16 sm:py-20 bg-forest text-oat">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-oat/70">
              Enterprise Grade Protection
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-oat">
              Security, Auditability & Offline Reliability
            </h3>
            <p className="text-xs text-oat/80">
              Engineered with strict banking-grade multi-tenant boundaries and resilient edge storage.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4 rounded-xl bg-forest-dark/80 p-6 border border-oat/15 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-oat/15 flex items-center justify-center text-oat mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-oat">Cryptographic HttpOnly Auth</h4>
              <p className="text-xs text-oat/70 leading-relaxed">
                Zero plaintext access tokens stored in JavaScript memory. Session refresh tokens use rotating,
                encrypted, httpOnly secure cookies impervious to cross-site scripting (XSS).
              </p>
            </div>

            <div className="col-span-12 md:col-span-4 rounded-xl bg-forest-dark/80 p-6 border border-oat/15 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-oat/15 flex items-center justify-center text-oat mb-2">
                <Lock className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-oat">Multi-Tenant Wall</h4>
              <p className="text-xs text-oat/70 leading-relaxed">
                Absolute tenant isolation enforced at the database query level across all 14 business modules.
                Competitor bakeries cannot probe, list, or tamper with your recipes or customer debts.
              </p>
            </div>

            <div className="col-span-12 md:col-span-4 rounded-xl bg-forest-dark/80 p-6 border border-oat/15 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-oat/15 flex items-center justify-center text-oat mb-2">
                <HardDrive className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-oat">Idempotent Offline Queue</h4>
              <p className="text-xs text-oat/70 leading-relaxed">
                Client transactions queue safely in IndexedDB and survive battery death or browser reloads.
                Central server deduplication prevents double-billing and detects concurrent stock deficits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-forest text-oat flex items-center justify-center">
              <Store className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-forest dark:text-oat">KD PLC</span>
            <span className="text-xs text-muted-foreground">
              &bull; Injera Commerce Platform &bull; Addis Ababa, Ethiopia
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Enterprise PWA v1.0</span>
            <span>&bull;</span>
            <button
              onClick={onEnterWorkspace}
              className="text-forest dark:text-oat font-semibold hover:underline cursor-pointer"
            >
              Open Platform
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
