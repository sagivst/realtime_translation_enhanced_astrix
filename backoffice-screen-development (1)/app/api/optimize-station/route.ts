import { generateText } from "ai"

export const maxDuration = 30

interface OptimizationRequest {
  stationId: string
  stationName: string
  currentKnobs: Array<{ name: string; value: number; unit: string }>
  metrics: Array<{ name: string; value: number; min: number; optimal: number; max: number }>
  iteration: number
}

interface OptimizationResponse {
  iteration: number
  recommendation: string
  suggestedKnobChanges: Array<{ knobName: string; newValue: number }>
  expectedImprovement: number
  reasoning: string
}

export async function POST(req: Request) {
  const body: OptimizationRequest = await req.json()

  const systemPrompt = `You are an expert audio engineer AI assistant specializing in optimizing audio broadcast stations. 
Your task is to analyze current audio parameters and metrics, then provide specific, actionable recommendations to improve audio quality recursively.

Current Station: ${body.stationName}
Iteration: ${body.iteration}

Current Knobs:
${body.currentKnobs.map((k) => `- ${k.name}: ${k.value} ${k.unit}`).join("\n")}

Current Metrics:
${body.metrics.map((m) => `- ${m.name}: ${m.value} (Min: ${m.min}, Optimal: ${m.optimal}, Max: ${m.max})`).join("\n")}

Provide ONE specific recommendation that:
1. Addresses the most critical issue first
2. Suggests exact knob values to change
3. Estimates the improvement percentage
4. Explains the reasoning

Format your response as JSON with keys: recommendation, suggestedKnobChanges (array), expectedImprovement (0-100), reasoning`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: systemPrompt,
      maxOutputTokens: 500,
      temperature: 0.7,
    })

    // Parse the AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsedResponse = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          recommendation: text,
          suggestedKnobChanges: [],
          expectedImprovement: 5,
          reasoning: "Analysis complete",
        }

    const response: OptimizationResponse = {
      iteration: body.iteration,
      recommendation: parsedResponse.recommendation || text,
      suggestedKnobChanges: parsedResponse.suggestedKnobChanges || [],
      expectedImprovement: parsedResponse.expectedImprovement || 5,
      reasoning: parsedResponse.reasoning || "Optimization recommendation generated",
    }

    return Response.json(response)
  } catch (error) {
    console.error("Error calling OpenAI:", error)
    return Response.json({ error: "Failed to generate optimization recommendation" }, { status: 500 })
  }
}
