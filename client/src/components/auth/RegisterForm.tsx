import React, { useState } from 'react'
import { authApi, type AuthContextResponse } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowRight, Building, Loader2, Lock, Mail, Phone, User } from 'lucide-react'
import { toast } from 'sonner'

interface RegisterFormProps {
  onSuccess: (data: AuthContextResponse) => void
  onSwitchToLogin: () => void
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const data = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() ? phone.trim() : undefined,
        businessName: businessName.trim() ? businessName.trim() : undefined,
      })
      toast.success('Account created successfully', {
        description: `Welcome to InjeraOS, ${data.user.name}.`,
      })
      onSuccess(data)
    } catch (err: any) {
      const message =
        err.response?.data?.message ??
        err.response?.data?.error ??
        'Failed to register account. Check input fields.'
      setErrorMessage(message)
      toast.error('Registration failed', {
        description: message,
      })
    } finally {
      setIsLoading(false)
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
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="reg-name"
                className="block text-xs font-medium text-foreground"
              >
                Full name
              </label>
              <div className="relative">
                <User className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Almaz Tadesse"
                  className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-foreground focus:ring-1 focus:ring-foreground focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="reg-email"
                className="block text-xs font-medium text-foreground"
              >
                Work email
              </label>
              <div className="relative">
                <Mail className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="almaz@bakery.et"
                  className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-foreground focus:ring-1 focus:ring-foreground focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="reg-password"
                className="block text-xs font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-foreground focus:ring-1 focus:ring-foreground focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 91 123 4567"
                    className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-foreground focus:ring-1 focus:ring-foreground focus:outline-hidden"
                  />
                </div>
              </div>

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
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Bole Injera Hub"
                    className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-foreground focus:ring-1 focus:ring-foreground focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
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
