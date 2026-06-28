import { NextResponse } from "next/server";
import { addReview } from "@/lib/db";

// POST: adds a rating and review to a recipe
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipeId, user, rating, comment } = body;

    if (!recipeId || !user || rating === undefined) {
      return NextResponse.json(
        { message: "Recipe ID, user name, and rating are required" },
        { status: 400 }
      );
    }

    const numericRating = Number(rating);
    if (numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { message: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    const updatedRecipe = addReview(recipeId, {
      user,
      rating: numericRating,
      comment: comment || "",
    });

    if (!updatedRecipe) {
      return NextResponse.json({ message: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(updatedRecipe, { status: 201 });
  } catch (error) {
    console.error("POST Reviews Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
