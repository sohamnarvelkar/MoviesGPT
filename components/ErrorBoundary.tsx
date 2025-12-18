
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Using React.Component explicitly to ensure props type is correctly inherited
export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-background text-textMain flex items-center justify-center p-4">
          <div className="bg-surface border border-surfaceHighlight rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} className="text-primary" />
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-textMuted mb-8 text-sm leading-relaxed">
              We encountered an unexpected error. The application has been stopped to prevent further issues.
            </p>

            <button
              onClick={this.handleReload}
              className="w-full bg-surfaceHighlight hover:bg-gray-800 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-gray-700"
            >
              <RefreshCcw size={18} />
              Reload Page
            </button>
            
            {process.env.NODE_ENV === 'development' && error && (
                <div className="mt-8 p-4 bg-black/50 rounded-lg text-left overflow-auto max-h-40">
                    <code className="text-xs text-red-300 font-mono">
                        {error.toString()}
                    </code>
                </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
