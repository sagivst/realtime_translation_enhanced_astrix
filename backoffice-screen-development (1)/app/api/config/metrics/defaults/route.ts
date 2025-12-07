import { type NextRequest, NextResponse } from "next/server"

const OPERATIONAL_API = process.env.OPERATIONAL_API_URL || "https://20.170.155.53:8080"

export async function GET() {
  try {
    const response = await fetch(`${OPERATIONAL_API}/api/config/metrics/defaults`, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch default metrics configuration" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Config API] Failed to fetch metric defaults:", error)
    return NextResponse.json({ error: "Failed to fetch defaults" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${OPERATIONAL_API}/api/config/metrics/defaults`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to save default metrics configuration" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Config API] Failed to save metric defaults:", error)
    return NextResponse.json({ error: "Failed to save defaults" }, { status: 500 })
  }
}
