import fs from "fs";
import path from "path";

// Types
export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  quantity?: string;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Review {
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  difficulty: "Easy" | "Medium" | "Hard";
  prepTime: number;
  cookTime: number;
  servings: number;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert" | "Drink";
  tags: string[];
  nutrition: Nutrition;
  ingredients: Ingredient[];
  instructions: string[];
  rating: number;
  reviews: Review[];
  isUserCreated: boolean;
  userEmail?: string;
  cuisine?: string;
  imageKeywords?: string[];
  recommendations?: {
    lunch: { title: string; description: string };
    dinner: { title: string; description: string };
    dessert: { title: string; description: string };
  };
}

export interface MealPlanEntry {
  id: string;
  day: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  recipeId: string;
  recipeTitle: string;
  servings: number;
  userEmail?: string;
}

interface DbData {
  recipes: Recipe[];
  favorites: Record<string, string[]>;
  mealPlan: MealPlanEntry[];
}

const DB_PATH = path.join(process.cwd(), "lib", "db.json");

// Helper to safely read file
export function readDb(): DbData {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // If db.json does not exist, return an empty layout
      return { recipes: [], favorites: {}, mealPlan: [] };
    }
    const data = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(data);
    let favorites = parsed.favorites || {};
    if (Array.isArray(favorites)) {
      favorites = {
        "anonymous": favorites
      };
    }
    return {
      recipes: parsed.recipes || [],
      favorites: favorites,
      mealPlan: parsed.mealPlan || []
    };
  } catch (error) {
    console.error("Error reading mock database:", error);
    return { recipes: [], favorites: {}, mealPlan: [] };
  }
}

// Helper to safely write file
export function writeDb(data: DbData): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing mock database:", error);
  }
}

// Recipes operations
export function getRecipes(userEmail?: string): Recipe[] {
  const email = userEmail || "anonymous";
  return readDb().recipes.filter(
    (r) => !r.isUserCreated || r.userEmail === email || !r.userEmail
  );
}

export function getRecipeById(id: string): Recipe | undefined {
  return readDb().recipes.find((r) => r.id === id);
}

export function createRecipe(
  recipe: Omit<Recipe, "id" | "rating" | "reviews" | "isUserCreated" | "userEmail">,
  userEmail?: string
): Recipe {
  const email = userEmail || "anonymous";
  const db = readDb();
  const newRecipe: Recipe = {
    ...recipe,
    id: Math.random().toString(36).substring(2, 9),
    rating: 0,
    reviews: [],
    isUserCreated: true,
    userEmail: email,
  };
  db.recipes.push(newRecipe);
  writeDb(db);
  return newRecipe;
}

export function updateRecipe(id: string, recipeData: Partial<Recipe>): Recipe | undefined {
  const db = readDb();
  const idx = db.recipes.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;

  db.recipes[idx] = { ...db.recipes[idx], ...recipeData };
  writeDb(db);
  return db.recipes[idx];
}

export function deleteRecipe(id: string): boolean {
  const db = readDb();
  const lengthBefore = db.recipes.length;
  db.recipes = db.recipes.filter((r) => r.id !== id);
  for (const email of Object.keys(db.favorites)) {
    db.favorites[email] = db.favorites[email].filter((favId) => favId !== id);
  }
  db.mealPlan = db.mealPlan.filter((mp) => mp.recipeId !== id);
  writeDb(db);
  return db.recipes.length < lengthBefore;
}

// Favorites operations
export function getFavorites(userEmail?: string): string[] {
  const email = userEmail || "anonymous";
  return readDb().favorites[email] || [];
}

export function toggleFavorite(recipeId: string, userEmail?: string): boolean {
  const email = userEmail || "anonymous";
  const db = readDb();
  if (!db.favorites[email]) {
    db.favorites[email] = [];
  }
  const isFav = db.favorites[email].includes(recipeId);
  
  if (isFav) {
    db.favorites[email] = db.favorites[email].filter((id) => id !== recipeId);
  } else {
    db.favorites[email].push(recipeId);
  }
  
  writeDb(db);
  return !isFav; // Returns true if added, false if removed
}

// Meal Plan operations
export function getMealPlan(userEmail?: string): MealPlanEntry[] {
  const email = userEmail || "anonymous";
  return readDb().mealPlan.filter((e) => !e.userEmail || e.userEmail === email);
}

export function addMealPlanEntry(entry: Omit<MealPlanEntry, "id" | "userEmail">, userEmail?: string): MealPlanEntry {
  const email = userEmail || "anonymous";
  const db = readDb();
  const newEntry: MealPlanEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 9),
    userEmail: email,
  };
  db.mealPlan.push(newEntry);
  writeDb(db);
  return newEntry;
}

export function removeMealPlanEntry(id: string): boolean {
  const db = readDb();
  const lengthBefore = db.mealPlan.length;
  db.mealPlan = db.mealPlan.filter((e) => e.id !== id);
  writeDb(db);
  return db.mealPlan.length < lengthBefore;
}

// Reviews operations
export function addReview(recipeId: string, review: Omit<Review, "date">): Recipe | undefined {
  const db = readDb();
  const idx = db.recipes.findIndex((r) => r.id === recipeId);
  if (idx === -1) return undefined;

  const newReview: Review = {
    ...review,
    date: new Date().toISOString().split("T")[0],
  };

  const recipe = db.recipes[idx];
  recipe.reviews.push(newReview);
  
  // Recalculate average rating
  const totalRating = recipe.reviews.reduce((sum, r) => sum + r.rating, 0);
  recipe.rating = parseFloat((totalRating / recipe.reviews.length).toFixed(1));

  writeDb(db);
  return recipe;
}
