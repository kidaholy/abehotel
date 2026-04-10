import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")

  if (!url) return NextResponse.json({ message: "URL required" }, { status: 400 })

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/pdf,application/octet-stream,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    })

    if (!res.ok) {
      // Return a helpful error page instead of JSON so the browser shows something
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:2rem;background:#111;color:#fff">
          <h2>⚠️ Could not load document</h2>
          <p>Status: ${res.status}</p>
          <p>The receipt URL requires authentication or is no longer available.</p>
          <a href="${url}" target="_blank" style="color:#d4af37">Try opening directly →</a>
        </body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      )
    }

    const contentType = res.headers.get("content-type") || "application/pdf"
    const buffer = await res.arrayBuffer()
    const filename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "receipt.pdf")

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error: any) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem;background:#111;color:#fff">
        <h2>⚠️ Proxy Error</h2>
        <p>${error.message}</p>
        <a href="${url}" target="_blank" style="color:#d4af37">Try opening directly →</a>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    )
  }
}
