import { NextResponse } from "next/server";
import { generateAIPickedRecipe } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ingredients, diet, maxTime, prompt, language } = body;

    if (!prompt && (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0)) {
      return NextResponse.json(
        { message: "Either ingredients or a recipe prompt is required" },
        { status: 400 }
      );
    }

    const recipe = await generateAIPickedRecipe(
      ingredients || [],
      diet || "None",
      Number(maxTime) || 60,
      prompt,
      language || "English"
    );


    return NextResponse.json(recipe);
  } catch (error) {
    console.error("AI Recipe Generator Route Error:", error);
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || "Failed to generate AI recipe" },
      { status: 500 }
    );
  }
}
