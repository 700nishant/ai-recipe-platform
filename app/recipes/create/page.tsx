"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Save, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/services/api";
import { useToast } from "@/components/ui/toast";

export default function CreateRecipePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<"Easy" | "Medium" | "Hard">("Easy");
  const [prepTime, setPrepTime] = React.useState(10);
  const [cookTime, setCookTime] = React.useState(15);
  const [servings, setServings] = React.useState(2);
  const [category, setCategory] = React.useState<"Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert" | "Drink">("Dinner");
  
  // Tags
  const [availableTags] = React.useState(["Vegetarian", "Vegan", "Gluten-Free", "Keto", "Low-Carb", "High-Protein", "Nut-Free"]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  // Dynamic Ingredients list
  const [ingredients, setIngredients] = React.useState<Array<{ name: string; amount: number; unit: string }>>([
    { name: "", amount: 1, unit: "g" },
  ]);

  // Dynamic Instructions list
  const [instructions, setInstructions] = React.useState<string[]>([""]);

  // Nutrition Info
  const [calories, setCalories] = React.useState(0);
  const [protein, setProtein] = React.useState(0);
  const [carbs, setCarbs] = React.useState(0);
  const [fat, setFat] = React.useState(0);

  const [saving, setSaving] = React.useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: 1, unit: "g" }]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, key: "name" | "amount" | "unit", value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [key]: value };
    setIngredients(updated);
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, ""]);
  };

  const handleRemoveInstruction = (index: number) => {
    if (instructions.length === 1) return;
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleInstructionChange = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Recipe title is required.", variant: "warning" });
      return;
    }

    const validIngredients = ingredients.filter((i) => i.name.trim() !== "");
    if (validIngredients.length === 0) {
      toast({ title: "Validation Error", description: "Add at least one ingredient with a name.", variant: "warning" });
      return;
    }

    const validInstructions = instructions.filter((i) => i.trim() !== "");
    if (validInstructions.length === 0) {
      toast({ title: "Validation Error", description: "Add at least one cooking instruction step.", variant: "warning" });
      return;
    }

    setSaving(true);
    try {
      await api.createRecipe({
        title,
        description,
        difficulty,
        prepTime,
        cookTime,
        servings,
        category,
        tags: selectedTags,
        nutrition: { calories, protein, carbs, fat },
        ingredients: validIngredients,
        instructions: validInstructions,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop"
      });


      toast({
        title: "Recipe Saved!",
        description: `"${title}" has been successfully added to your cookbook.`,
        variant: "success",
      });

      router.push("/recipes");
    } catch (err) {
      console.error(err);
      toast({
        title: "Saving Failed",
        description: "An error occurred while writing your recipe.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-4 max-w-4xl mx-auto">
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-brand-primary w-fit transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Title block */}
      <div>
        <h1 className="text-3xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50">
          Create New Recipe
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Design a signature dish for your collection.</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Core details card */}
        <Card className="p-6 flex flex-col gap-5">
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-900 pb-3 font-sans">
            1. General Information
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Recipe Title</label>
            <input
              type="text"
              placeholder="e.g. Grandma's Lemon Drizzle Cake"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</label>
            <textarea
              placeholder="Write a brief, mouth-watering introduction..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert" | "Drink")}
                className="w-full py-3 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all cursor-pointer"
              >
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
                <option value="Dessert">Dessert</option>
                <option value="Drink">Drink</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "Easy" | "Medium" | "Hard")}
                className="w-full py-3 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all cursor-pointer"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Prep Time (mins)</label>
              <input
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Cook Time (mins)</label>
              <input
                type="number"
                min={0}
                value={cookTime}
                onChange={(e) => setCookTime(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Default Servings</label>
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2.5 mt-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Dietary Regimen Labels</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-brand-primary/15 border border-brand-primary/20 text-brand-primary"
                        : "border border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Ingredients Block */}
        <Card className="p-6 flex flex-col gap-5">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 font-sans">
              2. Ingredients
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddIngredient} className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Add Ingredient</span>
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-3 w-full">
                {/* Ingredient Name */}
                <input
                  type="text"
                  placeholder="e.g. Flour"
                  value={ing.name}
                  onChange={(e) => handleIngredientChange(idx, "name", e.target.value)}
                  className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                />

                {/* Ingredient Amount */}
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  placeholder="Qty"
                  value={ing.amount}
                  onChange={(e) => handleIngredientChange(idx, "amount", parseFloat(e.target.value) || 0)}
                  className="w-20 px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                />

                {/* Ingredient Unit */}
                <input
                  type="text"
                  placeholder="e.g. g"
                  value={ing.unit}
                  onChange={(e) => handleIngredientChange(idx, "unit", e.target.value)}
                  className="w-20 px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
                />

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(idx)}
                  className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                  disabled={ingredients.length === 1}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Steps Block */}
        <Card className="p-6 flex flex-col gap-5">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 font-sans">
              3. Cooking Steps
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddInstruction} className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Add Step</span>
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {instructions.map((step, idx) => (
              <div key={idx} className="flex gap-4 items-start w-full">
                <span className="mt-3.5 shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold font-mono">
                  {idx + 1}
                </span>

                <textarea
                  placeholder="Detail this step's instructions..."
                  rows={2}
                  value={step}
                  onChange={(e) => handleInstructionChange(idx, e.target.value)}
                  className="flex-1 min-w-0 px-4 py-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all resize-none"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveInstruction(idx)}
                  className="mt-2 p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                  disabled={instructions.length === 1}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Nutrition Block */}
        <Card className="p-6 flex flex-col gap-5">
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-900 pb-3 font-sans flex items-center gap-1">
            <span>4. Nutritional Information</span>
            <span title="Optional: details will show on recipe summary">
              <HelpCircle className="w-4 h-4 text-zinc-400" />
            </span>

          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Calories (kcal)</label>
              <input
                type="number"
                min={0}
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Protein (g)</label>
              <input
                type="number"
                min={0}
                value={protein}
                onChange={(e) => setProtein(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Carbs (g)</label>
              <input
                type="number"
                min={0}
                value={carbs}
                onChange={(e) => setCarbs(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Fat (g)</label>
              <input
                type="number"
                min={0}
                value={fat}
                onChange={(e) => setFat(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 transition-all"
              />
            </div>
          </div>
        </Card>

        {/* Buttons */}
        <div className="flex gap-4 self-end w-full sm:w-auto mt-2">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/recipes")}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving} className="w-full sm:w-auto flex items-center gap-1.5 cursor-pointer">
            <Save className="w-4.5 h-4.5" />
            <span>Save Recipe</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
