import { NextResponse } from "next/server"
import axios from "axios"
import { getSession } from "@/actions/session"
import { BACKEND_URL, FRONTEND_URL } from "@/lib/constants"

export const dynamic = 'force-dynamic'
const redirectDomain = FRONTEND_URL

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({ error: "No code received" }, { status: 400 })
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await axios.get(`${BACKEND_URL}/linear/getAccessToken?code=${code}`, {
      headers: {
        'Authorization': `Bearer ${session}`,
      }
    })

    const state = searchParams.get('state')
    const redirectUrl = state ? JSON.parse(decodeURIComponent(state)).redirect : '/inbox'

    return NextResponse.redirect(new URL(redirectUrl, redirectDomain))

  } catch (error) {
    console.error("Linear OAuth error:", error)
    return NextResponse.redirect(new URL(`/?error=linear_auth_failed`, redirectDomain))
  }
}