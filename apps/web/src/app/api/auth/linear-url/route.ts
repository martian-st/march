import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const scope = "read write"
    const LINEAR_CLIENT_ID = process.env.LINEAR_CLIENT_ID
    const LINEAR_REDIRECT_URL = process.env.LINEAR_REDIRECT_URL
    const LINEAR_SCOPE = encodeURIComponent(scope)

    if (!LINEAR_CLIENT_ID || !LINEAR_REDIRECT_URL) {
      console.log("Missing env variables")
      return NextResponse.json(
        {
          error: "linear client_id or redirect_url is not set",
        },
        {
          status: 500,
        }
      )
    }

    // Get the redirect path from the request or default to /inbox
    const { searchParams } = new URL(request.url)
    const redirectTo = searchParams.get('redirectTo') || '/inbox'
    
    // Create state parameter with redirect information
    const state = encodeURIComponent(JSON.stringify({ redirect: redirectTo }))
    
    const authUrl = `https://linear.app/oauth/authorize?client_id=${LINEAR_CLIENT_ID}&redirect_uri=${LINEAR_REDIRECT_URL}&response_type=code&scope=${LINEAR_SCOPE}&state=${state}`
    
    console.log("Generated auth URL:", authUrl)
    return NextResponse.json({ authUrl }, { status: 200 })
  } catch (error) {
    console.error("Error generating Linear auth URL:", error)
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    )
  }
}