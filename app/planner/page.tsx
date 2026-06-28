"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Trash2, ShoppingBag, Info, CheckCircle2, ChevronRight, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/services/api";
import { Recipe, MealPlanEntry } from "@/lib/db";
import { useToast } from "@/components/ui/toast";

export default function PlannerPage() {
  const { toast } = useToast();
  
  const [mealPlan, setMealPlan] = React.useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Shopping List checked state
  const [boughtItems, setBoughtItems] = React.useState<string[]>([]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];

  const loadPlannerData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [plan, recipesList] = await Promise.all([
        api.getMealPlan(),
        api.getRecipes(),
      ]);
      setMealPlan(plan);
      setRecipes(recipesList);
    } catch (err) {
      toast({
        title: "Load failure",
        description: "Could not retrieve meal plan configurations.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadPlannerData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPlannerData]);

  const handleRemoveEntry = async (id: string, title: string) => {
    setDeletingId(id);
    try {
      await api.removeMealEntry(id);
      setMealPlan((prev) => prev.filter((entry) => entry.id !== id));
      toast({
        title: "Meal Removed",
        description: `"${title}" has been deleted from your schedule.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Remove failed",
        description: "An error occurred while removing the schedule.",
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Compile & aggregate ingredients for shopping list
  const shoppingList = React.useMemo(() => {
    const aggregates: Record<string, { amount: number; unit: string }> = {};

    mealPlan.forEach((entry) => {
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) return;

      const scaleMultiplier = entry.servings / recipe.servings;

      recipe.ingredients.forEach((ing) => {
        const cleanName = ing.name.trim().toLowerCase();
        // Capitalize words for layout styling
        const displayName = cleanName
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        const scaledAmount = ing.amount * scaleMultiplier;

        if (aggregates[displayName]) {
          // Add amounts only if units match, otherwise store separately or choose first
          if (aggregates[displayName].unit === ing.unit) {
            aggregates[displayName].amount += scaledAmount;
          } else {
            // If units differ (e.g. grams vs pieces), make a unique key
            const uniqueKey = `${displayName} (${ing.unit})`;
            if (aggregates[uniqueKey]) {
              aggregates[uniqueKey].amount += scaledAmount;
            } else {
              aggregates[uniqueKey] = { amount: scaledAmount, unit: ing.unit };
            }
          }
        } else {
          aggregates[displayName] = { amount: scaledAmount, unit: ing.unit };
        }
      });
    });

    // Format list details
    return Object.entries(aggregates).map(([name, detail]) => ({
      name,
      amount: parseFloat(detail.amount.toFixed(1)),
      unit: detail.unit,
    }));
  }, [mealPlan, recipes]);

  const toggleBoughtItem = (name: string) => {
    if (boughtItems.includes(name)) {
      setBoughtItems(boughtItems.filter((item) => item !== name));
    } else {
      setBoughtItems([...boughtItems, name]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        <p className="text-xs text-zinc-400">Pouring your calendar schedules...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50">
            Weekly Meal Planner
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Organize your menus, manage servings, and export consolidated lists.</p>
        </div>
        <Link href="/recipes" className="w-full sm:w-auto">
          <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1.5 cursor-pointer">
            <Plus className="w-4.5 h-4.5" />
            <span>Schedule New Meal</span>
          </Button>
        </Link>
      </div>

      {/* Main planner grid */}
      <div className="flex flex-col gap-6 overflow-x-auto pb-4">
        <div className="min-w-[800px] flex flex-col gap-4">
          {/* Days Grid header */}
          <div className="grid grid-cols-7 gap-3">
            {days.map((day) => (
              <div key={day} className="text-center py-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-650 dark:text-zinc-350">
                {day}
              </div>
            ))}
          </div>

          {/* Slots layout */}
          <div className="grid grid-cols-7 gap-3">
            {days.map((day) => {
              const dayMeals = mealPlan.filter((m) => m.day.toLowerCase() === day.toLowerCase());
              return (
                <div key={day} className="flex flex-col gap-3.5 min-h-[420px] p-2.5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-150/80 dark:border-zinc-850/50">
                  {mealTypes.map((type) => {
                    const meal = dayMeals.find((m) => m.mealType.toLowerCase() === type.toLowerCase());
                    return (
                      <div
                        key={type}
                        className="flex-1 min-h-[90px] rounded-xl p-3 bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/80 flex flex-col justify-between shadow-xs transition-all hover:border-zinc-250 dark:hover:border-zinc-750"
                      >
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{type}</span>
                        
                        {meal ? (
                          <div className="flex flex-col gap-1.5 mt-2">
                            <Link
                              href={`/recipes/${meal.recipeId}`}
                              className="text-xs font-bold text-zinc-850 dark:text-zinc-100 hover:text-brand-primary line-clamp-2 leading-tight transition-colors"
                            >
                              {meal.recipeTitle}
                            </Link>
                            
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[10px] text-zinc-400 font-semibold">{meal.servings} portions</span>
                              <button
                                onClick={() => handleRemoveEntry(meal.id, meal.recipeTitle)}
                                disabled={deletingId === meal.id}
                                className="text-zinc-350 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col justify-end mt-4">
                            <Link
                              href="/recipes"
                              className="text-[10px] text-zinc-400 hover:text-brand-primary flex items-center gap-0.5 font-medium transition-colors"
                            >
                              <span>+ Add</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shopping List Section */}
      <div className="mt-4">
        <Card className="p-6 border-zinc-250/50 dark:border-zinc-850 shadow-md">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-4">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 font-sans flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-primary" />
              <span>Consolidated Shopping List</span>
            </h3>
            
            <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-lg">
              {shoppingList.length} Items Total
            </span>
          </div>

          {shoppingList.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-6">
              {shoppingList.map((item) => {
                const bought = boughtItems.includes(item.name);
                return (
                  <div
                    key={item.name}
                    onClick={() => toggleBoughtItem(item.name)}
                    className={`flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer ${
                      bought
                        ? "bg-zinc-150/40 border-zinc-200/50 dark:bg-zinc-900/10 dark:border-zinc-900/60 opacity-60"
                        : "bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`shrink-0 w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                        bought ? "bg-brand-secondary border-brand-secondary text-white" : "border-zinc-300 dark:border-zinc-800"
                      }`}>
                        {bought && <CheckCircle2 className="w-3.5 h-3.5 fill-brand-secondary text-white" />}
                      </div>
                      <span className={`text-xs font-semibold text-zinc-750 dark:text-zinc-200 truncate ${bought ? "line-through text-zinc-400" : ""}`}>
                        {item.name}
                      </span>
                    </div>
                    
                    <span className={`text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 shrink-0 ${bought ? "line-through text-zinc-400" : ""}`}>
                      {item.amount} {item.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
              <ShoppingBag className="w-10 h-10 text-zinc-300" />
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Empty Shopping List</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">No recipes scheduled in your weekly calendar yet. Add recipes above to compile shopping ingredients.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
