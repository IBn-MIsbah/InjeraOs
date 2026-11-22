import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon, RotateCw, Home, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    console.error('ErrorBoundary caught an unhandled rendering crash:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo, showDetails } = this.state

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-destructive/30 bg-card p-6 shadow-lg shadow-black/5 space-y-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-destructive/10 p-3 text-destructive shrink-0">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Application Encountered an Error
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A client-side component crash occurred. Your local data and offline ledger are safe.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-muted/40 border border-border/60 p-3">
                <p className="text-xs font-mono font-medium text-destructive break-words">
                  {error.message || 'Unknown runtime error'}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={this.handleReload}
                className="gap-2 text-xs"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Reload Application
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-2 text-xs"
              >
                Try Again
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleGoHome}
                className="gap-2 text-xs ml-auto"
              >
                <Home className="h-3.5 w-3.5" />
                Return to Dashboard
              </Button>
            </div>

            <div className="border-t border-border/40 pt-3">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showDetails ? 'Hide technical details' : 'Show technical details'}
              </button>

              {showDetails && (
                <div className="mt-3 max-h-48 overflow-auto rounded bg-black/90 p-3 text-[10px] font-mono text-emerald-400">
                  <div className="font-semibold text-rose-400 mb-1">
                    {error?.name}: {error?.message}
                  </div>
                  {error?.stack && <pre className="whitespace-pre-wrap opacity-80">{error.stack}</pre>}
                  {errorInfo?.componentStack && (
                    <pre className="mt-2 text-sky-300 opacity-80 whitespace-pre-wrap">
                      Component Stack:
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
