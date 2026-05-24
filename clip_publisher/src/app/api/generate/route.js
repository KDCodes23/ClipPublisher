import OpenAI from "openai";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    // Resolve the current user (if logged in) and their API key
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let apiKey = process.env.OPENAI_API_KEY;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("openai_api_key")
        .eq("id", user.id)
        .single();

      if (profile?.openai_api_key) {
        apiKey = profile.openai_api_key;
      }
    }

    if (!apiKey) {
      return Response.json(
        {
          error:
            "No OpenAI API key found. Add yours in Account settings, or ask the admin to set a server key.",
        },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const body = await request.json();
    const { clipName, game, clipType, tone, context, quality = 2 } = body;

    if (!game || !clipType || !tone) {
      return Response.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const QUALITY_MAP = {
      1: { model: "gpt-4.1-nano",  max_output_tokens: 500  },
      2: { model: "gpt-4.1-mini",  max_output_tokens: 900  },
      3: { model: "gpt-4.1",       max_output_tokens: 1600 },
    };
    const { model, max_output_tokens } = QUALITY_MAP[quality] ?? QUALITY_MAP[2];

    const response = await client.responses.create({
      model,
      max_output_tokens,
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
- Snapchat should be the shortest and most viral — caption under 80 characters.
- Every hashtag must include the # symbol.
- Return 8 to 12 hashtags for TikTok.
- Return 10 to 15 hashtags for Instagram.
- Return 4 to 6 hashtags for YouTube.
- Return 3 to 5 hashtags for Snapchat.
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
                      description: "A TikTok hashtag with the # symbol.",
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
                      description: "An Instagram hashtag with the # symbol.",
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
                      description: "A YouTube hashtag with the # symbol.",
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
              snapchat: {
                type: "object",
                additionalProperties: false,
                properties: {
                  caption: {
                    type: "string",
                    description:
                      "A very short Snapchat Spotlight caption, under 80 characters.",
                  },
                  hashtags: {
                    type: "array",
                    minItems: 3,
                    maxItems: 5,
                    items: {
                      type: "string",
                      description: "A Snapchat hashtag with the # symbol.",
                    },
                  },
                },
                required: ["caption", "hashtags"],
              },
            },
            required: ["tiktok", "instagram", "youtube", "snapchat"],
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

    // Log usage — non-blocking, never fails the request
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createAdminClient();
        await adminClient.from("usage_logs").insert({
          user_id: user?.id ?? null,
          user_email: user?.email ?? null,
          model,
          input_tokens: response.usage?.input_tokens ?? null,
          output_tokens: response.usage?.output_tokens ?? null,
          total_tokens: response.usage?.total_tokens ?? null,
          game,
          clip_type: clipType,
        });
      } catch (logError) {
        console.error("Usage logging failed:", logError);
      }
    }

    return Response.json(parsed);
  } catch (error) {
    console.error("AI generation error:", error);
    return Response.json(
      { error: error.message || "Failed to generate captions." },
      { status: 500 }
    );
  }
}
