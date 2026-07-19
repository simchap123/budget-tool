import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

// Catches render/runtime errors anywhere below it so a single bad component
// shows a friendly recovery screen instead of a blank white page.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error boundary caught:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
          <div className="card p-8 max-w-md text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-display-sm mb-3">Something went wrong</h1>
            <p className="text-ink-400 mb-6">
              The app hit an unexpected error. Reloading usually fixes it — your data is safe.
            </p>
            <button onClick={this.handleReload} className="btn-primary px-6 py-2">
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
