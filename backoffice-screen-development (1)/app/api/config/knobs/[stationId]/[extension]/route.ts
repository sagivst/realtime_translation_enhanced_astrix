import { type NextRequest, NextResponse } from "next/server"

const OPERATIONAL_API = process.env.OPERATIONAL_API_URL || "https://20.170.155.53:8080"

export async function GET(request: NextRequest, { params }: { params: { stationId: string; extension: string } }) {
  try {
    const { stationId, extension } = params

    const response = await fetch(`${OPERATIONAL_API}/api/config/knobs/${stationId}/${extension}`, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch knob configuration" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Config API] Failed to fetch knob config:", error)
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { stationId: string; extension: string } }) {
  try {
    const { stationId, extension } = params
    const body = await request.json()

    const response = await fetch(`${OPERATIONAL_API}/api/config/knobs/${stationId}/${extension}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to save knob configuration" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Config API] Failed to save knob config:", error)
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 })
  }
}
