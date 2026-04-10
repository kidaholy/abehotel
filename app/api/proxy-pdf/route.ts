import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) return NextResponse.json({ message: "URL required" }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/pdf,*/*",
      },
    })

    if (!res.ok) {
      return NextResponse.json({ message: "Failed to fetch" }, { status: res.status })
    }

    const contentType = res.headers.get("content-type") || "application/pdf"
    const buffer = await res.arrayBuffer()

    // Extract filename from URL
    const filename = url.split("/").pop() || "receipt.pdf"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Proxy failed" }, { status: 500 })
  }
}
