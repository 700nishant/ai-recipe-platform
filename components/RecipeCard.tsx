"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Clock, Star, Flame } from "lucide-react";
import { Card } from "./ui/card";
import { Recipe } from "@/lib/db";
import { api } from "@/lib/services/api";
import { useToast } from "./ui/toast";

interface RecipeCardProps {
  recipe: Recipe;
  isFavoritedByDefault?: boolean;
  onFavoriteToggle?: (id: string, isFav: boolean) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  isFavoritedByDefault = false,
  onFavoriteToggle,
}) => {
  const { toast } = useToast();
  const [isFav, setIsFav] = React.useState(isFavoritedByDefault);
  const [prevIsFavoritedByDefault, setPrevIsFavoritedByDefault] = React.useState(isFavoritedByDefault);
  const [loading, setLoading] = React.useState(false);

  if (isFavoritedByDefault !== prevIsFavoritedByDefault) {
    setPrevIsFavoritedByDefault(isFavoritedByDefault);
    setIsFav(isFavoritedByDefault);
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await api.toggleFavorite(recipe.id);
      setIsFav(res.isFavorite);
      
      toast({
        title: res.isFavorite ? "Added to Favorites!" : "Removed from Favorites",
        description: `"${recipe.title}" has been updated.`,
        variant: "success",
      });

      if (onFavoriteToggle) {
        onFavoriteToggle(recipe.id, res.isFavorite);
      }
    } catch (err) {
      toast({
        title: "Error marking favorite",
        description: "Please sign in to save recipes.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <Link href={`/recipes/${recipe.id}`} className="group flex">
      <Card className="flex flex-col w-full overflow-hidden hover:-translate-y-1.5 transition-all duration-300 hover:shadow-lg p-0 border border-zinc-150/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/70">
        {/* Cover Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Difficulty Badge */}
          <span className={`absolute top-3.5 left-3.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${
            recipe.difficulty === "Easy" ? "bg-emerald-500" :
            recipe.difficulty === "Medium" ? "bg-amber-500" :
            "bg-red-500"
          }`}>
            {recipe.difficulty}
          </span>

          {/* Bookmark heart */}
          <button
            onClick={handleToggleFavorite}
            disabled={loading}
            className="absolute top-3.5 right-3.5 p-2 rounded-xl bg-white/90 dark:bg-zinc-950/90 text-zinc-650 hover:text-red-500 dark:text-zinc-350 dark:hover:text-red-500 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Heart className={`w-4 h-4 transition-all ${isFav ? "fill-red-500 text-red-500 scale-110" : ""}`} />
          </button>

          {/* Cooking Time Badge */}
          <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 text-white">
            <Clock className="w-4 h-4 text-white/90" />
            <span className="text-xs font-semibold">{totalTime} mins</span>
          </div>

          {/* Rating Badge */}
          {recipe.rating > 0 && (
            <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-lg text-white">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold">{recipe.rating}</span>
            </div>
          )}
        </div>

        {/* Card details */}
        <div className="flex-1 flex flex-col p-5">
          <div className="flex-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{recipe.category}</span>
            <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-50 font-sans group-hover:text-brand-primary transition-colors line-clamp-1">
              {recipe.title}
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-450 line-clamp-2 leading-relaxed">
              {recipe.description}
            </p>
          </div>

          <hr className="my-4 border-zinc-100 dark:border-zinc-900" />

          {/* Nutrition Summary */}
          <div className="flex items-center justify-between text-[11px] text-zinc-450 dark:text-zinc-400 font-medium">
            <div className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>{recipe.nutrition.calories} kcal</span>
            </div>
            <div className="flex gap-3">
              <span>P: {recipe.nutrition.protein}g</span>
              <span>C: {recipe.nutrition.carbs}g</span>
              <span>F: {recipe.nutrition.fat}g</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};
