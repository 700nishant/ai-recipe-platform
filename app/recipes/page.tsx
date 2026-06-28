"use client";

import * as React from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Plus, Sparkles, AlertCircle, Clock, ArrowRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecipeCard } from "@/components/RecipeCard";
import { Recipe } from "@/lib/db";
import { api } from "@/lib/services/api";
import { motion } from "framer-motion";
import { getGourmetRecipeImage } from "@/lib/images";

// Predefined suggestion pool for instant autocomplete
const allSuggestionTitles = [
  "Butter Chicken", "Paneer Tikka", "Egg Fried Rice", "Avocado Toast",
  "Chocolate Cake", "Oreo Shake", "Mango Lassi", "Chicken Caesar Salad",
  "Pasta Carbonara", "Masala Omelette", "Blueberry Pancakes", "Veggie Tacos",
  "Strawberry Parfait", "Lava Mug Cake", "Mushroom Risotto",
  "Tandoori Wings", "Crispy Masala Aloo", "Brownie Bites",
  "Creamy Garlic Pasta", "Chickpea Salad Bowl", "Paneer Skewers",
  "Chocolate Brownie", "Mango Shake", "Oreo Ice Cream", "Banana Smoothie",
  "French Toast", "Grilled Salmon", "Veg Biryani", "Dal Makhani", "Samosa",
];

