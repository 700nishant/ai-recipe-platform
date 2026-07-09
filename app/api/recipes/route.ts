import { NextResponse } from "next/server";
import { getRecipes, createRecipe, toggleFavorite, getFavorites } from "@/lib/db";
import { getGourmetRecipeImage } from "@/lib/images";
import { getUserEmail } from "@/lib/auth-helper";

// GET: retrieves recipes (with optional query or category parameters) or favorites list
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const query = searchParams.get("query");
    const favoritesOnly = searchParams.get("favorites");
    const userEmail = await getUserEmail(request);

    if (favoritesOnly === "true") {
      const favorites = getFavorites(userEmail);
      return NextResponse.json({ favorites });
    }

    let recipes = getRecipes(userEmail);

    if (category && category !== "All") {
      recipes = recipes.filter(
        (r) => r.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (query) {
      const q = query.toLowerCase();
      recipes = recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
      );
    }

    return NextResponse.json(recipes);
  } catch (error) {
    console.error("GET Recipes Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST: creates a new custom recipe
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, difficulty, prepTime, cookTime, servings, category, tags, nutrition, ingredients, instructions } = body;
    const userEmail = await getUserEmail(request);

    if (!title || !ingredients || !instructions) {
      return NextResponse.json({ message: "Title, ingredients, and instructions are required" }, { status: 400 });
    }

    const newRecipe = createRecipe({
      title,
      description: description || "",
      difficulty: difficulty || "Easy",
      prepTime: Number(prepTime) || 10,
      cookTime: Number(cookTime) || 10,
      servings: Number(servings) || 2,
      category: category || "Dinner",
      tags: tags || [],
      nutrition: {
        calories: Number(nutrition?.calories) || 0,
        protein: Number(nutrition?.protein) || 0,
        carbs: Number(nutrition?.carbs) || 0,
        fat: Number(nutrition?.fat) || 0,
      },
      ingredients: ingredients || [],
      instructions: instructions || [],
      image: body.image || getGourmetRecipeImage(title),
    }, userEmail);

    return NextResponse.json(newRecipe, { status: 201 });
  } catch (error) {
    console.error("POST Recipes Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PATCH: toggles recipe favorite bookmark
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { recipeId } = body;
    const userEmail = await getUserEmail(request);

    if (!recipeId) {
      return NextResponse.json({ message: "Recipe ID is required" }, { status: 400 });
    }

    const isFavorite = toggleFavorite(recipeId, userEmail);
    return NextResponse.json({ isFavorite });
  } catch (error) {
    console.error("PATCH Recipes Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
