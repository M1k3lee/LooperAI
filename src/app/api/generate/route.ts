import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const token = process.env.HUGGINGFACE_TOKEN;
        if (!token) return NextResponse.json({ error: 'Hugging Face token not configured' }, { status: 500 });

        let prompt = "";
        let type = "synth";
        let audioBlob: Blob | null = null;

        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            prompt = (formData.get('prompt') as string) || "";
            type = (formData.get('type') as string) || "synth";
            audioBlob = formData.get('audio') as Blob;
        } else {
            const body = await req.json();
            prompt = body.prompt || "";
            type = body.type || "synth";
        }

        const structuredPrompt = `High quality EDM ${type || 'music loop'}, professional production: ${prompt}`;

        // If audio is present, we prioritize models that support melody conditioning
        const models = audioBlob
            ? ["facebook/musicgen-melody", "facebook/musicgen-small"]
            : ["cvssp/audioldm2-music", "stabilityai/stable-audio-open-1.0", "facebook/musicgen-small"];

        for (const modelId of models) {
            try {
                console.log(`[PulseForge] Forging with ${modelId}...`);

                let body;
                if (audioBlob && modelId.includes('musicgen-melody')) {
                    const audioBuffer = await audioBlob.arrayBuffer();
                    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
                    body = JSON.stringify({
                        inputs: structuredPrompt,
                        parameters: { melody: audioBase64 }
                    });
                } else {
                    body = JSON.stringify({ inputs: structuredPrompt, options: { wait_for_model: true } });
                }

                const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    method: "POST",
                    body: body,
                });

                if (response.ok) {
                    const audioResult = await response.arrayBuffer();
                    if (audioResult.byteLength > 1000) {
                        const base64Audio = Buffer.from(audioResult).toString('base64');
                        return NextResponse.json({
                            audio: `data:audio/wav;base64,${base64Audio}`,
                            name: `AI ${type.toUpperCase()}`,
                            type: type
                        });
                    }
                }
            } catch (e: any) {
                console.error(`Model ${modelId} failed:`, e.message);
            }
        }

        return NextResponse.json({ error: "Cloud busy", useLocalFallback: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
