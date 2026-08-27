import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Shown in the fallback so the user knows which area failed. */
  label?: string;
  /** Custom fallback renderer; gets the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label ?? 'app', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {this.props.label ? `${this.props.label} me kuch toot gaya` : 'Kuch toot gaya'}
            </h2>
            <p className="text-sm text-muted-foreground break-words">
              {error.message || 'Unexpected error'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={this.reset} className="min-h-[44px] rounded-full px-5">
              <RefreshCw className="h-4 w-4 mr-2" /> Dobara try karein
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="min-h-[44px] rounded-full px-5"
            >
              Page reload
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
