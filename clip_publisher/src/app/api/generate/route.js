import OpenAI from "openai";

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "OPENAI_API_KEY is missing. Make sure .env.local exists in the clip_publisher folder and restart the dev server.",
        },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const body = await request.json();
    const { clipName, game, clipType, tone, context } = body;

    if (!game || !clipType || !tone) {
      return Response.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You create short-form captions for gaming clips. Keep it natural, punchy, and creator-style. Do not mention AI.",
        },
        {
          role: "user",
          content: `
Create platform-specific content for this gaming clip.

Clip file name: ${clipName || "Unknown"}
Game: ${game}
Clip type: ${clipType}
Tone: ${tone}
What happened: ${context || "No extra context provided."}

Rules:
- Make it sound natural, not corporate.
- Make it sound like a small streamer/gamer wrote it.
- Keep it short and punchy.
- Avoid overusing hashtags.
- TikTok should be casual and quick.
- Instagram should be slightly cleaner.
- YouTube Shorts should include title, description, hashtags, and tags.
- Do not make up fake facts.
`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "clip_caption_output",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              tiktok: {
                type: "object",
                additionalProperties: false,
                properties: {
                  caption: { type: "string" },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["caption", "hashtags"],
              },
              instagram: {
                type: "object",
                additionalProperties: false,
                properties: {
                  caption: { type: "string" },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["caption", "hashtags"],
              },
              youtube: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["title", "description", "hashtags", "tags"],
              },
            },
            required: ["tiktok", "instagram", "youtube"],
          },
        },
      },
    });

    const text = response.output_text;

    if (!text) {
      return Response.json(
        { error: "AI returned an empty response." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(text);

    return Response.json(parsed);
  } catch (error) {
    console.error("AI generation error:", error);

    return Response.json(
      {
        error: error.message || "Failed to generate captions.",
      },
      { status: 500 }
    );
  }
}