"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true,
      error: error
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group("🚨 Error Boundary Caught Error");
    console.error("Error:", error);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("Error Info:", errorInfo);
    console.groupEnd();
    
    // Store error details in state for potential display
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      // You can render custom fallback UI
      if (React.isValidElement(this.props.fallback)) {
        return this.props.fallback;
      }
      
      // Default fallback with error details for debugging
      return (
        <div style={{ 
          padding: '20px', 
          fontFamily: 'monospace', 
          backgroundColor: '#fee',
          color: '#900',
          border: '1px solid #faa',
          borderRadius: '4px',
          margin: '20px'
        }}>
          <h2>🚨 Something went wrong</h2>
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Error Details (Click to expand)
            </summary>
            <pre style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#fdd',
              border: '1px solid #faa',
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
              fontSize: '12px'
            }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '10px',
              padding: '8px 16px', 
              backgroundColor: '#900', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
