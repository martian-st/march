export default function EmergencyPage() {
  return (
    <html>
      <head>
        <title>Emergency Debug</title>
      </head>
      <body style={{ fontFamily: 'Arial', padding: '20px' }}>
        <h1>🚨 Emergency Debug Page</h1>
        <p>✅ Basic HTML rendering works</p>
        <p>✅ No React providers</p>
        <p>✅ No client-side JavaScript</p>
        <p>Time: {new Date().toISOString()}</p>
        <br />
        <a href="/">← Back to home</a>
        <br />
        <a href="/debug">→ Debug page</a>
      </body>
    </html>
  )
} 