import { NextResponse } from "next/server";
import { detectIngredientsFromImage } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image } = body; // Base64 encoded image string

    if (!image) {
      return NextResponse.json(
        { message: "Image data (base64 string) is required" },
        { status: 400 }
      );
    }

    const ingredients = await detectIngredientsFromImage(image);

    return NextResponse.json({ ingredients });
  } catch (error) {
    console.error("AI Pantry Scanner Route Error:", error);
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || "Failed to scan pantry image" },
      { status: 500 }
    );
  }
}
