"use client";

import React from "react";

export function InteractiveErrorFallback() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial', 
      textAlign: 'center',
      backgroundColor: '#fee',
      color: '#900',
      border: '1px solid #faa'
    }}>
      <h1>🚨 Application Error</h1>
      <p>An error occurred while loading the application.</p>
      <p>Check the browser console for detailed error information.</p>
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.reload()}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#900', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Refresh Page
        </button>
        <a 
          href="/emergency" 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#090', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Emergency Page
        </a>
      </div>
    </div>
  );
} 