export default function DebugPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🔧 Debug Page</h1>
      <p>✅ Next.js is working!</p>
      <p>✅ Route rendering works!</p>
      <p>✅ Environment: {process.env.NODE_ENV}</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  )
} 