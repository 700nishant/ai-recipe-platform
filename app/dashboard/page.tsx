"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ChefHat, Sparkles, Plus, Calendar, Heart, MessageSquare, Utensils, Award, Flame, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/services/api";
import { Recipe, MealPlanEntry } from "@/lib/db";
import { useToast } from "@/components/ui/toast";

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [mealPlan, setMealPlan] = React.useState<MealPlanEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [recommendations, setRecommendations] = React.useState<Array<{
    title: string;
    description: string;
    category: string;
    difficulty: "Easy" | "Medium" | "Hard";
    prepTime: number;
    cookTime: number;
    reason: string;
  }>>([]);
  const [recsLoading, setRecsLoading] = React.useState(true);

  // Fallback to local storage user
  const [user, setUser] = React.useState<{ name?: string | null; email?: string | null; image?: string | null } | null>(null);

  React.useEffect(() => {
    // Check session or local storage
    if (session?.user) {
      setTimeout(() => {
        setUser(session.user || null);
      }, 0);
    } else {
      const local = localStorage.getItem("mock_user");
      if (local) {
        setTimeout(() => {
          setUser(JSON.parse(local));
        }, 0);
      } else {
        // Redirect to signin if not authenticated
        router.push("/auth/signin");
      }
    }
  }, [session, router]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [recipesList, favs, plan] = await Promise.all([
          api.getRecipes(),
          api.getFavorites(),
          api.getMealPlan(),
        ]);
        setRecipes(recipesList);
        setFavorites(favs);
        setMealPlan(plan);
      } catch (err) {
        console.error("Dashboard failed to load data:", err);
        toast({
          title: "Failed to load dashboard data",
          description: "There was a problem pulling your kitchen items.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      loadData();
    }
  }, [user, toast]);

  React.useEffect(() => {
    const fetchRecs = async () => {
      if (!user || recipes.length === 0) return;
      try {
        setRecsLoading(true);
        const favoriteTitles = recipes.filter((r) => favorites.includes(r.id)).map((r) => r.title);
        
        let searches: string[] = [];
        const saved = localStorage.getItem("recent_searches");
        if (saved) {
          searches = JSON.parse(saved);
        }
        
        const recList = await api.getRecommendations(favoriteTitles, searches);
        setRecommendations(recList);
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      } finally {
        setRecsLoading(false);
      }
    };
    
    fetchRecs();
  }, [user, recipes, favorites]);

  if (!user || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        <p className="text-xs text-zinc-400">Loading your culinary workspace...</p>
      </div>
    );
  }

  // Calculate stats
  const totalRecipes = recipes.length;
  const favoriteRecipes = recipes.filter((r) => favorites.includes(r.id));
  const totalFavorites = favoriteRecipes.length;
  const plannedCount = mealPlan.length;

  // Filter today's meal plan (let's assume it's Monday for simulation or fetch actual day)
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = days[new Date().getDay()];
  const todaysMeals = mealPlan.filter((m) => m.day.toLowerCase() === currentDay.toLowerCase());

  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Welcome Message */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome, Chef {user.name}!
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Here is a summary of your culinary workshop today.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Link href="/recipes/create" className="flex-1 md:flex-initial">
            <Button variant="outline" size="sm" className="w-full flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Create Recipe</span>
            </Button>
          </Link>
          <Link href="/generator" className="flex-1 md:flex-initial">
            <Button variant="primary" size="sm" className="w-full flex items-center gap-1.5 cursor-pointer">
              <Sparkles className="w-4 h-4" />
              <span>AI Generator</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 p-5">
          <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-brand-primary">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-sans">{totalRecipes}</p>
            <p className="text-xs text-zinc-400">Total Recipes</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500">
            <Heart className="w-5.5 h-5.5 fill-red-500/10" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-sans">{totalFavorites}</p>
            <p className="text-xs text-zinc-400">Saved Favorites</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-brand-secondary">
            <Calendar className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-sans">{plannedCount}</p>
            <p className="text-xs text-zinc-400">Planned Meals</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500">
            <Flame className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-sans">1.2k</p>
            <p className="text-xs text-zinc-400">Avg Calories/Day</p>
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column (Meals & Actions) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* AI Recommendations Panel */}
          <Card className="p-6 border-zinc-200/50 dark:border-zinc-850 bg-gradient-to-br from-orange-500/5 via-transparent to-brand-primary/5">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-900">
              <div>
                <h3 className="font-bold text-lg font-sans text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
                  <span>Chef Gourmet&apos;s Personal AI Picks</span>
                </h3>
                <p className="text-xs text-zinc-450 mt-0.5">Custom recipe recommendations inspired by your favorites and search activity.</p>
              </div>
            </div>

            {recsLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
                <span className="text-[11px] text-zinc-400 font-medium">Curating recipes for you...</span>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="flex flex-col justify-between p-4.5 rounded-2xl bg-white dark:bg-zinc-900/30 border border-zinc-150/70 dark:border-zinc-800/80 shadow-xs relative overflow-hidden group">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/35 text-brand-primary font-bold text-[9px] rounded-md uppercase tracking-wider">
                          {rec.category}
                        </span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-400 font-semibold">{rec.difficulty}</span>
                      </div>
                      <h4 className="font-bold text-xs text-zinc-850 dark:text-zinc-100 line-clamp-1 group-hover:text-brand-primary transition-colors">
                        {rec.title}
                      </h4>
                      <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2">
                        {rec.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex flex-col gap-2">
                      <span className="text-[9px] text-zinc-400/90 italic font-medium leading-tight line-clamp-2 min-h-[24px]">
                        {rec.reason}
                      </span>
                      <Link href={`/generator?prompt=${encodeURIComponent(rec.title)}`}>
                        <Button variant="outline" size="sm" className="w-full text-[10px] h-7 cursor-pointer hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all">
                          Cook with AI
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <Utensils className="w-8 h-8 text-zinc-300 mb-2" />
                <p className="text-xs text-zinc-450 italic">Start searching or bookmark favorites to unlock personalized AI suggestions!</p>
              </div>
            )}
          </Card>

          {/* Today's Meal Plan Preview */}
          <Card className="p-6">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <h3 className="font-bold text-lg font-sans text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-primary" />
                <span>Today&apos;s Meal Plan ({currentDay})</span>
              </h3>
              <Link href="/planner" className="text-xs font-semibold text-brand-primary hover:underline">
                Open Planner
              </Link>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-4 mt-6">
              {["Breakfast", "Lunch", "Dinner"].map((type) => {
                const meal = todaysMeals.find((m) => m.mealType.toLowerCase() === type.toLowerCase());
                return (
                  <div key={type} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150/50 dark:border-zinc-800/80 flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{type}</span>
                    {meal ? (
                      <div className="flex-1 flex flex-col justify-between">
                        <Link href={`/recipes/${meal.recipeId}`} className="font-bold text-sm text-zinc-850 dark:text-zinc-100 hover:text-brand-primary transition-colors line-clamp-2">
                          {meal.recipeTitle}
                        </Link>
                        <span className="text-[11px] text-zinc-400 mt-2 font-medium">{meal.servings} Servings</span>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-between">
                        <p className="text-xs text-zinc-400 italic">No meal scheduled</p>
                        <Link href="/recipes" className="text-[11px] font-semibold text-brand-primary mt-4 flex items-center gap-0.5 hover:underline">
                          <span>Find Recipe</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quick Actions Shortcuts */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/chat">
              <Card className="p-5 flex items-start gap-4 hover:border-brand-primary/45 transition-colors cursor-pointer group">
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-brand-primary">
                  <MessageSquare className="w-5.5 h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-brand-primary transition-colors">Chat with AI Chef</h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Ask kitchen advice, nutrition ratios, or recipe suggestions.</p>
                </div>
              </Card>
            </Link>

            <Link href="/generator">
              <Card className="p-5 flex items-start gap-4 hover:border-brand-primary/45 transition-colors cursor-pointer group">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-brand-secondary">
                  <Sparkles className="w-5.5 h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-brand-secondary transition-colors">Pantry Scanner</h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Scan your fridge ingredients with Gemini Vision to cook instantly.</p>
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Right Column (Favorites & Saved Recipes) */}
        <div>
          <Card className="p-6 h-full flex flex-col">
            <div className="pb-4 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-lg font-sans text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500/10" />
                <span>Favorites</span>
              </h3>
              <Link href="/recipes" className="text-xs font-semibold text-brand-primary hover:underline">
                View All
              </Link>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 mt-4 flex flex-col gap-4">
              {favoriteRecipes.length > 0 ? (
                favoriteRecipes.map((recipe) => (
                  <Link href={`/recipes/${recipe.id}`} key={recipe.id} className="flex gap-3 items-center group">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-brand-primary transition-colors truncate">
                        {recipe.title}
                      </h4>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] text-zinc-400">{recipe.prepTime + recipe.cookTime} mins</span>
                        <span className="text-[10px] text-zinc-400">•</span>
                        <span className="text-[10px] text-brand-primary font-semibold">{recipe.difficulty}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <Heart className="w-8 h-8 text-zinc-300 mb-2" />
                  <p className="text-xs text-zinc-400 italic">No favorite recipes yet.</p>
                  <Link href="/recipes" className="text-xs font-semibold text-brand-primary mt-4 hover:underline">
                    Find recipe to bookmark
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
