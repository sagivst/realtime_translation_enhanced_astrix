export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  console.log("[v0 Proxy] Starting fetch to https://20.170.155.53:8080/api/snapshots")

  try {
    const response = await fetch("https://20.170.155.53:8080/api/snapshots", {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    })

    console.log("[v0 Proxy] Response received - Status:", response.status, "OK:", response.ok)
    console.log("[v0 Proxy] Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0 Proxy] Non-OK response body:", errorText)
      return Response.json([])
    }

    const contentType = response.headers.get("content-type")
    console.log("[v0 Proxy] Content-Type:", contentType)

    if (!contentType || !contentType.includes("application/json")) {
      const body = await response.text()
      console.log("[v0 Proxy] Non-JSON response body:", body)
      return Response.json([])
    }

    const data = await response.json()
    console.log(
      "[v0 Proxy] Successfully parsed JSON - Received",
      Array.isArray(data) ? data.length : "unknown",
      "items",
    )
    console.log("[v0 Proxy] Data sample:", JSON.stringify(data).substring(0, 200))

    return Response.json(data)
  } catch (error) {
    console.log("[v0 Proxy] Fetch failed with error:", error)
    console.log("[v0 Proxy] Error type:", error?.constructor?.name)
    console.log("[v0 Proxy] Error message:", error?.message)
    return Response.json([])
  }
}
