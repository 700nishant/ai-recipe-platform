"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Camera, Plus, X, UtensilsCrossed, Clock, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/services/api";
import { useToast } from "@/components/ui/toast";
import confetti from "canvas-confetti";
import { Recipe } from "@/lib/db";

export default function GeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<"pantry" | "concept">("pantry");
  const [recipeConcept, setRecipeConcept] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const promptVal = params.get("prompt");
      if (promptVal) {
        setTimeout(() => {
          setRecipeConcept(promptVal);
          setActiveTab("concept");
        }, 0);
      }
    }
  }, []);

  const [ingredients, setIngredients] = React.useState<string[]>([]);
  const [typedIngredient, setTypedIngredient] = React.useState("");
  
  // Settings
  const [diet, setDiet] = React.useState("None");
  const [maxTime, setMaxTime] = React.useState(45);
  const [language, setLanguage] = React.useState("English");

  // States
  const [scanning, setScanning] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [scanPreview, setScanPreview] = React.useState<string | null>(null);

  // Formulated recipe outcome
  const [generatedRecipe, setGeneratedRecipe] = React.useState<Recipe | null>(null);

  const generationSteps = [
    "Analyzing ingredient molecular chemistry...",
    "Sourcing flavor-profile enhancers...",
    "Formulating chef instructions...",
    "Calculating macro-nutritional balances...",
    "Plating simulated results..."
  ];

  const handleAddIngredient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = typedIngredient.trim();
    if (!clean) return;
    if (ingredients.includes(clean)) {
      toast({ title: "Ingredient exists", description: `"${clean}" is already in your selection list.`, variant: "info" });
      return;
    }
    setIngredients([...ingredients, clean]);
    setTypedIngredient("");
  };

  const handleRemoveIngredient = (name: string) => {
    setIngredients(ingredients.filter((i) => i !== name));
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Simulated vision scanning for home cooks without local images
  const handleTrySampleImage = async () => {
    setScanPreview("https://images.unsplash.com/photo-1571175432247-fe063c633b4d?q=80&w=400&auto=format&fit=crop");
    setScanning(true);
    
    // Simulate scanner delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const sampleItems = ["Paneer", "Tomatoes", "Onions", "Ginger", "Garlic", "Capsicum"];
    setIngredients([...new Set([...ingredients, ...sampleItems])]);
    setScanning(false);
    
    toast({
      title: "Sample Scanner Completed!",
      description: "Loaded sample fridge contents: Paneer, Tomatoes, Onions, Ginger, Garlic, Capsicum.",
      variant: "success",
    });
  };

  // Image upload scan
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setScanPreview(base64);
      setScanning(true);
      
      try {
        const res = await api.scanPantry(base64);
        if (res.ingredients && res.ingredients.length > 0) {
          const newIngredients = [...new Set([...ingredients, ...res.ingredients])];
          setIngredients(newIngredients);
          toast({
            title: "Scanner completed successfully!",
            description: `Detected ingredients: ${res.ingredients.join(", ")}.`,
            variant: "success",
          });
        } else {
          toast({
            title: "Scan completed",
            description: "No ingredients could be identified in the image.",
            variant: "warning",
          });
        }
      } catch (err) {
        toast({
          title: "Scanning error",
          description: "Could not evaluate pantry contents.",
          variant: "error",
        });
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateRecipe = async () => {
    const isPantry = activeTab === "pantry";
    if (isPantry && ingredients.length === 0) {
      toast({ title: "Validation Error", description: "Please add ingredients or scan your pantry.", variant: "warning" });
      return;
    }
    if (!isPantry && !recipeConcept.trim()) {
      toast({ title: "Validation Error", description: "Please enter what recipe you want to generate.", variant: "warning" });
      return;
    }

    setGenerating(true);
    setGeneratedRecipe(null);
    setCurrentStep(0);

    // Dynamic timer steps simulation
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < generationSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      const recipe = await api.generateRecipe(isPantry ? ingredients : [], {
        diet: diet === "None" ? undefined : diet,
        maxTime,
        prompt: isPantry ? undefined : recipeConcept,
        language,
      });

      // Recalculate timer and show results
      clearInterval(stepInterval);
      setCurrentStep(generationSteps.length - 1);
      
      // Delay slightly for dramatic plating transition
      await new Promise((resolve) => setTimeout(resolve, 800));

      setGeneratedRecipe(recipe);
      triggerConfetti();

      toast({
        title: "Recipe Generated!",
        description: `"${recipe.title}" is ready!`,
        variant: "success",
      });
    } catch (err) {
      const errorObject = err as Error;
      clearInterval(stepInterval);
      toast({
        title: "Generation failed",
        description: errorObject.message || "Chef failed to formulate your recipe.",
        variant: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToCookbook = async () => {
    if (!generatedRecipe) return;
    try {
      await api.createRecipe(generatedRecipe);
      toast({
        title: "Saved to Cookbook!",
        description: `"${generatedRecipe.title}" added to your custom recipes.`,
        variant: "success",
      });
      router.push("/recipes");
    } catch (err) {
      toast({
        title: "Action failed",
        description: "Could not save custom recipe. Make sure you are logged in.",
        variant: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8 py-4 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50">
          AI Recipe Builder
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Generate custom recipes based on ingredients or dish name prompt concepts.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Control Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Tabs Selector Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-150/80 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl glass-panel">
            <button
              type="button"
              onClick={() => setActiveTab("pantry")}
              className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === "pantry"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-450 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Pantry Mode
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("concept")}
              className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === "concept"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-450 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Recipe Name Mode
            </button>
          </div>

          {activeTab === "pantry" ? (
            <>
              {/* Pantry Image scanner */}
              <Card className="p-5 flex flex-col gap-4">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans flex items-center gap-1.5">
                  <Camera className="w-4.5 h-4.5 text-brand-primary" />
                  <span>Pantry Image Scanner</span>
                </h3>

                {scanPreview ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    <img src={scanPreview} alt="Fridge preview" className="w-full h-full object-cover" />
                    {scanning && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
                        <span className="text-[10px] text-white font-medium uppercase tracking-wider">Identifying items...</span>
                      </div>
                    )}
                    {!scanning && (
                      <button
                        onClick={() => { setScanPreview(null); }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/55 text-white hover:bg-black/75 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <label className="border border-dashed border-zinc-200 dark:border-zinc-850 hover:border-brand-primary/50 dark:hover:border-brand-primary/50 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-2 bg-zinc-50/50 dark:bg-zinc-900/10">
                      <Camera className="w-7 h-7 text-zinc-400" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Upload Fridge/Pantry Photo</span>
                      <span className="text-[10px] text-zinc-400">Gemini Vision identifies ingredients</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    
                    {/* Trial mock scan button */}
                    <button
                      type="button"
                      onClick={handleTrySampleImage}
                      className="text-xs text-brand-primary font-bold hover:underline cursor-pointer flex items-center justify-center gap-1 py-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Try with Sample Fridge Photo</span>
                    </button>
                  </div>
                )}
              </Card>

              {/* Ingredients input Card */}
              <Card className="p-5 flex flex-col gap-4">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans flex items-center gap-1.5">
                  <UtensilsCrossed className="w-4.5 h-4.5 text-brand-primary" />
                  <span>Selected Ingredients</span>
                </h3>

                <div className="flex flex-col gap-3">
                  <form onSubmit={handleAddIngredient} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Tomato, Chicken"
                      value={typedIngredient}
                      onChange={(e) => setTypedIngredient(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                    />
                    <Button type="submit" variant="outline" size="sm" className="h-[38px] cursor-pointer">
                      Add
                    </Button>
                  </form>

                  {/* Sample Basket templates for home users */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Or Load Sample Basket:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIngredients(["Paneer", "Tomato", "Onions", "Ginger", "Garlic", "Capsicum", "Green Chilies"])}
                        className="px-2 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 dark:hover:bg-orange-900/30 text-[10px] font-semibold text-brand-primary rounded-lg transition-colors cursor-pointer"
                      >
                        🇮🇳 Indian Curry
                      </button>
                      <button
                        type="button"
                        onClick={() => setIngredients(["Pasta", "Tomato", "Basil", "Garlic", "Olive Oil", "Parmesan"])}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-[10px] font-semibold text-brand-secondary rounded-lg transition-colors cursor-pointer"
                      >
                        🇮🇹 Italian Pasta
                      </button>
                      <button
                        type="button"
                        onClick={() => setIngredients(["Avocado", "Egg", "Sourdough Bread", "Spinach", "Lemon"])}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-[10px] font-semibold text-blue-500 rounded-lg transition-colors cursor-pointer"
                      >
                        🥑 Healthy Breakfast
                      </button>
                    </div>
                  </div>

                  {/* Tags list display */}
                  <div className="flex flex-wrap gap-1.5 mt-1 min-h-[40px] p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-150/50 dark:border-zinc-850/50">
                    {ingredients.length > 0 ? (
                      ingredients.map((ing) => (
                        <span
                          key={ing}
                          className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-[11px] font-semibold text-zinc-750 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80 shadow-xs"
                        >
                          <span>{ing}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(ing)}
                            className="p-0.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-zinc-400 italic m-auto">No ingredients selected.</span>
                    )}
                  </div>
                </div>
              </Card>
            </>
          ) : (
            /* Concept Prompt mode */
            <Card className="p-5 flex flex-col gap-4">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-brand-primary" />
                <span>Specify Dish or Concept</span>
              </h3>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">What do you want to cook?</label>
                  <textarea
                    placeholder="e.g. Creamy Paneer Butter Masala, Chocolate Chip Cookies..."
                    value={recipeConcept}
                    onChange={(e) => setRecipeConcept(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Popular Indian & Global Dish concept cards */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Or Select Popular Dishes:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { name: "Paneer Butter Masala", icon: "🇮🇳" },
                      { name: "Butter Chicken", icon: "🇮🇳" },
                      { name: "Chole Bhature", icon: "🇮🇳" },
                      { name: "Spaghetti Carbonara", icon: "🇮🇹" },
                      { name: "Margherita Pizza", icon: "🍕" },
                      { name: "Chocolate Cake", icon: "🍰" }
                    ].map((dish) => (
                      <button
                        key={dish.name}
                        type="button"
                        onClick={() => setRecipeConcept(dish.name)}
                        className="p-2 border border-zinc-200 dark:border-zinc-800 hover:border-brand-primary/45 dark:hover:border-brand-primary/30 rounded-xl text-left text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer truncate"
                      >
                        <span className="mr-1">{dish.icon}</span>
                        <span>{dish.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Settings Panel */}
          <Card className="p-5 flex flex-col gap-5">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans flex items-center gap-1.5">
              <UtensilsCrossed className="w-4.5 h-4.5 text-brand-primary" />
              <span>Gourmet Options</span>
            </h3>

            {/* Dietary Regimen */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dietary Requirement</label>
              <select
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="py-2.5 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 cursor-pointer"
              >
                <option value="None">No Dietary Regimen</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Gluten-Free">Gluten-Free</option>
                <option value="Keto">Keto</option>
                <option value="Low-Carb">Low-Carb</option>
                <option value="High-Protein">High-Protein</option>
              </select>
            </div>

            {/* Language Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Recipe Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="py-2.5 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 cursor-pointer"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
              </select>
            </div>

            {/* Time slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>Cooking Limit</span>
                <span className="text-brand-primary font-bold">{maxTime} mins</span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={5}
                value={maxTime}
                onChange={(e) => setMaxTime(Number(e.target.value))}
                className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-primary mt-1"
              />
            </div>

            <Button
              onClick={handleGenerateRecipe}
              disabled={generating || (activeTab === "pantry" ? ingredients.length === 0 : !recipeConcept.trim())}
              className="mt-2 w-full flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Generate Recipe</span>
            </Button>
          </Card>
        </div>

        {/* Right Output Showcase */}
        <div className="lg:col-span-2">
          {generating ? (
            <Card className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center border-zinc-200/50 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-full border-2 border-brand-primary border-t-transparent animate-spin mb-4" />
              
              {/* Dynamic steps text */}
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 font-sans animate-pulse">
                {generationSteps[currentStep]}
              </h3>
              <p className="text-xs text-zinc-400 mt-2">Chef Gourmet is formulating the perfect instructions.</p>
              
              {/* Fake progress bar */}
              <div className="w-full max-w-xs h-1 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden mt-6">
                <div
                  className="h-full bg-brand-primary transition-all duration-1000"
                  style={{ width: `${((currentStep + 1) / generationSteps.length) * 100}%` }}
                />
              </div>
            </Card>
          ) : generatedRecipe ? (
            <Card className="p-6 flex flex-col gap-6 border-zinc-200/50 dark:border-zinc-850 shadow-md">
              {/* Header result */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-900">
                <div>
                  <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-50 font-sans">
                    {generatedRecipe.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">{generatedRecipe.description}</p>
                  {generatedRecipe.imageKeywords && generatedRecipe.imageKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {generatedRecipe.imageKeywords.map((kw, idx) => (
                        <span key={idx} className="text-[9px] bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={handleSaveToCookbook}>
                    Save to Cookbook
                  </Button>
                </div>
              </div>

              {/* Recipe attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Category</span>
                  <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 mt-0.5">{generatedRecipe.category}</p>
                </div>
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Cuisine</span>
                  <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 mt-0.5">{generatedRecipe.cuisine || "Global"}</p>
                </div>
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Difficulty</span>
                  <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 mt-0.5">{generatedRecipe.difficulty}</p>
                </div>
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Prep/Cook</span>
                  <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 mt-0.5">
                    {generatedRecipe.prepTime + generatedRecipe.cookTime} mins
                  </p>
                </div>
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Calories</span>
                  <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 mt-0.5">{generatedRecipe.nutrition.calories} kcal</p>
                </div>
              </div>

              {/* Ingredients details */}
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans mb-3">Ingredients List</h4>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {generatedRecipe.ingredients.map((ing: Recipe["ingredients"][number], idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 px-3 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl text-xs">
                      <span className="text-zinc-800 dark:text-zinc-250 font-medium">{ing.name}</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {ing.quantity || `${ing.amount} ${ing.unit}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps details */}
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans mb-3">Cooking Instructions</h4>
                <div className="flex flex-col gap-3.5">
                  {generatedRecipe.instructions.map((step: string, idx: number) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-bold font-mono mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-350 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Recommendations */}
              {generatedRecipe.recommendations && (
                <div className="pt-5 border-t border-zinc-100 dark:border-zinc-900/60 flex flex-col gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans flex items-center gap-1.5">
                      <Sparkles className="w-4.5 h-4.5 text-brand-primary animate-pulse" />
                      <span>Meal Plan Suggestions from Chef Gourmet AI</span>
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Complement this recipe with these custom recommended pairings.</p>
                  </div>
                  
                  <div className="grid sm:grid-cols-3 gap-4">
                    {/* Lunch */}
                    {generatedRecipe.recommendations.lunch && (
                      <div className="p-4 bg-orange-50/20 dark:bg-zinc-900/30 border border-orange-100/50 dark:border-zinc-800/80 rounded-2xl flex flex-col gap-1.5">
                        <span className="text-[9px] bg-orange-100/60 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold px-2 py-0.5 rounded-md self-start uppercase tracking-wide">
                          Lunch
                        </span>
                        <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-50 mt-1 leading-snug">
                          {generatedRecipe.recommendations.lunch.title}
                        </h5>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-400 leading-relaxed">
                          {generatedRecipe.recommendations.lunch.description}
                        </p>
                      </div>
                    )}

                    {/* Dinner */}
                    {generatedRecipe.recommendations.dinner && (
                      <div className="p-4 bg-emerald-50/20 dark:bg-zinc-900/30 border border-emerald-100/50 dark:border-zinc-800/80 rounded-2xl flex flex-col gap-1.5">
                        <span className="text-[9px] bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md self-start uppercase tracking-wide">
                          Dinner
                        </span>
                        <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-50 mt-1 leading-snug">
                          {generatedRecipe.recommendations.dinner.title}
                        </h5>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-400 leading-relaxed">
                          {generatedRecipe.recommendations.dinner.description}
                        </p>
                      </div>
                    )}

                    {/* Dessert */}
                    {generatedRecipe.recommendations.dessert && (
                      <div className="p-4 bg-purple-50/20 dark:bg-zinc-900/30 border border-purple-100/50 dark:border-zinc-800/80 rounded-2xl flex flex-col gap-1.5">
                        <span className="text-[9px] bg-purple-100/60 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded-md self-start uppercase tracking-wide">
                          Dessert
                        </span>
                        <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-50 mt-1 leading-snug">
                          {generatedRecipe.recommendations.dessert.title}
                        </h5>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-400 leading-relaxed">
                          {generatedRecipe.recommendations.dessert.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <div className="h-full min-h-[400px] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-zinc-950/20">
              <Sparkles className="w-10 h-10 text-zinc-300 mb-3" />
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">Create Recipe with AI</h3>
              <p className="text-xs text-zinc-400 mt-2 max-w-sm">
                Choose Pantry Mode to scan ingredients or Recipe Name Mode to request a dish directly!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
