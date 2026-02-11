import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { command } = await req.json();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
        }

        const systemPrompt = `You are an expert EDM music producer AI assistant. 
Your job is to translate user natural language commands into structured JSON parameters for a music production engine.
Available parameters: 
- reverb (0 to 1) - Spatial depth
- delay (0 to 1) - Echo / repetition
- cutoff (20 to 20000 Hz) - Low pass filter (smaller = darker)
- resonance (0 to 1) - Filter peak
- drive (0 to 1) - Soft saturation
- dist (0 to 1) - Heavy distortion (use for "filthy", "dirty", "gritty", "warehouse")
- loopCategory (one of: 'kick', 'drum', 'bass', 'synth', 'fx', 'hat' - ONLY if user asks for pro/high-quality/pre-made loops)

Return ONLY a JSON object with a "params" key. 
Example: "I need a professional techno kick loop" 
Output: {"params": {"loopCategory": "kick", "cutoff": 20000}}

Example: "Make it a filthy distorted warehouse kick" 
Output: {"params": {"loopCategory": "kick", "dist": 0.9, "cutoff": 800, "drive": 0.5}}

Example: "Make it a dark techno lead with lots of reverb" 
Output: {"params": {"cutoff": 400, "reverb": 0.8}}

Current user command: "${command}"`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://pulseforge.ai", // Optional
                "X-Title": "PulseForge"
            },
            body: JSON.stringify({
                "model": "mistralai/mistral-7b-instruct:free",
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": command }
                ],
                "response_format": { "type": "json_object" }
            })
        });

        const data = await response.json();

        // Safely parse the AI response
        let aiContent = data.choices?.[0]?.message?.content || "{}";

        // Sometimes models wrap JSON in markdown blocks
        if (aiContent.includes("```json")) {
            aiContent = aiContent.split("```json")[1].split("```")[0];
        } else if (aiContent.includes("```")) {
            aiContent = aiContent.split("```")[1].split("```")[0];
        }

        const parsedParams = JSON.parse(aiContent);

        return NextResponse.json(parsedParams);

    } catch (error: any) {
        console.error('OpenRouter NLU Error:', error);
        // Fallback to empty params if AI fails
        return NextResponse.json({ params: {} });
    }
}
