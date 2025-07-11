// Temporary debug version - no redirects or complex logic
export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', textAlign: 'center' }}>
      <h1>🚀 March App is Working!</h1>
      <p>✅ Frontend deployed successfully</p>
      <p>✅ Next.js is running</p>
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