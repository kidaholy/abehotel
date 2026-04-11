import { NextResponse } from "next/server"
import { validateSession } from "@/lib/auth"

const TRINSIC_API_KEY         = process.env.TRINSIC_API_KEY || ""
const TRINSIC_PROFILE_ID      = process.env.TRINSIC_VERIFICATION_PROFILE_ID || ""
const TRINSIC_API_BASE        = "https://api.trinsic.id"

export async function POST(request: Request) {
  try {
    await validateSession(request)

    if (!TRINSIC_API_KEY || !TRINSIC_PROFILE_ID) {
      return NextResponse.json({ message: "Trinsic API not configured" }, { status: 503 })
    }

    const { redirectUrl } = await request.json()

    const res = await fetch(`${TRINSIC_API_BASE}/api/v1/sessions/direct-provider`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TRINSIC_API_KEY}`,
      },
      body: JSON.stringify({
        verificationProfileId: TRINSIC_PROFILE_ID,
        provider: "ethiopia-fayda",
        capabilities: ["LaunchBrowser", "CaptureRedirect"],
        redirectUrl: redirectUrl,
        fallbackToHostedUI: true,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ message: err.message || "Failed to create session" }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({
      sessionId: data.sessionId,
      launchUrl: data.nextStep?.content,
      resultsAccessKey: data.resultCollection?.resultsAccessKey,
    })
  } catch (error: any) {
    return NextResponse.json({ message: "Failed" }, { status: 500 })
  }
}
