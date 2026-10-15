import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SOLVO] Uncaught runtime exception caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#f8fafc',
          fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          <div style={{
            maxWidth: 500,
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: '36px 28px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '1.5rem',
              fontWeight: 800
            }}>
              S
            </div>

            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.5px' }}>
              SOL<span style={{ color: '#2563eb' }}>VO</span>
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 24 }}>
              An unexpected display glitch occurred while rendering. Click below to refresh your session.
            </p>

            {this.state.error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                borderRadius: 12,
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                textAlign: 'left',
                marginBottom: 24,
                overflowX: 'auto',
                maxHeight: 120
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              style={{
                width: '100%',
                padding: '14px 20px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
              }}
            >
              <RefreshCw size={18} />
              <span>Reset Session & Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}