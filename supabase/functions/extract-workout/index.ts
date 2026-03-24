// Supabase Edge Function — extract-workout
// Receives a base64 image and label, calls Claude Vision to extract workout data.

import Anthropic from 'npm:@anthropic-ai/sdk'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const MUSCLE_CATEGORIES = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Abdômen',
  'Quadríceps',
  'Posterior',
  'Glúteos',
  'Panturrilha',
  'Corpo Inteiro',
]

const SYSTEM_PROMPT = `You are a workout plan extraction assistant. You analyze photos of workout plans (handwritten or printed) and extract structured exercise data.

Return a JSON object with this exact structure:
{
  "workout": {
    "name": "Workout name in Portuguese (e.g., Treino de Peito)",
    "exercises": [
      {
        "name": "Exercise name in Portuguese",
        "category": "One of the valid categories",
        "sets": 3,
        "reps": "10-12",
        "restSeconds": 60,
        "equipment": "Equipment used",
        "confidence": 0.95
      }
    ]
  }
}

Valid categories (use EXACTLY these, with accents):
${MUSCLE_CATEGORIES.map((c) => `- ${c}`).join('\n')}

Rules:
- Exercise names should be in Portuguese
- If you cannot determine the category, use "Corpo Inteiro"
- Sets must be between 1 and 20
- Rest seconds must be between 0 and 600 (default to 60 if not specified)
- Confidence is 0-1 indicating how sure you are about the extraction
- Return ONLY the JSON object, no markdown or explanation`

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { image, label } = await req.json()

    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid image field' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: `Extract the workout plan from this image. The workout label is "${label ?? 'A'}". Return only valid JSON.`,
            },
          ],
        },
      ],
      system: SYSTEM_PROMPT,
    })

    // Extract text content from response
    const textBlock = message.content.find((block: { type: string }) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return new Response(JSON.stringify({ error: 'No text response from Claude' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse the JSON response
    const responseText = (textBlock as { type: 'text'; text: string }).text
    const parsed = JSON.parse(responseText)

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
