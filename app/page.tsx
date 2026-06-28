"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ChefHat, Camera, Calendar, ArrowRight, Heart, Star, Search, Flame, Zap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SimulatedRecipe {
  title: string;
  time: string;
  calories: string;
  difficulty: string;
  instructions: string[];
}

export default function Home() {
  const [selectedIngredients, setSelectedIngredients] = React.useState<string[]>([]);
  const [simulatedRecipe, setSimulatedRecipe] = React.useState<SimulatedRecipe | null>(null);
  const [generating, setGenerating] = React.useState(false);

  const sampleIngredients = ["Tomatoes", "Basil", "Garlic", "Chicken", "Pasta", "Parmesan", "Olive Oil", "Spinach"];

  const toggleIngredient = (name: string) => {
    if (selectedIngredients.includes(name)) {
      setSelectedIngredients(selectedIngredients.filter((i) => i !== name));
    } else {
      setSelectedIngredients([...selectedIngredients, name]);
    }
  };

  const handleSimulate = () => {
    if (selectedIngredients.length === 0) return;
    setGenerating(true);
    setSimulatedRecipe(null);
    setTimeout(() => {
      setGenerating(false);
      setSimulatedRecipe({
        title: "Rustic Herb Tomato & Garlic Pasta",
        time: "15 mins",
        calories: "380 kcal",
        difficulty: "Easy",
        instructions: [
          "Boil pasta in salted water.",
          "Sauté minced garlic in olive oil, then add chopped tomatoes.",
          "Toss pasta in the sauce, add fresh basil, and top with grated Parmesan."
        ]
      });
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-16 py-8">
      {/* Hero Section */}
      <section className="relative flex flex-col lg:flex-row items-center gap-12 pt-8 pb-12 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 -left-12 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex-1 flex flex-col gap-6 text-center lg:text-left z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 self-center lg:self-start px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span>AI-Powered Culinary Revolution</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1]"
          >
            Cook Like a Chef with <span className="bg-gradient-to-r from-brand-primary to-orange-600 bg-clip-text text-transparent">GourmetAI</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-zinc-650 dark:text-zinc-350 max-w-xl mx-auto lg:mx-0 leading-relaxed"
          >
            Scan your fridge, generate gourmet recipes instantly based on what you have, plan weekly meals, and chat with your personal AI chef.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start mt-2"
          >
            <Link href="/generator">
              <Button size="lg" className="flex items-center gap-2 w-full sm:w-auto cursor-pointer">
                <span>Try Recipe Generator</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/recipes">
              <Button variant="outline" size="lg" className="w-full sm:w-auto cursor-pointer">
                Browse Recipes
              </Button>
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex items-center justify-center lg:justify-start gap-8 mt-6 pt-6 border-t border-zinc-150 dark:border-zinc-800/80"
          >
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-sans">15k+</span>
              <span className="text-xs text-zinc-400">Recipes Cooked</span>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-sans flex items-center gap-1">
                4.9 <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </span>
              <span className="text-xs text-zinc-400">Chef Reviews</span>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-sans">99.8%</span>
              <span className="text-xs text-zinc-400">AI Accuracy</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Image / Card Floating */}
        <div className="flex-1 w-full relative max-w-md lg:max-w-none flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 1 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8 }}
            className="relative w-full aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden shadow-2xl bg-zinc-100 border border-zinc-200/40 dark:border-zinc-800"
          >
            {/* Background image loaded from Unsplash */}
            <img
              src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=800&auto=format&fit=crop"
              alt="Gourmet cooking illustration"
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Floating UI Widget */}
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/10 dark:bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-brand-primary text-white">
                <ChefHat className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70">Tonight&apos;s Suggestion</p>
                <p className="text-sm font-semibold truncate">Garlic Butter Ribeye & Herb Potatoes</p>
              </div>
              <Link href="/recipes/1" className="text-xs font-semibold underline shrink-0 hover:text-brand-primary transition-colors">
                View
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dynamic Recipe Mini-Sandbox */}
      <section className="py-12 border-y border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-3xl px-6 sm:px-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl font-bold font-sans text-zinc-900 dark:text-zinc-50">Interactive AI Preview</h2>
          <p className="text-sm text-zinc-500 mt-2">Select ingredients below and test-drive our AI chef&apos;s creation speed.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Form Side */}
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-bold font-sans flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <Sparkles className="w-5 h-5 text-brand-primary" />
              Choose Ingredients
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {sampleIngredients.map((ing) => {
                const active = selectedIngredients.includes(ing);
                return (
                  <motion.button
                    key={ing}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => toggleIngredient(ing)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-brand-primary text-white shadow-sm"
                        : "bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-350 dark:hover:border-zinc-700"
                    }`}
                  >
                    {ing}
                  </motion.button>
                );
              })}
            </div>

            <Button
              onClick={handleSimulate}
              disabled={selectedIngredients.length === 0 || generating}
              className="mt-2"
            >
              {generating ? "Chef is cooking..." : "Simulate Chef Generation"}
            </Button>
          </div>

          {/* Outcome Side */}
          <div className="relative min-h-[200px] flex items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-950/40">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
                <p className="text-xs text-zinc-400">Measuring ingredients, crafting steps...</p>
              </div>
            ) : simulatedRecipe ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col gap-4 text-left"
              >
                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 font-sans">{simulatedRecipe.title}</h4>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-xs text-zinc-500">{simulatedRecipe.time}</span>
                    <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary text-xs font-semibold">{simulatedRecipe.difficulty}</span>
                  </div>
                </div>
                
                <hr className="border-zinc-100 dark:border-zinc-900" />
                
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Instructions:</p>
                  <ol className="list-decimal list-inside text-xs text-zinc-650 dark:text-zinc-350 space-y-1">
                    {simulatedRecipe.instructions.map((step: string, i: number) => (
                      <li key={i} className="leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </div>

                <Link href="/generator" className="text-xs font-bold text-brand-primary flex items-center gap-1 mt-2 hover:underline">
                  Try the full image-scanner version <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ) : (
              <p className="text-xs text-zinc-400 text-center">Select ingredients on the left to simulate generating a recipe.</p>
            )}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="flex flex-col gap-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold font-sans text-zinc-900 dark:text-zinc-50">Features Engineered to Inspire</h2>
          <p className="text-sm text-zinc-500 mt-2">Everything you need to upgrade your home kitchen, driven by intelligence.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          {/* Card 1 */}
          <motion.div whileHover={{ y: -6 }} className="h-full">
            <Card className="flex flex-col gap-4 group hover:border-brand-primary/40 dark:hover:border-brand-primary/30 h-full">
              <div className="p-3 w-fit rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg font-sans text-zinc-900 dark:text-zinc-50">Pantry Image Scanner</h3>
                <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">Take a photo of your ingredients or cabinet, and watch our AI identify them instantly.</p>
              </div>
            </Card>
          </motion.div>

          {/* Card 2 */}
          <motion.div whileHover={{ y: -6 }} className="h-full">
            <Card className="flex flex-col gap-4 group hover:border-brand-primary/40 dark:hover:border-brand-primary/30 h-full">
              <div className="p-3 w-fit rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-brand-secondary group-hover:bg-brand-secondary group-hover:text-white transition-all duration-300">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg font-sans text-zinc-900 dark:text-zinc-50">AI Chef Assistant</h3>
                <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">Ask questions, adjust spice levels, substitute dairy, or request recipe tips in real time.</p>
              </div>
            </Card>
          </motion.div>

          {/* Card 3 */}
          <motion.div whileHover={{ y: -6 }} className="h-full">
            <Card className="flex flex-col gap-4 group hover:border-brand-primary/40 dark:hover:border-brand-primary/30 h-full">
              <div className="p-3 w-fit rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg font-sans text-zinc-900 dark:text-zinc-50">Weekly Meal Planner</h3>
                <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">Schedule breakfasts, lunches, and dinners, check total nutrition, and export auto-shopping lists.</p>
              </div>
            </Card>
          </motion.div>

          {/* Card 4 */}
          <motion.div whileHover={{ y: -6 }} className="h-full">
            <Card className="flex flex-col gap-4 group hover:border-brand-primary/40 dark:hover:border-brand-primary/30 h-full">
              <div className="p-3 w-fit rounded-2xl bg-purple-50 dark:bg-purple-950/20 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg font-sans text-zinc-900 dark:text-zinc-50">Nutrition & Portion Scaling</h3>
                <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">Instantly recalculate ingredient quantities and view updated calorie, protein, carb counts.</p>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Banner Call-to-action */}
      <section className="bg-gradient-to-tr from-brand-primary via-orange-600 to-amber-500 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-8">
        <div className="flex flex-col gap-3 text-center sm:text-left max-w-xl">
          <h3 className="text-2xl sm:text-3xl font-bold font-sans leading-tight">Ready to Elevate Your Culinary Experience?</h3>
          <p className="text-sm text-white/80 leading-relaxed">Sign up to unlock custom collections, save meal plans, comment on recipes, and create your own cookbook.</p>
        </div>
        <Link href="/auth/signup" className="shrink-0">
          <Button variant="outline" size="lg" className="bg-white border-white text-brand-primary hover:bg-zinc-50 hover:text-orange-700 shadow-md">
            Start Free Account
          </Button>
        </Link>
      </section>
    </div>
  );
}
