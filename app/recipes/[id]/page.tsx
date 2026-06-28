"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Clock, Star, Heart, Trash2, Calendar, Sparkles, AlertCircle, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { api } from "@/lib/services/api";
import { Recipe } from "@/lib/db";
import { useToast } from "@/components/ui/toast";


export default function RecipeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  
  // React 19 parameter unpacking
  const { id } = React.use(params);

  const [recipe, setRecipe] = React.useState<Recipe | null>(null);
  const [isFav, setIsFav] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);

  // Dynamic scaling portion sizes
  const [servings, setServings] = React.useState(2);

  // Steps checklist
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);

  // Planner Dialog
  const [plannerOpen, setPlannerOpen] = React.useState(false);
  const [plannerDay, setPlannerDay] = React.useState("Monday");
  const [plannerMealType, setPlannerMealType] = React.useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Dinner");
  const [plannerServings, setPlannerServings] = React.useState(2);
  const [planning, setPlanning] = React.useState(false);

  // Review Form
  const [reviewRating, setReviewRating] = React.useState(5);
  const [reviewComment, setReviewComment] = React.useState("");
  const [reviewName, setReviewName] = React.useState("");
  const [submittingReview, setSubmittingReview] = React.useState(false);

  // Fallback local user check
  const [localUser, setLocalUser] = React.useState<{ name?: string | null; email?: string | null; image?: string | null } | null>(null);

  React.useEffect(() => {
    const userString = localStorage.getItem("mock_user");
    if (userString) {
      const parsed = JSON.parse(userString);
      setTimeout(() => {
        setLocalUser(parsed);
        setReviewName(parsed.name || "");
      }, 0);
    } else if (session?.user) {
      const sUser = session.user;
      setTimeout(() => {
        setLocalUser(sUser);
        setReviewName(sUser.name || "");
      }, 0);
    }
  }, [session]);

  const loadRecipeDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      const [item, favs] = await Promise.all([
        api.getRecipeById(id),
        api.getFavorites().catch(() => [] as string[]),
      ]);
      setRecipe(item);
      setServings(item.servings);
      setIsFav(favs.includes(item.id));
    } catch (err) {
      console.error(err);
      toast({
        title: "Recipe not found",
        description: "This recipe does not exist or has been deleted.",
        variant: "error",
      });
      router.push("/recipes");
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadRecipeDetails();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRecipeDetails]);

  const handleToggleFavorite = async () => {
    if (!recipe) return;
    try {
      const res = await api.toggleFavorite(recipe.id);
      setIsFav(res.isFavorite);
      toast({
        title: res.isFavorite ? "Saved to Favorites!" : "Removed from Favorites",
        description: `"${recipe.title}" has been updated.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Action failed",
        description: "Could not toggle favorite.",
        variant: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;
    if (!window.confirm("Are you sure you want to delete this custom recipe? This action is permanent.")) return;
    
    setDeleting(true);
    try {
      await api.deleteRecipe(recipe.id);
      toast({
        title: "Recipe Deleted",
        description: `"${recipe.title}" has been removed.`,
        variant: "success",
      });
      router.push("/recipes");
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: "An error occurred while deleting the recipe.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleStep = (index: number) => {
    if (completedSteps.includes(index)) {
      setCompletedSteps(completedSteps.filter((idx) => idx !== index));
    } else {
      setCompletedSteps([...completedSteps, index]);
    }
  };

  const handleAddToPlanner = async () => {
    if (!recipe) return;
    setPlanning(true);
    try {
      await api.addMealEntry({
        day: plannerDay,
        mealType: plannerMealType,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        servings: plannerServings,
      });

      toast({
        title: "Scheduled Successful!",
        description: `Added "${recipe.title}" to ${plannerDay} ${plannerMealType}.`,
        variant: "success",
      });

      setPlannerOpen(false);
    } catch (err) {
      toast({
        title: "Schedule Failed",
        description: "Could not add recipe to planner.",
        variant: "error",
      });
    } finally {
      setPlanning(false);
    }
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe) return;
    if (!reviewName.trim()) {
      toast({ title: "Validation Error", description: "Please enter your name.", variant: "warning" });
      return;
    }

    setSubmittingReview(true);
    try {
      const updated = await api.addReview(recipe.id, {
        user: reviewName,
        rating: reviewRating,
        comment: reviewComment,
      });

      setRecipe(updated);
      setReviewComment("");
      toast({
        title: "Review Posted!",
        description: "Thank you for sharing your cooking feedback.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Review Failed",
        description: "Could not post your review.",
        variant: "error",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        <p className="text-xs text-zinc-400">Loading gourmet specifications...</p>
      </div>
    );
  }

  if (!recipe) return null;

  // Calculate scaled ingredient amounts
  const scaleMultiplier = servings / recipe.servings;

  return (
    <div className="flex flex-col gap-8 py-4 max-w-5xl mx-auto">
      {/* Back & actions navigation */}
      <div className="flex justify-between items-center">
        <button onClick={() => router.push("/recipes")} className="flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-brand-primary transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Recipes</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Favorite Toggle */}
          <button
            onClick={handleToggleFavorite}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <Heart className={`w-5 h-5 text-zinc-500 ${isFav ? "fill-red-500 text-red-500 scale-105" : ""}`} />
          </button>

          {/* Planner scheduling button */}
          <Button variant="outline" size="sm" onClick={() => setPlannerOpen(true)} className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-brand-primary" />
            <span>Add to Planner</span>
          </Button>

          {/* Delete custom recipe */}
          {recipe.isUserCreated && (
            <Button
              variant="danger"
              size="sm"
              isLoading={deleting}
              onClick={handleDelete}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="relative aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-xl border border-zinc-200/40 dark:border-zinc-800">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

        {/* Text Details overlay */}
        <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 text-white flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-brand-primary/80 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              {recipe.category}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm shadow-sm ${
              recipe.difficulty === "Easy" ? "bg-emerald-500/80" :
              recipe.difficulty === "Medium" ? "bg-amber-500/80" :
              "bg-red-500/80"
            }`}>
              {recipe.difficulty}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-sans tracking-tight leading-[1.15]">
            {recipe.title}
          </h1>

          <p className="text-xs sm:text-sm text-white/80 max-w-2xl font-medium line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>

          <div className="flex flex-wrap items-center gap-4.5 mt-2 pt-4 border-t border-white/10 text-xs sm:text-sm text-white/95">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-white/80" />
              <span>Prep: {recipe.prepTime} mins</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-white/80" />
              <span>Cook: {recipe.cookTime} mins</span>
            </div>
            {recipe.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4.5 h-4.5 fill-amber-400 text-amber-400" />
                <span className="font-bold">{recipe.rating} ({recipe.reviews.length} reviews)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Breakdown Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Ingredients & Portions slider (Left / Col-1) */}
        <div className="flex flex-col gap-6">
          <Card className="p-6 flex flex-col gap-5">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-900 pb-3 font-sans">
              Ingredients
            </h3>

            {/* Serving Adjuster */}
            <div className="flex flex-col gap-2.5 p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-150/50 dark:border-zinc-800/85">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-zinc-650 dark:text-zinc-350">Adjust Portion:</span>
                <span className="font-bold text-brand-primary text-base font-sans">{servings} Servings</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-primary mt-1"
              />
              <span className="text-[10px] text-zinc-400">Ingredient quantities automatically scale.</span>
            </div>

            {/* List */}
            <div className="flex flex-col gap-3.5 mt-2">
              {recipe.ingredients.map((ing, idx) => {
                const scaledAmount = Number((ing.amount * scaleMultiplier).toFixed(1));
                return (
                  <div key={idx} className="flex justify-between items-center py-1.5 border-b border-zinc-100/50 dark:border-zinc-900/50 text-sm">
                    <span className="text-zinc-800 dark:text-zinc-250 font-medium">{ing.name}</span>
                    <span className="font-bold font-mono text-zinc-900 dark:text-zinc-50">
                      {scaledAmount} {ing.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Nutrition Info Summary */}
          <Card className="p-6 flex flex-col gap-4">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-900 pb-3 font-sans">
              Nutrition Breakdown
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mt-1 text-center">
              <div className="p-3 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/60 dark:border-orange-950/20 rounded-xl">
                <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold uppercase">Calories</p>
                <p className="text-lg font-bold text-zinc-800 dark:text-zinc-50 font-mono mt-1">
                  {recipe.nutrition.calories}
                </p>
              </div>
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-950/20 rounded-xl">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Protein</p>
                <p className="text-lg font-bold text-zinc-800 dark:text-zinc-50 font-mono mt-1">
                  {recipe.nutrition.protein}g
                </p>
              </div>
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/60 dark:border-blue-950/20 rounded-xl">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Carbs</p>
                <p className="text-lg font-bold text-zinc-800 dark:text-zinc-50 font-mono mt-1">
                  {recipe.nutrition.carbs}g
                </p>
              </div>
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100/60 dark:border-purple-950/20 rounded-xl">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase">Fat</p>
                <p className="text-lg font-bold text-zinc-800 dark:text-zinc-50 font-mono mt-1">
                  {recipe.nutrition.fat}g
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Steps Checkbox (Right / Col-2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="p-6">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-900 pb-3 font-sans flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-primary" />
              <span>Step-by-Step Cooking Checklist</span>
            </h3>

            <div className="flex flex-col gap-5 mt-6">
              {recipe.instructions.map((step, idx) => {
                const completed = completedSteps.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                      completed
                        ? "bg-zinc-150/40 border-zinc-200/50 dark:bg-zinc-900/10 dark:border-zinc-900/60 opacity-60"
                        : "bg-white dark:bg-zinc-950/30 border-zinc-150/80 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-850"
                    }`}
                  >
                    {/* Circle Checkbox */}
                    <div className={`mt-0.5 shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-full border transition-all ${
                      completed
                        ? "bg-brand-primary border-brand-primary text-white"
                        : "border-zinc-300 dark:border-zinc-800"
                    }`}>
                      {completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Step descriptions */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Step {idx + 1}</span>
                      <p className={`text-sm text-zinc-855 dark:text-zinc-200 leading-relaxed ${completed ? "line-through text-zinc-400" : ""}`}>
                        {step}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Reviews Rating Section */}
          <Card className="p-6 flex flex-col gap-6">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-900 pb-3 font-sans">
              Home Chef Reviews ({recipe.reviews.length})
            </h3>

            {/* List of Reviews */}
            <div className="flex flex-col gap-5 max-h-[300px] overflow-y-auto pr-1">
              {recipe.reviews.length > 0 ? (
                recipe.reviews.map((rev, index) => (
                  <div key={index} className="flex flex-col gap-2 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150/60 dark:border-zinc-800/60">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{rev.user}</span>
                      <span className="text-[10px] text-zinc-400 font-medium">{rev.date}</span>
                    </div>
                    {/* Star row */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-amber-400 text-amber-400" : "text-zinc-200 dark:text-zinc-800"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-zinc-650 dark:text-zinc-350 mt-1 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-400 italic py-4">No reviews yet. Be the first to review this recipe!</p>
              )}
            </div>

            {/* Post Review Form */}
            {localUser ? (
              <form onSubmit={handlePostReview} className="flex flex-col gap-4.5 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Write a Review</h4>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Rating Selector */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Rating Score</label>
                    <div className="flex items-center gap-1.5 py-2">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starNum = i + 1;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReviewRating(starNum)}
                            className="text-zinc-350 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          >
                            <Star className={`w-6 h-6 ${starNum <= reviewRating ? "fill-amber-400 text-amber-400" : "text-zinc-200 dark:text-zinc-800"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Name input */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Your Name</label>
                    <input
                      type="text"
                      placeholder="Chef Name"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      className="px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Comments</label>
                  <textarea
                    placeholder="Tell us what you liked, spice tweaks, or cooking outcomes..."
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-4 py-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all resize-none"
                  />
                </div>

                <Button type="submit" isLoading={submittingReview} size="sm" className="self-end cursor-pointer">
                  Submit Feedback
                </Button>
              </form>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 text-center text-xs text-zinc-450 mt-2">
                <span>Please </span>
                <Link href="/auth/signin" className="text-brand-primary font-semibold hover:underline">Sign In</Link>
                <span> to post a rating & recipe review.</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Scheduler Meal Plan Dialog */}
      <Dialog
        isOpen={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        title="Schedule Recipe to Planner"
        description="Integrate this gourmet selection into your weekly kitchen routine."
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Calendar Day</label>
              <select
                value={plannerDay}
                onChange={(e) => setPlannerDay(e.target.value)}
                className="w-full py-3 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 cursor-pointer"
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Meal Type</label>
              <select
                value={plannerMealType}
                onChange={(e) => setPlannerMealType(e.target.value as "Breakfast" | "Lunch" | "Dinner" | "Snack")}
                className="w-full py-3 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 cursor-pointer"
              >
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Servings Amount</label>
            <input
              type="number"
              min={1}
              value={plannerServings}
              onChange={(e) => setPlannerServings(Number(e.target.value))}
              className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => setPlannerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={planning} onClick={handleAddToPlanner} className="flex items-center gap-1">
              <Plus className="w-4 h-4" />
              <span>Schedule Meal</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
