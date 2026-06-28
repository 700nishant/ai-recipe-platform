import { NextResponse } from "next/server";
import { getRecipeById, updateRecipe, deleteRecipe } from "@/lib/db";

// GET: returns details of a single recipe
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipe = getRecipeById(id);

    if (!recipe) {
      return NextResponse.json({ message: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("GET Recipe ID Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PUT: updates details of an existing recipe
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatedRecipe = updateRecipe(id, body);

    if (!updatedRecipe) {
      return NextResponse.json({ message: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    console.error("PUT Recipe ID Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE: removes a specific recipe
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = deleteRecipe(id);

    if (!success) {
      return NextResponse.json({ message: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Recipe ID Route Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
