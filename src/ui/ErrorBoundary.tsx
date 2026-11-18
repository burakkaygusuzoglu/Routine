import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'

export interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

/** Last line of defence: a screen that crashes shows this instead of a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  private retry = () => {
    location.reload()
  }

  private toSettings = () => {
    location.hash = '#/settings'
    location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex h-full items-center justify-center bg-bg p-6">
        <div role="alert" className="flex w-full max-w-md flex-col gap-4 rounded-card bg-surface p-6 text-text">
          <h1 className="m-0 text-title font-semibold">Bir şeyler ters gitti</h1>
          <p className="m-0 text-body text-muted">
            Uygulama beklenmedik bir şekilde durdu. Verilerin cihazında duruyor. Yeniden denemek çoğu zaman yeterli olur.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={this.retry}>Yeniden dene</Button>
            <Button variant="ghost" onClick={this.toSettings}>
              Ayarlar'a git
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
