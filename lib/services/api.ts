import { Recipe, MealPlanEntry, Review } from "@/lib/db";

// Helper to make API calls
async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  let userEmail = "";
  if (typeof window !== "undefined") {
    const mockUser = localStorage.getItem("mock_user");
    if (mockUser) {
      try {
        const parsed = JSON.parse(mockUser);
        userEmail = parsed?.email || "";
      } catch (e) {}
    }
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(userEmail ? { "x-user-email": userEmail } : {}),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed API call: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Recipes
  async getRecipes(params?: { category?: string; query?: string }): Promise<Recipe[]> {
    let url = "/api/recipes";
    const queryParts: string[] = [];
    
    if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
    
    if (queryParts.length > 0) {
      url += `?${queryParts.join("&")}`;
    }
    
    return fetcher<Recipe[]>(url);
  },

  async getRecipeById(id: string): Promise<Recipe> {
    return fetcher<Recipe>(`/api/recipes/${id}`);
  },

  async createRecipe(recipe: Omit<Recipe, "id" | "rating" | "reviews" | "isUserCreated">): Promise<Recipe> {
    return fetcher<Recipe>("/api/recipes", {
      method: "POST",
      body: JSON.stringify(recipe),
    });
  },

  async updateRecipe(id: string, recipe: Partial<Recipe>): Promise<Recipe> {
    return fetcher<Recipe>(`/api/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify(recipe),
    });
  },

  async deleteRecipe(id: string): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/recipes/${id}`, {
      method: "DELETE",
    });
  },

  // Favorites
  async getFavorites(): Promise<string[]> {
    const res = await fetcher<{ favorites: string[] }>("/api/recipes?favorites=true");
    return res.favorites;
  },

  async toggleFavorite(recipeId: string): Promise<{ isFavorite: boolean }> {
    return fetcher<{ isFavorite: boolean }>("/api/recipes", {
      method: "PATCH",
      body: JSON.stringify({ recipeId }),
    });
  },

  // Meal Planner
  async getMealPlan(): Promise<MealPlanEntry[]> {
    return fetcher<MealPlanEntry[]>("/api/planner");
  },

  async addMealEntry(entry: Omit<MealPlanEntry, "id">): Promise<MealPlanEntry> {
    return fetcher<MealPlanEntry>("/api/planner", {
      method: "POST",
      body: JSON.stringify(entry),
    });
  },

  async removeMealEntry(id: string): Promise<{ success: boolean }> {
    return fetcher<{ success: boolean }>(`/api/planner?id=${id}`, {
      method: "DELETE",
    });
  },

  // Reviews
  async addReview(recipeId: string, review: Omit<Review, "date">): Promise<Recipe> {
    return fetcher<Recipe>("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ recipeId, ...review }),
    });
  },

  // AI Generation & Chat
  async generateRecipe(ingredients: string[], options?: { diet?: string; maxTime?: number; prompt?: string; language?: string }): Promise<Recipe> {
    return fetcher<Recipe>("/api/ai/generate-recipe", {
      method: "POST",
      body: JSON.stringify({ ingredients, ...options }),
    });
  },



  async scanPantry(base64Image: string): Promise<{ ingredients: string[] }> {
    return fetcher<{ ingredients: string[] }>("/api/ai/scan-pantry", {
      method: "POST",
      body: JSON.stringify({ image: base64Image }),
    });
  },

  async sendChefMessage(message: string, history: { role: "user" | "model"; parts: { text: string }[] }[]): Promise<{ reply: string }> {
    return fetcher<{ reply: string }>("/api/ai/chef-chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
  },

  async getRecommendations(favorites: string[], recentSearches: string[], seed?: number): Promise<Array<{
    title: string;
    description: string;
    category: string;
    difficulty: "Easy" | "Medium" | "Hard";
    prepTime: number;
    cookTime: number;
    reason: string;
  }>> {
    type Recommendation = {
      title: string;
      description: string;
      category: string;
      difficulty: "Easy" | "Medium" | "Hard";
      prepTime: number;
      cookTime: number;
      reason: string;
    };
    return fetcher<Recommendation[]>("/api/ai/recommendations", {
      method: "POST",
      body: JSON.stringify({ favorites, recentSearches, seed }),
    });
  }
}
;
