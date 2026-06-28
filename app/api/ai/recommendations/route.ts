import { NextResponse } from "next/server";
import { generateRecommendations } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { favorites, recentSearches, seed } = body;

    const recommendations = await generateRecommendations(
      favorites || [],
      recentSearches || [],
      Number(seed) || 0
    );

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("AI Recommendation Route Error:", error);
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || "Failed to generate AI recommendations" },
      { status: 500 }
    );
  }
}
