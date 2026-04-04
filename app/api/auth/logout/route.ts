import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import User from "@/lib/models/user"
import { validateSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    await connectDB()
    await User.findByIdAndUpdate(decoded.id, { lastLogoutAt: new Date() })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // silent — logout always succeeds
  }
}