export default function RecipesPage() {
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [activeDiet, setActiveDiet] = React.useState("All");
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
  const [recSeed, setRecSeed] = React.useState(0);

  // Search suggestion state
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  const categories = ["All", "Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Drink"];
  const diets = ["All", "Vegetarian", "Vegan", "Gluten-Free", "Keto", "Low-Carb", "High-Protein"];

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Compute live suggestions from local pool + recipe titles during render
  const suggestions = React.useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }
    const q = searchQuery.trim().toLowerCase();
    const recipeMatches = recipes.map(r => r.title).filter(t =>
      t.toLowerCase().includes(q)
    );
    const poolMatches = allSuggestionTitles.filter(t =>
      t.toLowerCase().includes(q) && !recipeMatches.includes(t)
    );
    return [...new Set([...recipeMatches, ...poolMatches])].slice(0, 7);
  }, [searchQuery, recipes]);

  // Save recent search
  React.useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) return;
    
    const handler = setTimeout(() => {
      const saved = localStorage.getItem("recent_searches");
      let list: string[] = saved ? JSON.parse(saved) : [];
      const query = searchQuery.trim().toLowerCase();
      if (!list.includes(query)) {
        list = [query, ...list].slice(0, 5);
        localStorage.setItem("recent_searches", JSON.stringify(list));
      }
    }, 1200);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadRecipes = React.useCallback(async () => {
    try {
      setLoading(true);
      const categoryParam = activeCategory === "All" ? undefined : activeCategory;
      const queryParam = searchQuery === "" ? undefined : searchQuery;
      
      const [list, favs] = await Promise.all([
        api.getRecipes({ category: categoryParam, query: queryParam }),
        api.getFavorites().catch(() => [] as string[]),
      ]);
      
      // Client-side diet filter
      let filteredList = list;
      if (activeDiet !== "All") {
        filteredList = list.filter((r) =>
          r.tags.some((tag) => tag.toLowerCase() === activeDiet.toLowerCase())
        );
      }

      setRecipes(filteredList);
      setFavorites(favs);
    } catch (err) {
      console.error("Error loading recipes:", err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery, activeDiet]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadRecipes();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRecipes]);

  const handleFavoriteToggle = (id: string, isFav: boolean) => {
    if (isFav) {
      setFavorites((prev) => [...prev, id]);
    } else {
      setFavorites((prev) => prev.filter((favId) => favId !== id));
    }
  };

  const loadRecommendations = React.useCallback(async () => {
    try {
      setRecsLoading(true);
      const favTitles = recipes.filter((r) => favorites.includes(r.id)).map((r) => r.title);
      
      let searches: string[] = [];
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("recent_searches");
        if (saved) {
          searches = JSON.parse(saved);
        }
      }

      // Also push current active search if meaningful
      if (searchQuery.trim().length >= 3 && !searches.includes(searchQuery.trim().toLowerCase())) {
        searches = [searchQuery.trim().toLowerCase(), ...searches];
      }
      
      const recList = await api.getRecommendations(favTitles, searches, recSeed);
      setRecommendations(recList);
    } catch (err) {
      console.error("Failed to load recommendations in Browse page:", err);
    } finally {
      setRecsLoading(false);
    }
  }, [recipes, favorites, recSeed, searchQuery]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadRecommendations();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRecommendations]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50">
            Explore Recipes
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Discover handcrafted recipes and AI-driven gourmet creations.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/recipes/create" className="flex-1 sm:flex-initial">
            <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1.5 cursor-pointer">
              <Plus className="w-4.5 h-4.5" />
              <span>Add Custom Recipe</span>
            </Button>
          </Link>
          <Link href="/generator" className="flex-1 sm:flex-initial">
            <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1.5 cursor-pointer">
              <Sparkles className="w-4.5 h-4.5" />
              <span>AI Recipe Builder</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter panel */}
      <Card className="p-5 flex flex-col gap-5 border border-zinc-150/80 bg-white/70 dark:border-zinc-800/80 dark:bg-zinc-950/70 backdrop-blur-md">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search bar with live suggestions */}
          <div className="relative flex-1 w-full" ref={searchRef}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-450 dark:text-zinc-400 pointer-events-none z-10" />
            <input
              id="recipe-search-input"
              type="text"
              placeholder="Search recipes, ingredients, keyword..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
              className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-transparent transition-all"
            />

            {/* Live suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden"
              >
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(sug); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>
                      {/* Highlight matching text */}
                      {sug.split(new RegExp(`(${searchQuery})`, "i")).map((part, pi) =>
                        part.toLowerCase() === searchQuery.toLowerCase()
                          ? <strong key={pi} className="text-brand-primary font-semibold">{part}</strong>
                          : part
                      )}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          
          {/* Diet select */}
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <SlidersHorizontal className="w-4.5 h-4.5 text-zinc-400" />
            <select
              value={activeDiet}
              onChange={(e) => setActiveDiet(e.target.value)}
              className="w-full md:w-48 py-3 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="All">All Diets / Regimen</option>
              {diets.filter(d => d !== "All").map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none">
          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-brand-primary text-white shadow-sm"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Dynamic AI recommendations panel */}
      {(recsLoading || recommendations.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-5 pt-2"
        >
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 font-sans flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
                <span>Chef Gourmet&apos;s Personal AI Recommendations</span>
              </h3>
              <p className="text-xs text-zinc-400">
                {searchQuery.trim().length >= 3
                  ? `Suggestions inspired by your search for "${searchQuery.trim()}"`
                  : "Custom suggestions tailored to your search patterns and favourite recipes."}
              </p>
            </div>
            
            <div className="flex items-center gap-3 self-start sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecSeed(prev => prev + 1)}
                className="h-8 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold px-3.5"
              >
                <RotateCw className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Suggestions</span>
              </Button>
              <span className="text-[10px] bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                AI Picks
              </span>
            </div>
          </div>

          {recsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="glass-panel p-5 rounded-2xl border border-zinc-150/80 dark:border-zinc-800/85 bg-white/70 dark:bg-zinc-950/60 animate-pulse h-40" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {recommendations.map((rec, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="glass-panel group relative flex flex-col justify-between rounded-2xl border border-zinc-150/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/60 transition-all duration-300 hover:shadow-[0_12px_24px_rgba(255,90,54,0.08)] hover:border-brand-primary/40 dark:hover:border-brand-primary/30 overflow-hidden"
                >
                  {/* Visual glow backdrop on hover */}
                  <div className="absolute -inset-px bg-gradient-to-tr from-brand-primary/10 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

                  {/* Dynamic Recipe Match Image */}
                  <div className="relative aspect-video w-full overflow-hidden border-b border-zinc-100 dark:border-zinc-900/60">
                    <img
                      src={getGourmetRecipeImage(rec.title)}
                      alt={rec.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 bg-brand-primary text-white font-bold text-[9px] rounded-lg uppercase tracking-wider shadow-md">
                        {rec.category}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[9px] font-bold text-white flex items-center gap-1.5 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{rec.prepTime + rec.cookTime} mins</span>
                    </div>
                  </div>

                  {/* Recommendation Content */}
                  <div className="flex-1 flex flex-col justify-between p-5 relative z-10">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-zinc-100 dark:bg-zinc-900 text-zinc-550 dark:text-zinc-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          {rec.difficulty}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 line-clamp-1 group-hover:text-brand-primary transition-colors">
                        {rec.title}
                      </h4>
                      <p className="text-xs text-zinc-450 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-900/80 flex flex-col gap-3">
                      <div className="flex items-start gap-1.5 min-h-[28px]">
                        <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-400 font-medium italic leading-relaxed">
                          {rec.reason}
                        </span>
                      </div>

                      <Link href={`/generator?prompt=${encodeURIComponent(rec.title)}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-[11px] h-8 flex items-center justify-center gap-1 cursor-pointer transition-all hover:bg-brand-primary hover:text-white hover:border-brand-primary"
                        >
                          <span>Cook with AI Chef</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}


      {/* Grid Recipes Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-400">Pouring recipe data...</p>
        </div>
      ) : recipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavoritedByDefault={favorites.includes(recipe.id)}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl py-24 px-6 bg-white/40 dark:bg-zinc-950/20">
          <AlertCircle className="w-10 h-10 text-zinc-300 mb-3" />
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">No Recipes Found</h3>
          <p className="text-xs text-zinc-400 mt-2 max-w-sm">No culinary items match your search criteria. Try modifying filters or generate a fresh recipe using the AI builder!</p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setActiveCategory("All"); setActiveDiet("All"); }}>
              Reset Filters
            </Button>
            <Link href="/generator">
              <Button variant="primary" size="sm">
                Generate Recipe
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
