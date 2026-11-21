import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateBusinessSchema, type UpdateBusinessInput } from '@/schemas/business.schema'
import { businessApi, type BusinessEntity } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Building2, Calendar, CheckCircle2, Globe, Loader2, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export function BusinessSettingsView() {
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<BusinessEntity | null>(null)
  const [calendarPref, setCalendarPref] = useState<'ETHIOPIAN' | 'GREGORIAN'>('ETHIOPIAN')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateBusinessInput>({
    resolver: zodResolver(updateBusinessSchema),
    mode: 'onTouched',
  })

  useEffect(() => {
    let ignore = false
    businessApi
      .getBusiness()
      .then((data) => {
        if (!ignore) {
          setBusiness(data)
          const cal = (data.calendarPreference as 'ETHIOPIAN' | 'GREGORIAN') ?? 'ETHIOPIAN'
          setCalendarPref(cal)
          reset({
            name: data.name,
            legalName: data.legalName ?? '',
            taxId: data.taxId ?? '',
            phone: data.phone ?? '',
            email: data.email ?? '',
            address: data.address ?? '',
            currency: data.currency ?? 'ETB',
            calendarPreference: cal,
          })
        }
      })
      .catch((err) => {
        console.error('Failed to load business settings:', err)
        toast.error('Failed to load business details')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [reset])

  const onSubmit = async (data: UpdateBusinessInput) => {
    try {
      const updated = await businessApi.updateBusiness({
        ...data,
        calendarPreference: calendarPref,
      })
      setBusiness(updated)
      reset({
        name: updated.name,
        legalName: updated.legalName ?? '',
        taxId: updated.taxId ?? '',
        phone: updated.phone ?? '',
        email: updated.email ?? '',
        address: updated.address ?? '',
        currency: updated.currency,
        calendarPreference: updated.calendarPreference as 'ETHIOPIAN' | 'GREGORIAN',
      })
      toast.success('Business settings saved', {
        description: 'Bakery parameters and calendar preference updated.',
      })
    } catch (err) {
      console.error('Failed to update business settings:', err)
      toast.error('Failed to update settings')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center py-12 text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading bakery workspace settings…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Bakery Business Settings
        </h2>
        <p className="text-xs text-muted-foreground">
          Configure legal entity identity, tax parameters, and operational calendar systems.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* General Identity Card */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base font-medium">Bakery & Legal Identity</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Trade brand name, legal corporate registration, and tax identification.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="biz-name" className="text-xs font-medium text-foreground">
                  Trade / Display Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="biz-name"
                  {...register('name')}
                  placeholder="Bole Injera Hub"
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="biz-legal" className="text-xs font-medium text-foreground">
                  Registered Legal Name <span className="text-muted-foreground">(Optional)</span>
                </label>
                <Input
                  id="biz-legal"
                  {...register('legalName')}
                  placeholder="Almaz Tadesse General Trading PLC"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="biz-tax" className="text-xs font-medium text-foreground">
                  Tax Identification Number (TIN)
                </label>
                <Input
                  id="biz-tax"
                  {...register('taxId')}
                  placeholder="0012345678"
                />
                <p className="text-[11px] text-muted-foreground">
                  Used on printed fiscal sales receipts and wholesale commercial invoices.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar and Localization Card */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base font-medium">Fiscal & Regional Localization</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Base currency, operational timezone, and Ethiopian vs. Gregorian calendar system.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="biz-curr" className="text-xs font-medium text-foreground">
                  Base Accounting Currency
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="biz-curr"
                    disabled
                    value="ETB (Ethiopian Birr)"
                    className="bg-muted text-muted-foreground"
                  />
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Operational Timezone
                </label>
                <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-muted/40 px-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-mono text-foreground">
                    Africa/Addis_Ababa (UTC+3, EAT)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    Ethiopian Calendar System (ዓመተ ምሕረት)
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Recommended for local bakeries
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Display Meskerem - Pagume months, Ethiopian years, and 13-month business fiscal cycles.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {calendarPref === 'ETHIOPIAN' ? 'Ethiopian' : 'Gregorian'}
                </span>
                <Switch
                  checked={calendarPref === 'ETHIOPIAN'}
                  onCheckedChange={(checked) =>
                    setCalendarPref(checked ? 'ETHIOPIAN' : 'GREGORIAN')
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact and Headquarters Card */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base font-medium">Headquarters Contact</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Primary office contact for official correspondence and vendor billing.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="biz-phone" className="text-xs font-medium text-foreground">
                  Primary Phone
                </label>
                <div className="relative">
                  <Phone className="absolute top-2.5 left-3 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="biz-phone"
                    className="pl-8"
                    {...register('phone')}
                    placeholder="+251 91 123 4567"
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="biz-email" className="text-xs font-medium text-foreground">
                  Support / Finance Email
                </label>
                <div className="relative">
                  <Mail className="absolute top-2.5 left-3 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="biz-email"
                    type="email"
                    className="pl-8"
                    {...register('email')}
                    placeholder="finance@bakery.et"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="biz-address" className="text-xs font-medium text-foreground">
                  Physical Office Address
                </label>
                <Input
                  id="biz-address"
                  {...register('address')}
                  placeholder="Bole Sub-city, Woreda 03, House No. 892, Addis Ababa"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {business && (
            <p className="text-[11px] text-muted-foreground">
              Last saved: {new Date(business.updatedAt).toLocaleTimeString()}
            </p>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="gap-2 text-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving changes…</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Save Business Settings</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
