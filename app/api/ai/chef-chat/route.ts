import { NextResponse } from "next/server";
import { chefAssistantReply } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history } = body;

    if (!message) {
      return NextResponse.json(
        { message: "User message is required" },
        { status: 400 }
      );
    }

    const reply = await chefAssistantReply(message, history || []);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI Chef Chat Route Error:", error);
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || "Failed to process chat message" },
      { status: 500 }
    );
  }
}
