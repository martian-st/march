"use client";

import { useEffect } from 'react';

// Temporary debug version - no redirects or complex logic
export default function Home() {
  useEffect(() => {
    // Log any uncaught errors to help debug
    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', event.error);
      console.error('Error message:', event.message);
      console.error('Error filename:', event.filename);
      console.error('Error lineno:', event.lineno);
      console.error('Error colno:', event.colno);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', textAlign: 'center' }}>
      <h1>🚀 March App is Working!</h1>
      <p>✅ Frontend deployed successfully</p>
      <p>✅ Next.js is running</p>
      <p>✅ Client-side JavaScript is working</p>
      <p>Time: {new Date().toISOString()}</p>
      <div style={{ marginTop: '20px' }}>
        <a href="/debug" style={{ color: 'blue', textDecoration: 'underline' }}>
          → Debug page
        </a>
        {' | '}
        <a href="/api/health" style={{ color: 'blue', textDecoration: 'underline' }}>
          → Health check
        </a>
        {' | '}
        <a href="/signin" style={{ color: 'blue', textDecoration: 'underline' }}>
          → Original signin
        </a>
      </div>
    </div>
  )
}