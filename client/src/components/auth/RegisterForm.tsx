import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/schemas/auth.schema'
import { authApi } from '@/lib/api'
import type { AuthContextResponse } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertCircle,
  ArrowRight,
  Building,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

interface RegisterFormProps {
  onSuccess: (data: AuthContextResponse) => void
  onSwitchToLogin: () => void
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      businessName: '',
    },
    mode: 'onTouched',
  })

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null)
    try {
      const authData = await authApi.register({
        ...data,
        phone: data.phone?.trim() ? data.phone.trim() : undefined,
        businessName: data.businessName?.trim() ? data.businessName.trim() : undefined,
      })
      toast.success('Account created successfully', {
        description: `Welcome to InjeraOS, ${authData.user.name}.`,
      })
      onSuccess(authData)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message =
        err.response?.data?.message ??
        err.response?.data?.error ??
        'Failed to register account. Check input fields.'
      setServerError(message)
      toast.error('Registration failed', {
        description: message,
      })
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-border/80 shadow-xs">
        <CardHeader className="space-y-1.5 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Injera Commerce
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Automatic Owner setup
            </span>
          </div>
          <CardTitle className="text-xl font-medium tracking-tight">
            Create an account
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Register your identity and bootstrap your production workspace.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Field Group 1: Account Credentials */}
            <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Account Credentials
              </span>

              <div className="space-y-1">
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-medium text-foreground"
                >
                  Full name <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    {...register('name')}
                    placeholder="Almaz Tadesse"
                    aria-invalid={errors.name ? 'true' : 'false'}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    className={`w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:ring-1 focus:outline-hidden ${
                      errors.name
                        ? 'border-destructive focus:border-destructive focus:ring-destructive'
                        : 'border-input focus:border-foreground focus:ring-foreground'
                    }`}
                  />
                </div>
                {errors.name && (
                  <p id="name-error" className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-medium text-foreground"
                >
                  Work email <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    placeholder="almaz@bakery.et"
                    aria-invalid={errors.email ? 'true' : 'false'}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className={`w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:ring-1 focus:outline-hidden ${
                      errors.email
                        ? 'border-destructive focus:border-destructive focus:ring-destructive'
                        : 'border-input focus:border-foreground focus:ring-foreground'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-medium text-foreground"
                >
                  Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    {...register('password')}
                    placeholder="At least 8 characters"
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className={`w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:ring-1 focus:outline-hidden ${
                      errors.password
                        ? 'border-destructive focus:border-destructive focus:ring-destructive'
                        : 'border-input focus:border-foreground focus:ring-foreground'
                    }`}
                  />
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            {/* Field Group 2: Bakery Setup */}
            <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Bakery Workspace Setup
              </span>

              <div className="space-y-1">
                <label
                  htmlFor="reg-business"
                  className="block text-xs font-medium text-foreground"
                >
                  Bakery name <span className="text-muted-foreground">(optional)</span>
                </label>
                <div className="relative">
                  <Building className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="reg-business"
                    type="text"
                    {...register('businessName')}
                    placeholder="Bole Injera Hub"
                    aria-invalid={errors.businessName ? 'true' : 'false'}
                    aria-describedby={errors.businessName ? 'business-error' : undefined}
                    className={`w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:ring-1 focus:outline-hidden ${
                      errors.businessName
                        ? 'border-destructive focus:border-destructive focus:ring-destructive'
                        : 'border-input focus:border-foreground focus:ring-foreground'
                    }`}
                  />
                </div>
                {errors.businessName && (
                  <p id="business-error" className="text-xs text-destructive">
                    {errors.businessName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-medium text-foreground"
                >
                  Phone <span className="text-muted-foreground">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="reg-phone"
                    type="tel"
                    autoComplete="tel"
                    {...register('phone')}
                    placeholder="+251 91 123 4567"
                    aria-invalid={errors.phone ? 'true' : 'false'}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                    className={`w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:ring-1 focus:outline-hidden ${
                      errors.phone
                        ? 'border-destructive focus:border-destructive focus:ring-destructive'
                        : 'border-input focus:border-foreground focus:ring-foreground'
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p id="phone-error" className="text-xs text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating business workspace…</span>
                </>
              ) : (
                <>
                  <span>Create account and start</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 border-t border-border/60 pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
              >
                Sign in instead
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
