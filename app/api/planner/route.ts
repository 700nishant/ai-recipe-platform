import { NextResponse } from "next/server";
import { getMealPlan, addMealPlanEntry, removeMealPlanEntry } from "@/lib/db";
import { getUserEmail } from "@/lib/auth-helper";

// GET: retrieves the current meal plan entries
export async function GET(request: Request) {
  try {
    const userEmail = await getUserEmail(request);
    const planner = getMealPlan(userEmail);
    return NextResponse.json(planner);
  } catch (error) {
    console.error("GET Planner Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST: adds a recipe to the meal plan calendar
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { day, mealType, recipeId, recipeTitle, servings } = body;
    const userEmail = await getUserEmail(request);

    if (!day || !mealType || !recipeId || !recipeTitle) {
      return NextResponse.json(
        { message: "Day, meal type, recipe ID, and recipe title are required" },
        { status: 400 }
      );
    }

    const newEntry = addMealPlanEntry({
      day,
      mealType,
      recipeId,
      recipeTitle,
      servings: Number(servings) || 2,
    }, userEmail);

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error("POST Planner Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE: removes a specific meal plan calendar entry
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Meal entry ID is required" }, { status: 400 });
    }

    const success = removeMealPlanEntry(id);

    if (!success) {
      return NextResponse.json({ message: "Meal entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Planner Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
