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
            "You create short-form captions, titles, descriptions, hashtags, and tags for gaming clips. Keep it natural, creator-style, short, and punchy. Do not mention AI.",
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
- TikTok should be casual and quick.
- Instagram should be slightly cleaner but still fun.
- YouTube Shorts should include a strong title, description, hashtags, and searchable tags.
- Every hashtag must include the # symbol.
- Return 8 to 12 hashtags for TikTok.
- Return 10 to 15 hashtags for Instagram.
- Return 4 to 6 hashtags for YouTube.
- Hashtags must be relevant to the game, clip type, streamer content, and platform.
- Include gaming, streamer, and clip-specific hashtags.
- Do not return empty hashtag arrays.
- Do not make up fake facts.
- No markdown.
- No code block.
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
                  caption: {
                    type: "string",
                    description: "A short TikTok caption.",
                  },
                  hashtags: {
                    type: "array",
                    minItems: 8,
                    maxItems: 12,
                    items: {
                      type: "string",
                      description:
                        "A TikTok hashtag with the # symbol included.",
                    },
                  },
                },
                required: ["caption", "hashtags"],
              },
              instagram: {
                type: "object",
                additionalProperties: false,
                properties: {
                  caption: {
                    type: "string",
                    description: "A clean but fun Instagram Reels caption.",
                  },
                  hashtags: {
                    type: "array",
                    minItems: 10,
                    maxItems: 15,
                    items: {
                      type: "string",
                      description:
                        "An Instagram hashtag with the # symbol included.",
                    },
                  },
                },
                required: ["caption", "hashtags"],
              },
              youtube: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: {
                    type: "string",
                    description: "A short YouTube Shorts title.",
                  },
                  description: {
                    type: "string",
                    description: "A short YouTube Shorts description.",
                  },
                  hashtags: {
                    type: "array",
                    minItems: 4,
                    maxItems: 6,
                    items: {
                      type: "string",
                      description:
                        "A YouTube hashtag with the # symbol included.",
                    },
                  },
                  tags: {
                    type: "array",
                    minItems: 8,
                    maxItems: 18,
                    items: {
                      type: "string",
                      description:
                        "A searchable YouTube tag without the # symbol.",
                    },
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