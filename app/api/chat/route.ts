import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages)) {
      return Response.json(
        { error: "Invalid messages" },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const stream = client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system:
        "You are a helpful, accurate AI assistant. Be clear and concise.",
      messages: messages.map((m: any) => ({
        role: m.role,
        content: String(m.content),
      })),
    });

    return new Response(stream.toReadableStream(), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
