import { NextResponse } from "next/server"
import { validateSession } from "@/lib/auth"

const TRINSIC_API_KEY  = process.env.TRINSIC_API_KEY || ""
const TRINSIC_API_BASE = "https://api.trinsic.id"

export async function POST(request: Request) {
  try {
    await validateSession(request)

    const { resultsAccessKey } = await request.json()
    if (!resultsAccessKey) {
      return NextResponse.json({ message: "resultsAccessKey required" }, { status: 400 })
    }

    const res = await fetch(`${TRINSIC_API_BASE}/api/v1/sessions/results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TRINSIC_API_KEY}`,
      },
      body: JSON.stringify({ resultsAccessKey }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ message: err.message || "Failed to get results" }, { status: res.status })
    }

    const data = await res.json()

    if (!data.done) {
      return NextResponse.json({ done: false })
    }

    if (!data.success) {
      return NextResponse.json({ done: true, success: false, message: "Verification failed or was cancelled" })
    }

    // Normalize Trinsic's response to our format
    const person = data.person || {}
    return NextResponse.json({
      done: true,
      success: true,
      identity: {
        fullName:    person.fullName    || "",
        dob:         person.dateOfBirth || "",
        gender:      person.sex         || "",
        phone:       person.phoneNumber || "",
        nationality: person.nationality || "Ethiopian",
        photo:       person.photo       || "",
      }
    })
  } catch (error: any) {
    return NextResponse.json({ message: "Failed" }, { status: 500 })
  }
}
