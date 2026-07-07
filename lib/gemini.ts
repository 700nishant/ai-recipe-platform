import { GoogleGenerativeAI } from "@google/generative-ai";
import { Recipe, getRecipes } from "./db";
import { getGourmetRecipeImage } from "./images";

interface RawRecipe {
  title?: string;
  description?: string;
  category?: Recipe["category"];
  cuisine?: string;
  difficulty?: Recipe["difficulty"];
  prepTime?: string | number;
  cookTime?: string | number;
  servings?: number;
  imageKeywords?: string[];
  ingredients?: Array<{ name: string; quantity: string }>;
  instructions?: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  recommendations?: {
    lunch?: { title: string; description: string };
    dinner?: { title: string; description: string };
    dessert?: { title: string; description: string };
  };
}

const apiKey = process.env.GEMINI_API_KEY || "";
const hasKey = !!apiKey;
const genAI = hasKey ? new GoogleGenerativeAI(apiKey) : null;

// System instructions for the chef chatbot
const CHEF_SYSTEM_INSTRUCTION = `
You are Chef Gourmet, a friendly, professional, and creative Michelin-starred chef assistant. 
Your goal is to help users cook delicious meals, answer culinary questions, explain kitchen techniques, suggest substitutions, and refine recipes.
Keep your answers engaging, enthusiastic, and highly professional. Use bullet points for steps where appropriate. 
If the user asks something completely unrelated to cooking, food, or kitchen equipment, politely guide the conversation back to culinary topics.
`;

// Helper to sanitize JSON response from Gemini codeblocks
function extractJson(text: string): string {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  return jsonMatch ? jsonMatch[1].trim() : text.trim();
}

function parseQuantity(quantity: string): { amount: number; unit: string } {
  const clean = quantity.trim();
  // Match a leading integer, decimal, or fraction (e.g., 1, 1.5, 1/2)
  const match = clean.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*(.*)$/);
  if (match) {
    const amountStr = match[1];
    const unit = match[2] || "";
    
    let amount = parseFloat(amountStr);
    if (amountStr.includes("/")) {
      const parts = amountStr.split("/");
      amount = parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    
    return {
      amount: isNaN(amount) ? 1 : amount,
      unit: unit.trim()
    };
  }
  
  return {
    amount: 1,
    unit: clean
  };
}

function parseTime(timeStr: string | number): number {
  if (typeof timeStr === "number") return timeStr;
  const match = String(timeStr).match(/^(\d+)/);
  return match ? parseInt(match[1]) : 10;
}

function detectCategory(title: string): "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert" | "Drink" {
  const t = title.toLowerCase();
  
  if (
    t.includes("coffee") || t.includes("tea") || t.includes("chai") || t.includes("lemonade") ||
    t.includes("shake") || t.includes("smoothie") || t.includes("lassi") || t.includes("drink") ||
    t.includes("beverage") || t.includes("juice") || t.includes("mocktail") || t.includes("mojito") ||
    t.includes("water") || t.includes("soda") || t.includes("cooler") || t.includes("smoothy")
  ) {
    return "Drink";
  }

  if (
    t.includes("tiramisu") || t.includes("cheesecake") || t.includes("brownie") || t.includes("cake") ||
    t.includes("panna cotta") || t.includes("pannacotta") || t.includes("dessert") || t.includes("sweet") ||
    t.includes("pie") || t.includes("tart") || t.includes("cookie") || t.includes("cupcake") ||
    t.includes("muffin") || t.includes("pudding") || t.includes("mousse") || t.includes("ice cream") ||
    t.includes("icecream") || t.includes("sorbet") || t.includes("custard") || t.includes("waffle") ||
    t.includes("donut") || t.includes("doughnut") || t.includes("halwa") || t.includes("kheer") ||
    t.includes("gulab jamun") || t.includes("jalebi") || t.includes("rasgulla") || t.includes("pastry")
  ) {
    return "Dessert";
  }

  if (
    t.includes("pancake") || t.includes("waffle") || t.includes("toast") || t.includes("omelette") ||
    t.includes("omelet") || t.includes("scrambled egg") || t.includes("frittata") || t.includes("paratha") ||
    t.includes("oatmeal") || t.includes("porridge") || t.includes("granola") || t.includes("cereal") ||
    t.includes("muesli") || t.includes("hashbrown") || t.includes("crepe") || t.includes("bagel") ||
    t.includes("idli") || t.includes("dosa") || t.includes("upma") || t.includes("poha") ||
    t.includes("croissant")
  ) {
    return "Breakfast";
  }

  if (
    t.includes("wings") || t.includes("fries") || t.includes("nachos") || t.includes("chips") ||
    t.includes("samosa") || t.includes("pakora") || t.includes("bruschetta") || t.includes("spring roll") ||
    t.includes("appetizer") || t.includes("snack") || t.includes("popcorn") || t.includes("sliders") ||
    t.includes("skewers") || t.includes("kebab") || t.includes("tikka")
  ) {
    return "Snack";
  }

  if (t.includes("salad") || t.includes("soup") || t.includes("sandwich") || t.includes("wrap")) {
    return "Lunch";
  }
  
  return "Dinner";
}

function validateRecipe(recipe: RawRecipe, titleQuery: string): string | null {
  const t = (recipe.title || titleQuery).toLowerCase();
  
  const dessertKeywords = ["tiramisu", "cheesecake", "brownie", "cake", "panna cotta", "pannacotta"];
  const matchesDessertKeyword = dessertKeywords.some(kw => t.includes(kw));
  if (matchesDessertKeyword && recipe.category !== "Dessert") {
    return `Category must be "Dessert" because the title contains dessert keywords. Current category: "${recipe.category}".`;
  }

  const drinkKeywords = ["coffee", "lemonade", "juice", "shake", "smoothie", "mojito", "mocktail"];
  const matchesDrinkKeyword = drinkKeywords.some(kw => t.includes(kw));
  if (matchesDrinkKeyword && recipe.category !== "Drink") {
    return `Category must be "Drink" because the title contains beverage keywords. Current category: "${recipe.category}".`;
  }

  const placeholderKeywords = ["main ingredient", "generic vegetables", "generic vegetable", "placeholder", "supporting element", "seasonings & spices", "seasoning & spices", "some spices", "generic spices", "secret ingredient"];
  const ingsList = recipe.ingredients || [];
  for (const ing of ingsList) {
    const ingName = (ing.name || "").toLowerCase();
    if (placeholderKeywords.some(p => ingName.includes(p))) {
      return `Recipe contains placeholder ingredient "${ing.name}". All ingredients must be specific and authentic.`;
    }
  }

  if (t.includes("tiramisu")) {
    const ings = ingsList.map((ing) => (ing.name || "").toLowerCase());
    const hasAuthentic = ings.some((name: string) => name.includes("mascarpone") || name.includes("ladyfinger") || name.includes("lady finger") || name.includes("savoiardi"));
    if (!hasAuthentic) {
      return `Tiramisu recipe is missing authentic ingredients (Mascarpone or Ladyfingers).`;
    }
    const hasSavory = ings.some((name: string) => name.includes("onion") || name.includes("garlic") || name.includes("tomato"));
    if (hasSavory) {
      return `Tiramisu recipe must not contain Onion, Garlic, or Tomato.`;
    }
  }

  return null;
}

// Utility to translate mock recipe data for visual preview
function translateMockRecipe(recipe: Recipe, language: string): Recipe {
  const lang = language.toLowerCase();
  if (lang === "english") return recipe;

  if (lang.includes("hindi") || lang.includes("hi")) {
    if (recipe.id === "mock_paneer") {
      return {
        ...recipe,
        title: "मलाईदार पनीर बटर मसाला",
        description: "एक लोकप्रिय, समृद्ध और मलाईदार उत्तर भारतीय करी जिसमें पनीर के टुकड़े एक मखमली टमाटर-काजू और मक्खन की ग्रेवी में पकाए जाते हैं।",
        ingredients: [
          { name: "पनीर (क्यूब्स में कटा हुआ)", amount: 250, unit: "ग्राम" },
          { name: "मक्खन", amount: 30, unit: "ग्राम" },
          { name: "बारीक कटा हुआ प्याज", amount: 1, unit: "पीस" },
          { name: "अदरक-लहसुन का पेस्ट", amount: 1, unit: "चम्मच" },
          { name: "टमाटर प्यूरी", amount: 1.5, unit: "कप" },
          { name: "काजू (गर्म पानी में भीगे हुए)", amount: 10, unit: "पीस" },
          { name: "गरम मसाला", amount: 1, unit: "चम्मच" },
          { name: "कश्मीरी लाल मिर्च पाउडर", amount: 1, unit: "चम्मच" },
          { name: "ताजा क्रीम", amount: 2, unit: "चम्मच" },
          { name: "कसूरी मेथी", amount: 1, unit: "चम्मच" },
          { name: "नमक", amount: 1, unit: "चम्मच" }
        ],
        instructions: [
          "भीगे हुए काजू को 2 चम्मच पानी के साथ पीसकर एक चिकना काजू पेस्ट तैयार कर लें।",
          "एक भारी तले की कड़ाही में आधा मक्खन (15 ग्राम) पिघलाएं, प्याज डालें और सुनहरा होने तक भूनें।",
          "अदरक-लहसुन का पेस्ट डालें और 2 मिनट तक भूनें जब तक कि कच्ची गंध न चली जाए।",
          "टमाटर प्यूरी, लाल मिर्च और नमक डालें। 8 मिनट तक पकाएं जब तक कि किनारों से मक्खन न छूटने लगे।",
          "काजू का पेस्ट और आधा कप गर्म पानी डालें। 3 मिनट तक धीमी आंच पर पकाएं।",
          "पनीर क्यूब्स, गरम मसाला और बाकी मक्खन डालें। 5 मिनट के लिए ढककर धीमी आंच पर पकाएं।",
          "अंत में कसूरी मेथी को क्रश करके डालें, क्रीम मिलाएं और गर्मागर्म रोटी या नान के साथ परोसें।"
        ]
      };
    }
    return {
      ...recipe,
      title: `${recipe.title} (हिंदी अनुवाद)`,
      description: `${recipe.description} [हिंदी रूपांतरण]`,
      ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        name: `${ing.name} (सामग्री)`,
        unit: ing.unit === "g" ? "ग्राम" : ing.unit === "tbsp" ? "चम्मच" : ing.unit
      })),
      instructions: recipe.instructions.map((step, i) => `${i + 1}. ${step} (विधि)`)
    };
  }

  if (lang.includes("spanish") || lang.includes("es")) {
    if (recipe.id === "mock_paneer") {
      return {
        ...recipe,
        title: "Paneer Butter Masala Cremoso",
        description: "Un curry del norte de la India rico y cremoso hecho con cubos de paneer cocinados en una salsa aterciopelada de tomate y mantequilla.",
        ingredients: [
          { name: "Paneer, en cubos", amount: 250, unit: "g" },
          { name: "Mantequilla", amount: 30, unit: "g" },
          { name: "Cebolla picada", amount: 1, unit: "unidad" },
          { name: "Pasta de ajo y jengibre", amount: 1, unit: "cda" },
          { name: "Puré de tomate", amount: 1.5, unit: "tazas" },
          { name: "Castañas de cajú (anacardos)", amount: 10, unit: "unidades" },
          { name: "Garam Masala", amount: 1, unit: "cdta" },
          { name: "Chile en polvo de Cachemira", amount: 1, unit: "cdta" },
          { name: "Crema de leche fresca", amount: 2, unit: "cdas" },
          { name: "Hojas de fenogreco secas", amount: 1, unit: "cdta" }
        ],
        instructions: [
          "Licúa las castañas de cajú con un poco de agua hasta obtener una pasta suave y cremosa.",
          "Derrite la mitad de la mantequilla en una sartén, agrega cebollas y sofríe hasta que estén transparentes.",
          "Agrega la pasta de ajo y jengibre, cocina por 1 minuto.",
          "Agrega el puré de tomate, chile en polvo y sal. Simula cocinar a fuego lento durante 8-10 minutos.",
          "Agrega la pasta de anacardos y cocina por 2 minutos.",
          "Agrega los cubos de paneer, garam masala y 1/2 taza de agua tibia. Cocina a fuego lento durante 5 minutos.",
          "Finaliza triturando las hojas de fenogreco secas con las manos, agrega crema y la mantequilla restante."
        ]
      };
    }
    return {
      ...recipe,
      title: `${recipe.title} (Traducido)`,
      description: `${recipe.description} [Traducido al Español]`,
      ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        name: `${ing.name} (ingrediente)`,
        unit: ing.unit === "g" ? "g" : ing.unit === "tbsp" ? "cucharadas" : ing.unit
      })),
      instructions: recipe.instructions.map((step) => `Paso: ${step}`)
    };
  }

  if (lang.includes("french") || lang.includes("fr")) {
    return {
      ...recipe,
      title: `${recipe.title} (Traduit)`,
      description: `${recipe.description} [En Français]`,
      ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        name: `${ing.name}`,
        unit: ing.unit === "g" ? "g" : ing.unit === "tbsp" ? "c. à soupe" : ing.unit
      })),
      instructions: recipe.instructions.map((step) => `Étape: ${step}`)
    };
  }

  if (lang.includes("german") || lang.includes("de")) {
    return {
      ...recipe,
      title: `${recipe.title} (Übersetzt)`,
      description: `${recipe.description} [In Deutsch]`,
      ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        name: `${ing.name}`,
        unit: ing.unit === "g" ? "g" : ing.unit === "tbsp" ? "EL" : ing.unit
      })),
      instructions: recipe.instructions.map((step) => `Schritt: ${step}`)
    };
  }

  return recipe;
}

// Generates highly detailed mock recipes for offline testing
function getDetailedMockRecipe(promptText: string, ingredients: string[], diet: string, maxTime: number, language: string): Recipe {
  const normalized = promptText.toLowerCase();
  let baseRecipe: Recipe;

  // ---------- 1. TIRAMISU ----------
  if (normalized.includes("tiramisu")) {
    baseRecipe = {
      id: "mock_tiramisu",
      title: "Classic Italian Tiramisu",
      description: "An elegant, authentic Italian dessert layered with coffee-dipped ladyfingers, rich mascarpone cream, and dusted with fine cocoa powder.",
      image: getGourmetRecipeImage("Tiramisu", "Dessert", ["tiramisu", "dessert"]),
      difficulty: "Medium",
      prepTime: 20, cookTime: 0, servings: 6, category: "Dessert",
      tags: ["Dessert", "Classic", "Italian"],
      cuisine: "Italian",
      imageKeywords: ["tiramisu", "dessert", "italian"],
      nutrition: { calories: 380, protein: 6, carbs: 42, fat: 22 },
      ingredients: [
        { name: "Mascarpone cheese", amount: 250, unit: "g", quantity: "250g" },
        { name: "Ladyfinger cookies (Savoiardi)", amount: 24, unit: "pcs", quantity: "24 cookies" },
        { name: "Strong brewed espresso, cooled", amount: 1, unit: "cup", quantity: "1 cup" },
        { name: "Heavy whipping cream", amount: 1, unit: "cup", quantity: "1 cup" },
        { name: "Granulated sugar", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Unsweetened cocoa powder", amount: 2, unit: "tbsp", quantity: "2 tablespoons" },
        { name: "Vanilla extract", amount: 1, unit: "tsp", quantity: "1 teaspoon" }
      ],
      instructions: [
        "In a large bowl, whisk the heavy cream, sugar, and vanilla extract together until stiff peaks form.",
        "Gently fold the mascarpone cheese into the whipped cream until smooth and combined. Be careful not to overmix.",
        "Quickly dip each ladyfinger cookie into the cooled espresso for 1-2 seconds (do not soak them) and arrange them in a single layer at the bottom of an 8x8 inch dish.",
        "Spread half of the mascarpone cream mixture evenly over the ladyfinger layer.",
        "Dip the remaining ladyfingers in espresso and place them in a second layer on top of the cream.",
        "Spread the remaining mascarpone cream on top and smooth the surface with a spatula.",
        "Dust the top generously with cocoa powder. Refrigerate for at least 4 hours (ideally overnight) before slicing and serving."
      ],
      rating: 4.9, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Avocado Tomato Caprese Sandwich",
          description: "Fresh mozzarella, ripe tomatoes, basil, and avocado drizzled with balsamic glaze on ciabatta bread."
        },
        dinner: {
          title: "Creamy Fettuccine Alfredo",
          description: "Rich, classic Italian pasta tossed in a velvety cream sauce made from butter and Parmesan cheese."
        },
        dessert: {
          title: "Warm Chocolate Lava Cake",
          description: "A decadent chocolate cake with a molten liquid center, served with vanilla bean ice cream."
        }
      }
    };

  // ---------- 2. CHOCOLATE LAVA CAKE ----------
  } else if (normalized.includes("lava cake") || (normalized.includes("chocolate") && normalized.includes("lava"))) {
    baseRecipe = {
      id: "mock_lava_cake",
      title: "Decadent Chocolate Lava Cake",
      description: "A rich, personal-sized chocolate cake with a warm, gooey molten center that flows beautifully when cut.",
      image: getGourmetRecipeImage("Chocolate Lava Cake", "Dessert", ["chocolate", "cake", "dessert"]),
      difficulty: "Medium",
      prepTime: 10, cookTime: 12, servings: 2, category: "Dessert",
      tags: ["Dessert", "Chocolate", "Baking"],
      cuisine: "French",
      imageKeywords: ["chocolate", "cake", "dessert"],
      nutrition: { calories: 420, protein: 5, carbs: 46, fat: 25 },
      ingredients: [
        { name: "High-quality dark chocolate chips", amount: 100, unit: "g", quantity: "100g" },
        { name: "Unsalted butter", amount: 50, unit: "g", quantity: "50g" },
        { name: "Powdered sugar", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Whole eggs", amount: 1, unit: "pc", quantity: "1 whole egg" },
        { name: "Egg yolks", amount: 1, unit: "pc", quantity: "1 egg yolk" },
        { name: "All-purpose flour", amount: 3, unit: "tbsp", quantity: "3 tablespoons" },
        { name: "Salt", amount: 1, unit: "pinch", quantity: "1 pinch" }
      ],
      instructions: [
        "Preheat your oven to 200°C (400°F). Butter two small ramekins generously and dust with cocoa powder or flour.",
        "In a microwave-safe bowl, melt the dark chocolate and butter together in 30-second increments, stirring until completely smooth.",
        "Whisk the powdered sugar, whole egg, egg yolk, and a pinch of salt into the melted chocolate mixture until combined.",
        "Gently fold in the flour using a spatula until the batter is just mixed (do not over-whisk).",
        "Divide the chocolate batter evenly between the two prepared ramekins.",
        "Bake for 11-13 minutes. The edges should be firm and set, but the center should still be soft and slightly jiggly.",
        "Let cool for 2 minutes, then run a knife around the edges, invert onto dessert plates, and serve hot with a scoop of vanilla ice cream."
      ],
      rating: 4.9, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Fresh Greek Salad Bowl",
          description: "Vibrant cucumbers, tomatoes, red onions, olives, and feta cheese tossed with olive oil and oregano."
        },
        dinner: {
          title: "Lemon Herb Grilled Salmon",
          description: "Juicy pan-seared salmon fillets basted with garlic butter and fresh lemon juice, served with asparagus."
        },
        dessert: {
          title: "Mango Panna Cotta",
          description: "A silky, refreshing vanilla cream pudding topped with a sweet tropical mango coulis."
        }
      }
    };

  // ---------- 3. MANGO PANNA COTTA ----------
  } else if (normalized.includes("panna cotta") || normalized.includes("pannacotta")) {
    baseRecipe = {
      id: "mock_panna_cotta",
      title: "Silky Mango Panna Cotta",
      description: "A creamy, melt-in-your-mouth Italian vanilla cream pudding topped with a fresh, vibrant mango puree layer.",
      image: getGourmetRecipeImage("Mango Panna Cotta", "Dessert", ["dessert", "mango"]),
      difficulty: "Easy",
      prepTime: 15, cookTime: 5, servings: 4, category: "Dessert",
      tags: ["Dessert", "Fruit", "Cold Treatment"],
      cuisine: "Italian",
      imageKeywords: ["mango", "dessert", "italian"],
      nutrition: { calories: 290, protein: 4, carbs: 32, fat: 16 },
      ingredients: [
        { name: "Ripe mango puree", amount: 1, unit: "cup", quantity: "1 cup" },
        { name: "Heavy whipping cream", amount: 1, unit: "cup", quantity: "1 cup" },
        { name: "Whole milk", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Granulated sugar", amount: 0.25, unit: "cup", quantity: "1/4 cup" },
        { name: "Gelatin powder (unsweetened)", amount: 2, unit: "tsp", quantity: "2 teaspoons" },
        { name: "Vanilla extract", amount: 1, unit: "tsp", quantity: "1 teaspoon" },
        { name: "Cold water", amount: 3, unit: "tbsp", quantity: "3 tablespoons" }
      ],
      instructions: [
        "In a small bowl, sprinkle the gelatin powder over 3 tablespoons of cold water. Let it bloom and sit undisturbed for 5 minutes.",
        "In a small saucepan, combine heavy cream, whole milk, and sugar. Warm over medium heat, stirring, until the sugar is fully dissolved (do not boil).",
        "Remove the saucepan from the heat, add the bloomed gelatin and vanilla extract, and whisk until the gelatin is completely dissolved.",
        "Divide the cream mixture evenly among 4 glasses or ramekins. Refrigerate for at least 2 hours until the panna cotta is partially set.",
        "Spoon the ripe mango puree in an even layer on top of each chilled cream pudding.",
        "Return the glasses to the refrigerator for another 2 hours until completely set and chilled.",
        "Garnish with a fresh mint leaf and sliced mango before serving cold."
      ],
      rating: 4.8, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Chickpea Salad Wrap",
          description: "Crushed seasoned chickpeas, cucumbers, and spinach stuffed in a warm whole-wheat tortilla wrap."
        },
        dinner: {
          title: "Spicy Punjabi Chole",
          description: "Hearty chickpeas simmered in a rich, deeply spiced onion-tomato gravy, served with basmati rice."
        },
        dessert: {
          title: "Fudgy Chocolate Brownies",
          description: "Dense, decadent brownies baked to fudgy perfection, loaded with dark chocolate chips."
        }
      }
    };

  // ---------- 4. CHEESECAKE ----------
  } else if (normalized.includes("cheesecake")) {
    baseRecipe = {
      id: "mock_cheesecake",
      title: "New York Style Cheesecake",
      description: "A rich, dense, and ultra-creamy classic cheesecake built on a buttery graham cracker crust.",
      image: getGourmetRecipeImage("Cheesecake", "Dessert", ["cheesecake", "dessert"]),
      difficulty: "Medium",
      prepTime: 20, cookTime: 60, servings: 8, category: "Dessert",
      tags: ["Dessert", "Baking", "Cream Cheese"],
      cuisine: "American",
      imageKeywords: ["cheesecake", "dessert", "cake"],
      nutrition: { calories: 450, protein: 7, carbs: 38, fat: 29 },
      ingredients: [
        { name: "Cream cheese, softened", amount: 500, unit: "g", quantity: "500g" },
        { name: "Graham cracker crumbs", amount: 1.5, unit: "cups", quantity: "1.5 cups" },
        { name: "Unsalted butter, melted", amount: 50, unit: "g", quantity: "50g (1/4 cup)" },
        { name: "Granulated sugar", amount: 0.75, unit: "cup", quantity: "3/4 cup" },
        { name: "Sour cream", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Large eggs", amount: 2, unit: "pcs", quantity: "2 eggs" },
        { name: "Vanilla extract", amount: 1, unit: "tsp", quantity: "1 teaspoon" }
      ],
      instructions: [
        "Preheat your oven to 160°C (325°F). Butter a 9-inch springform pan.",
        "In a bowl, mix graham cracker crumbs with melted butter. Press the mixture firmly into the bottom of the pan to form the crust. Bake for 8 minutes, then let cool.",
        "In a large bowl, beat the softened cream cheese and sugar together until completely smooth and creamy.",
        "Mix in the sour cream and vanilla extract.",
        "Add the eggs one at a time, mixing on low speed just until combined (do not over-beat to avoid air bubbles).",
        "Pour the filling over the cooled crust and smooth the top with a spatula.",
        "Bake for 55-60 minutes until the edges are slightly puffed and set, but the center still has a slight wobble.",
        "Turn off the oven, crack the door open slightly, and let the cheesecake cool inside the oven for 1 hour. Refrigerate for at least 4 hours before serving."
      ],
      rating: 4.9, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Avocado Chickpea Salad Bowl",
          description: "Fresh greens, cucumbers, tomatoes, and protein-packed chickpeas tossed in a light lemon vinaigrette."
        },
        dinner: {
          title: "Vegetable Hakka Noodles",
          description: "Wok-tossed stir-fried noodles packed with crisp colorful bell peppers, cabbage, and soy sauce."
        },
        dessert: {
          title: "Italian Espresso Tiramisu",
          description: "A classic dessert layered with coffee-soaked ladyfinger cookies and rich whipped mascarpone cream."
        }
      }
    };

  // ---------- 5. BROWNIE ----------
  } else if (normalized.includes("brownie")) {
    baseRecipe = {
      id: "mock_brownie",
      title: "Fudgy Chocolate Brownies",
      description: "Decadent, rich, and dense chocolate brownies baked to fudgy perfection with a shiny crinkly top.",
      image: getGourmetRecipeImage("Brownie", "Dessert", ["chocolate", "brownie", "dessert"]),
      difficulty: "Easy",
      prepTime: 10, cookTime: 20, servings: 6, category: "Dessert",
      tags: ["Dessert", "Chocolate", "Baking"],
      cuisine: "American",
      imageKeywords: ["chocolate", "brownie", "dessert"],
      nutrition: { calories: 320, protein: 4, carbs: 40, fat: 16 },
      ingredients: [
        { name: "Unsalted butter, melted", amount: 100, unit: "g", quantity: "100g" },
        { name: "Granulated sugar", amount: 1, unit: "cup", quantity: "1 cup" },
        { name: "Eggs", amount: 2, unit: "pcs", quantity: "2 large eggs" },
        { name: "Cocoa powder", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "All-purpose flour", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Chocolate chips", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Vanilla extract", amount: 1, unit: "tsp", quantity: "1 teaspoon" },
        { name: "Salt", amount: 0.25, unit: "tsp", quantity: "1/4 teaspoon" }
      ],
      instructions: [
        "Preheat your oven to 175°C (350°F) and grease or line an 8-inch baking pan with parchment paper.",
        "In a mixing bowl, whisk the melted butter and granulated sugar together vigorously for 1 minute.",
        "Add the eggs and vanilla extract. Whisk for another minute until the mixture becomes pale and slightly thickened.",
        "Sift in the cocoa powder, flour, and salt. Fold gently with a spatula until just combined.",
        "Fold in the chocolate chips.",
        "Spread the thick batter evenly into the prepared baking pan.",
        "Bake for 20-22 minutes. A toothpick inserted in the center should come out with a few moist crumbs, but no wet batter.",
        "Let cool completely in the pan before slicing into squares."
      ],
      rating: 4.8, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Fresh Greek Salad Bowl",
          description: "Crispy cucumbers, cherry tomatoes, Kalamata olives, and feta cheese tossed with olive oil and oregano."
        },
        dinner: {
          title: "Vegetarian Margherita Pizza",
          description: "Thin crust pizza topped with fresh tomato sauce, melted mozzarella, and aromatic basil leaves."
        },
        dessert: {
          title: "Silky Mango Panna Cotta",
          description: "Vanilla cream pudding topped with a sweet tropical mango coulis."
        }
      }
    };

  // ---------- 6. COLD COFFEE ----------
  } else if (normalized.includes("cold coffee") || (normalized.includes("coffee") && normalized.includes("cold"))) {
    baseRecipe = {
      id: "mock_cold_coffee",
      title: "Café Style Creamy Cold Coffee",
      description: "A frothy, rich, and incredibly refreshing blended cold coffee served in a chocolate-drizzled glass.",
      image: getGourmetRecipeImage("Cold Coffee", "Drink", ["coffee", "drink"]),
      difficulty: "Easy",
      prepTime: 5, cookTime: 0, servings: 1, category: "Drink",
      tags: ["Beverage", "Coffee", "Quick & Easy"],
      cuisine: "American",
      imageKeywords: ["coffee", "drink", "beverage"],
      nutrition: { calories: 210, protein: 6, carbs: 26, fat: 9 },
      ingredients: [
        { name: "Instant coffee powder", amount: 1.5, unit: "tsp", quantity: "1.5 teaspoons" },
        { name: "Chilled whole milk", amount: 1, unit: "cup", quantity: "1 cup" },
        { name: "Granulated sugar", amount: 2, unit: "tsp", quantity: "2 teaspoons" },
        { name: "Warm water", amount: 2, unit: "tbsp", quantity: "2 tablespoons" },
        { name: "Chocolate syrup", amount: 1, unit: "tbsp", quantity: "1 tablespoon" },
        { name: "Ice cubes", amount: 4, unit: "pcs", quantity: "4 ice cubes" }
      ],
      instructions: [
        "In a small cup, dissolve the instant coffee powder and sugar in 2 tablespoons of warm water to create a coffee syrup.",
        "Drizzle chocolate syrup along the inside walls of a tall serving glass and place it in the freezer for 2 minutes to set.",
        "In a high-speed blender, combine the coffee syrup, chilled whole milk, and ice cubes.",
        "Blend on high for 30-45 seconds until thick, frothy, and completely smooth.",
        "Pour the cold coffee into the chilled, chocolate-lined glass.",
        "Garnish with a dusting of cocoa powder or a scoop of vanilla ice cream on top, and serve immediately with a straw."
      ],
      rating: 4.8, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Avocado Toast with Poached Egg",
          description: "Seasoned smashed avocado spread on warm sourdough toast, topped with a soft-yolked poached egg."
        },
        dinner: {
          title: "Homestyle Egg Fried Rice",
          description: "Wok-tossed rice stir-fried with scrambled eggs, soy sauce, and spring onions."
        },
        dessert: {
          title: "Warm Chocolate Lava Cake",
          description: "Rich chocolate cake with a gooey molten chocolate center."
        }
      }
    };

  // ---------- 7. LEMONADE ----------
  } else if (normalized.includes("lemonade")) {
    baseRecipe = {
      id: "mock_lemonade",
      title: "Fresh Classic Lemonade",
      description: "A thirst-quenching, classic homemade lemonade made with freshly squeezed lemons, simple syrup, and mint.",
      image: getGourmetRecipeImage("Lemonade", "Drink", ["lemonade", "drink"]),
      difficulty: "Easy",
      prepTime: 5, cookTime: 0, servings: 2, category: "Drink",
      tags: ["Beverage", "Citrus", "Quick & Easy"],
      cuisine: "American",
      imageKeywords: ["lemonade", "drink", "beverage"],
      nutrition: { calories: 80, protein: 0, carbs: 22, fat: 0 },
      ingredients: [
        { name: "Fresh lemon juice", amount: 0.5, unit: "cup", quantity: "1/2 cup (about 3 lemons)" },
        { name: "Cold water", amount: 2.5, unit: "cups", quantity: "2.5 cups" },
        { name: "Sugar", amount: 4, unit: "tbsp", quantity: "4 tablespoons" },
        { name: "Fresh mint leaves", amount: 8, unit: "pcs", quantity: "8 mint leaves" },
        { name: "Ice cubes", amount: 10, unit: "pcs", quantity: "10 ice cubes" }
      ],
      instructions: [
        "In a pitcher, dissolve the sugar in 1/2 cup of warm water to make a simple syrup.",
        "Add the freshly squeezed lemon juice and cold water to the pitcher, stirring well to combine.",
        "Add the fresh mint leaves, pressing them gently with a spoon against the side of the pitcher to release their essential oils.",
        "Fill two tall glasses with ice cubes and pour the lemonade over.",
        "Garnish with a lemon wheel on the rim and serve ice-cold."
      ],
      rating: 4.9, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Fresh Greek Salad Bowl",
          description: "Vibrant Mediterranean salad with cucumbers, tomatoes, feta cheese, and olives."
        },
        dinner: {
          title: "Creamy Chicken Alfredo Pasta",
          description: "Sliced grilled chicken breast tossed with fettuccine pasta in a garlic-Parmesan cream sauce."
        },
        dessert: {
          title: "Fudgy Chocolate Brownies",
          description: "Rich, dense chocolate brownies baked to fudgy perfection."
        }
      }
    };

  // ---------- 8. VEG BIRYANI ----------
  } else if (normalized.includes("veg biryani") || normalized.includes("vegetable biryani") || (normalized.includes("biryani") && !normalized.includes("chicken") && !normalized.includes("mutton"))) {
    baseRecipe = {
      id: "mock_veg_biryani",
      title: "Royal Hyderabadi Veg Biryani",
      description: "An aromatic and authentic layered rice dish featuring spiced mixed vegetables, fragrant Basmati rice, saffron, and fresh herbs cooked on low steam.",
      image: getGourmetRecipeImage("Veg Biryani", "Dinner", ["rice", "biryani", "indian"]),
      difficulty: "Medium",
      prepTime: 25, cookTime: 30, servings: 4, category: "Dinner",
      tags: ["Vegetarian", "Rice", "Spicy", "Indian"],
      cuisine: "Indian",
      imageKeywords: ["rice", "biryani", "indian"],
      nutrition: { calories: 380, protein: 9, carbs: 68, fat: 8 },
      ingredients: [
        { name: "Basmati rice, soaked for 30 mins", amount: 1.5, unit: "cups", quantity: "1.5 cups" },
        { name: "Mixed chopped vegetables (Carrot, Beans, Peas)", amount: 1.5, unit: "cups", quantity: "1.5 cups" },
        { name: "Onion, thinly sliced and deep fried", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Plain yogurt (curd)", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Ginger-Garlic Paste", amount: 1, unit: "tbsp", quantity: "1 tablespoon" },
        { name: "Biryani Masala powder", amount: 1.5, unit: "tbsp", quantity: "1.5 tablespoons" },
        { name: "Ghee (clarified butter)", amount: 2, unit: "tbsp", quantity: "2 tablespoons" },
        { name: "Fresh mint & coriander leaves, chopped", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Saffron dissolved in 2 tbsp warm milk", amount: 1, unit: "pinch", quantity: "1 pinch saffron" },
        { name: "Whole spices (Cardamom, Cloves, Cinnamon)", amount: 1, unit: "tbsp", quantity: "1 tablespoon mixed" }
      ],
      instructions: [
        "Boil 6 cups of water with whole spices and 1 tsp salt. Add soaked Basmati rice and cook until it is 70% done (about 7-8 minutes). Drain and set aside.",
        "In a heavy-bottomed pot, heat ghee. Add ginger-garlic paste and sauté for 1 minute.",
        "Add mixed vegetables, Biryani Masala, and salt. Sauté for 5 minutes.",
        "Lower the heat, stir in the yogurt, and cook for 3 minutes until vegetables are slightly tender.",
        "Layer the partially cooked rice evenly over the vegetable gravy.",
        "Sprinkle fried onions, chopped mint, coriander leaves, and drizzle the saffron milk over the rice.",
        "Cover the pot with a tight lid (seal the edges with foil or dough) and cook on very low heat (dum) for 15 minutes.",
        "Gently fluff the biryani and serve hot with cucumber raita."
      ],
      rating: 4.9, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Cucumber Mint Raita",
          description: "Cooling yogurt mixed with grated cucumbers, roasted cumin, and fresh mint leaves."
        },
        dinner: {
          title: "Creamy Paneer Butter Masala",
          description: "Soft paneer cubes simmered in a velvety tomato-butter gravy."
        },
        dessert: {
          title: "Silky Mango Panna Cotta",
          description: "Silky vanilla cream pudding topped with fresh mango puree."
        }
      }
    };

  // ---------- 9. CHICKEN ALFREDO PASTA ----------
  } else if (normalized.includes("alfredo") || (normalized.includes("pasta") && normalized.includes("chicken"))) {
    baseRecipe = {
      id: "mock_chicken_alfredo",
      title: "Creamy Chicken Alfredo Fettuccine",
      description: "A classic Italian comfort food of fettuccine pasta tossed in a rich, buttery, and garlic-infused Parmesan cream sauce topped with tender sliced grilled chicken breast.",
      image: getGourmetRecipeImage("Chicken Alfredo Pasta", "Dinner", ["pasta", "chicken"]),
      difficulty: "Easy",
      prepTime: 10, cookTime: 15, servings: 2, category: "Dinner",
      tags: ["Pasta", "Chicken", "Creamy", "Italian"],
      cuisine: "Italian",
      imageKeywords: ["pasta", "chicken", "italian"],
      nutrition: { calories: 580, protein: 34, carbs: 54, fat: 26 },
      ingredients: [
        { name: "Fettuccine pasta", amount: 200, unit: "g", quantity: "200g" },
        { name: "Chicken breast, sliced", amount: 250, unit: "g", quantity: "250g" },
        { name: "Heavy whipping cream", amount: 1, unit: "cup", quantity: "1 cup" },
        { name: "Grated Parmesan cheese", amount: 0.5, unit: "cup", quantity: "1/2 cup" },
        { name: "Butter", amount: 2, unit: "tbsp", quantity: "2 tablespoons" },
        { name: "Garlic, minced", amount: 3, unit: "cloves", quantity: "3 cloves" },
        { name: "Olive oil", amount: 1, unit: "tbsp", quantity: "1 tablespoon" },
        { name: "Salt and black pepper", amount: 1, unit: "pinch", quantity: "to taste" }
      ],
      instructions: [
        "Boil the fettuccine pasta in salted water according to package directions. Drain, reserving 1/4 cup of pasta water.",
        "Heat olive oil in a skillet over medium-high heat. Season sliced chicken breast with salt and pepper, and cook for 6-8 minutes until golden and cooked through. Remove chicken from skillet.",
        "In the same skillet, melt the butter over medium heat. Add minced garlic and cook for 1 minute until fragrant.",
        "Pour in the heavy cream and bring to a gentle simmer. Let cook for 3-4 minutes to thicken slightly.",
        "Lower heat to low, whisk in the grated Parmesan cheese until completely melted and smooth.",
        "Add the cooked pasta and sliced chicken back to the skillet. Toss to coat everything evenly in the sauce, adding a splash of reserved pasta water if the sauce is too thick.",
        "Garnish with chopped fresh parsley and serve hot with extra cheese."
      ],
      rating: 4.9, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Fresh Greek Salad Bowl",
          description: "Mediterranean salad with cucumbers, tomatoes, feta cheese, and olives."
        },
        dinner: {
          title: "Homemade Margherita Pizza",
          description: "Classic thin crust pizza topped with mozzarella and fresh basil leaves."
        },
        dessert: {
          title: "Classic Italian Tiramisu",
          description: "Decadent dessert layered with coffee-soaked ladyfingers and sweet mascarpone cream."
        }
      }
    };

  // ---------- 10. GREEK SALAD ----------
  } else if (normalized.includes("greek salad") || (normalized.includes("greek") && normalized.includes("salad"))) {
    baseRecipe = {
      id: "mock_greek_salad",
      title: "Traditional Greek Salad",
      description: "A crisp, refreshing, and authentic Mediterranean salad combining ripe tomatoes, cucumbers, red onions, Kalamata olives, and block feta cheese drizzled with extra virgin olive oil.",
      image: getGourmetRecipeImage("Greek Salad", "Lunch", ["salad", "greek"]),
      difficulty: "Easy",
      prepTime: 10, cookTime: 0, servings: 2, category: "Lunch",
      tags: ["Healthy", "Vegetarian", "Fresh", "Greek"],
      cuisine: "Greek",
      imageKeywords: ["salad", "greek", "fresh"],
      nutrition: { calories: 220, protein: 5, carbs: 10, fat: 18 },
      ingredients: [
        { name: "Cucumber, sliced into half-moons", amount: 1, unit: "pc", quantity: "1 cucumber" },
        { name: "Cherry tomatoes, halved", amount: 1, unit: "cup", quantity: "1 cup cherry tomatoes" },
        { name: "Feta cheese, cubed", amount: 100, unit: "g", quantity: "100g" },
        { name: "Kalamata olives", amount: 10, unit: "pcs", quantity: "10 olives" },
        { name: "Red onion, thinly sliced", amount: 0.25, unit: "pc", quantity: "1/4 red onion" },
        { name: "Extra virgin olive oil", amount: 3, unit: "tbsp", quantity: "3 tablespoons" },
        { name: "Dried oregano", amount: 1, unit: "tsp", quantity: "1 teaspoon" },
        { name: "Salt and black pepper", amount: 1, unit: "pinch", quantity: "to taste" }
      ],
      instructions: [
        "Wash and prepare the vegetables: slice cucumbers into thick half-moons, slice cherry tomatoes in half, and thinly slice the red onion.",
        "In a large salad bowl, combine the sliced cucumbers, tomatoes, and red onions.",
        "Add the Kalamata olives to the bowl.",
        "Add the cubed feta cheese on top of the salad.",
        "Drizzle the extra virgin olive oil evenly over all the ingredients.",
        "Sprinkle the dried oregano, a pinch of salt, and freshly cracked black pepper over the top.",
        "Toss very gently to combine without breaking the feta cheese, and serve fresh."
      ],
      rating: 4.8, reviews: [], isUserCreated: false,
      recommendations: {
        lunch: {
          title: "Hummus & Warm Pita Bread",
          description: "Creamy chickpea dip topped with olive oil and paprika, served with toasted pita bread."
        },
        dinner: {
          title: "Lemon Herb Grilled Salmon",
          description: "Juicy pan-seared salmon fillets basted with garlic butter and fresh lemon juice."
        },
        dessert: {
          title: "Silky Mango Panna Cotta",
          description: "Creamy vanilla pudding finished with tropical mango puree."
        }
      }
    };

  // ---------- PANEER BUTTER MASALA ----------
  } else if (normalized.includes("paneer") || normalized.includes("butter masala")) {
    baseRecipe = {
      id: "mock_paneer",
      title: "Creamy Paneer Butter Masala",
      description: "An authentic, rich, and creamy butter masala curry featuring succulent paneer cubes simmered in a mildly spiced cashew-tomato sauce.",
      image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 15, cookTime: 20, servings: 4, category: "Dinner",
      tags: ["Vegetarian", "Gluten-Free"],
      nutrition: { calories: 390, protein: 14, carbs: 18, fat: 32 },
      ingredients: [
        { name: "Paneer (cottage cheese), cubed", amount: 250, unit: "g" },
        { name: "Butter", amount: 30, unit: "g" },
        { name: "Onion, finely chopped", amount: 1, unit: "pc" },
        { name: "Ginger-Garlic Paste", amount: 1, unit: "tbsp" },
        { name: "Tomato Puree", amount: 1.5, unit: "cups" },
        { name: "Cashews (soaked in warm water)", amount: 10, unit: "pcs" },
        { name: "Garam Masala", amount: 1, unit: "tsp" },
        { name: "Kashmiri Red Chili Powder", amount: 1, unit: "tsp" },
        { name: "Fresh Cream", amount: 2, unit: "tbsp" },
        { name: "Kasuri Methi (dried fenugreek leaves)", amount: 1, unit: "tsp" },
        { name: "Salt", amount: 1, unit: "tsp" }
      ],
      instructions: [
        "Soak cashews in 1/4 cup warm water for 10 minutes, then grind them in a blender into a smooth, thick cashew paste and set aside.",
        "Melt half the butter (15g) in a heavy-bottomed skillet over medium heat. Add chopped onions and sauté for 5-6 minutes until soft and translucent.",
        "Add the ginger-garlic paste. Cook on medium-low heat for 2 minutes, stirring constantly, until the raw aroma disappears.",
        "Pour in the tomato puree, Kashmiri red chili powder, and salt. Cook on medium heat for 8-10 minutes, stirring occasionally, until the gravy reduces and oil separates from the edges.",
        "Whisk in the cashew paste and cook for 2 minutes. Pour in 1/2 cup warm water, stir to combine, and simmer on low for 3 minutes.",
        "Add the paneer cubes, Garam Masala, and remaining butter (15g). Stir gently to avoid breaking the paneer, cover the pan, and simmer on low heat for 5 minutes.",
        "Finish by rubbing kasuri methi between your palms to crush it, sprinkling it into the curry. Swirl in the fresh cream, cook for 1 minute, and serve warm with naan."
      ],
      rating: 4.9, reviews: [], isUserCreated: false
    };

  // ---------- BUTTER CHICKEN ----------
  } else if (normalized.includes("butter chicken") || (normalized.includes("chicken") && !normalized.includes("biryani") && !normalized.includes("tikka") && !normalized.includes("fried") && !normalized.includes("wing"))) {
    baseRecipe = {
      id: "mock_chicken",
      title: "Homestyle Butter Chicken",
      description: "Tender pieces of marinated chicken grilled to smoky perfection and simmered in a rich, buttery, spiced tomato-cream gravy.",
      image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=600&auto=format&fit=crop",
      difficulty: "Medium",
      prepTime: 20, cookTime: 25, servings: 4, category: "Dinner",
      tags: ["High-Protein", "Gluten-Free"],
      nutrition: { calories: 440, protein: 32, carbs: 12, fat: 28 },
      ingredients: [
        { name: "Chicken breasts, cubed", amount: 500, unit: "g" },
        { name: "Yogurt (for marinade)", amount: 0.5, unit: "cup" },
        { name: "Ginger-Garlic Paste", amount: 1.5, unit: "tbsp" },
        { name: "Garam Masala", amount: 2, unit: "tsp" },
        { name: "Kashmiri Red Chili Powder", amount: 2, unit: "tsp" },
        { name: "Lemon Juice", amount: 1, unit: "tbsp" },
        { name: "Tomato Puree", amount: 2, unit: "cups" },
        { name: "Heavy Cream", amount: 0.5, unit: "cup" },
        { name: "Butter", amount: 25, unit: "g" },
        { name: "Salt", amount: 1.25, unit: "tsp" }
      ],
      instructions: [
        "In a bowl, combine chicken cubes with yogurt, 1 tbsp ginger-garlic paste, 1 tsp garam masala, 1 tsp Kashmiri red chili, salt, and lemon juice. Marinate for 20 minutes.",
        "Melt 10g of butter in a large skillet over high heat. Add the marinated chicken pieces and sear for 3-4 minutes on each side until cooked through and slightly charred. Remove and set aside.",
        "In the same skillet, melt the remaining butter (15g). Sauté finely chopped onions for 5 minutes on medium heat until golden.",
        "Add the remaining ginger-garlic paste, garam masala, and red chili powder. Sauté for 1 minute until fragrant.",
        "Add tomato puree and salt. Reduce heat to medium-low and simmer for 10 minutes until the tomato gravy thickens and darkens in color.",
        "Stir in the grilled chicken pieces. Simmer uncovered for 5 minutes to let the chicken absorb the curry flavor.",
        "Lower heat to low, stir in heavy cream, and simmer for 2 more minutes. Garnish with fresh coriander and serve hot."
      ],
      rating: 5.0, reviews: [], isUserCreated: false
    };

  // ---------- BIRYANI ----------
  } else if (normalized.includes("biryani")) {
    baseRecipe = {
      id: "mock_biryani",
      title: "Aromatic Chicken Biryani",
      description: "Layers of fragrant basmati rice and spiced chicken cooked together with caramelized onions, saffron milk, and fresh mint leaves.",
      image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=600&auto=format&fit=crop",
      difficulty: "Medium",
      prepTime: 30, cookTime: 40, servings: 4, category: "Dinner",
      tags: ["High-Protein", "Gluten-Free"],
      nutrition: { calories: 520, protein: 28, carbs: 62, fat: 18 },
      ingredients: [
        { name: "Basmati rice (soaked 30 mins)", amount: 2, unit: "cups" },
        { name: "Chicken pieces (bone-in)", amount: 600, unit: "g" },
        { name: "Yogurt", amount: 0.5, unit: "cup" },
        { name: "Onions, thinly sliced", amount: 2, unit: "pcs" },
        { name: "Ginger-Garlic Paste", amount: 2, unit: "tbsp" },
        { name: "Biryani Masala", amount: 2, unit: "tbsp" },
        { name: "Saffron soaked in warm milk", amount: 2, unit: "tbsp" },
        { name: "Fresh Mint Leaves", amount: 0.5, unit: "cup" },
        { name: "Ghee (clarified butter)", amount: 3, unit: "tbsp" },
        { name: "Whole Spices (bay leaf, cloves, cardamom, cinnamon)", amount: 1, unit: "set" },
        { name: "Salt", amount: 2, unit: "tsp" }
      ],
      instructions: [
        "Marinate chicken with yogurt, ginger-garlic paste, biryani masala, and salt. Rest for 30 minutes at room temperature.",
        "In a large heavy-bottomed pot, heat 2 tbsp ghee over medium-high heat. Add sliced onions and fry for 12-15 minutes, stirring often, until deep golden brown and crispy. Remove half and set aside for garnish.",
        "In the same pot with remaining onions, add the marinated chicken. Cook on high heat for 5 minutes, then medium heat for 15 minutes until chicken is 80% cooked and the oil separates.",
        "Meanwhile, boil water in a large pot with salt and whole spices. Add soaked basmati rice and parboil for exactly 7 minutes (rice should be 70% cooked). Drain immediately.",
        "Layer the parboiled rice evenly over the chicken in the pot. Drizzle saffron milk and remaining 1 tbsp ghee over the rice.",
        "Scatter fresh mint leaves and fried onions over the rice. Seal the pot with a tight lid or aluminum foil and reduce heat to the lowest setting. Cook on dum (steam) for 20 minutes.",
        "Open, gently mix the bottom layer with rice using a fork, and serve with raita and sliced onions."
      ],
      rating: 4.9, reviews: [], isUserCreated: false
    };

  // ---------- SPAGHETTI / PASTA ----------
  } else if (normalized.includes("carbonara") || normalized.includes("pasta") || normalized.includes("spaghetti")) {
    baseRecipe = {
      id: "mock_pasta",
      title: "Authentic Spaghetti Carbonara",
      description: "A classic Roman pasta dish made with spaghetti, crispy guanciale, creamy egg yolks, freshly grated Pecorino Romano, and cracked black pepper.",
      image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=600&auto=format&fit=crop",
      difficulty: "Medium",
      prepTime: 10, cookTime: 15, servings: 2, category: "Dinner",
      tags: ["Classic"],
      nutrition: { calories: 590, protein: 24, carbs: 70, fat: 26 },
      ingredients: [
        { name: "Spaghetti Pasta", amount: 200, unit: "g" },
        { name: "Guanciale or Pancetta, cubed", amount: 100, unit: "g" },
        { name: "Fresh Egg Yolks", amount: 3, unit: "pcs" },
        { name: "Whole Fresh Egg", amount: 1, unit: "pc" },
        { name: "Pecorino Romano Cheese, grated", amount: 50, unit: "g" },
        { name: "Freshly Cracked Black Pepper", amount: 1, unit: "tsp" },
        { name: "Salt (for pasta water)", amount: 1.5, unit: "tbsp" }
      ],
      instructions: [
        "Bring a large pot of water (about 3 liters) to a rolling boil. Add salt, then add spaghetti. Cook until 1 minute before al dente.",
        "While pasta cooks, heat a large skillet over medium heat. Add guanciale cubes and cook for 5-7 minutes until the fat renders and the guanciale becomes crispy and golden. Turn off heat.",
        "In a medium bowl, whisk egg yolks and the whole egg. Stir in grated Pecorino Romano and cracked black pepper until a thick, creamy paste forms.",
        "Reserve 1/2 cup of hot pasta cooking water, then drain the spaghetti.",
        "Add the drained spaghetti directly into the skillet with guanciale. Toss for 1 minute off the heat to cool slightly.",
        "Pour the egg-cheese mixture over the pasta. Toss and stir rapidly. Add 2-3 tbsp of reserved pasta water to create a smooth, glossy sauce.",
        "Serve immediately topped with extra Pecorino and freshly cracked pepper."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- OREO SHAKE ----------
  } else if (normalized.includes("oreo")) {
    baseRecipe = {
      id: "mock_oreo_shake",
      title: "Thick & Creamy Oreo Milkshake",
      description: "A rich, indulgent Oreo milkshake blended with vanilla ice cream, whole milk, and crushed Oreo cookies — topped with whipped cream.",
      image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 5, cookTime: 0, servings: 2, category: "Dessert",
      tags: ["Quick & Easy", "Sweet Treat", "Beverage"],
      nutrition: { calories: 480, protein: 8, carbs: 65, fat: 20 },
      ingredients: [
        { name: "Oreo cookies", amount: 10, unit: "pcs" },
        { name: "Vanilla ice cream", amount: 4, unit: "scoops" },
        { name: "Whole milk (chilled)", amount: 1.5, unit: "cups" },
        { name: "Whipped cream", amount: 0.5, unit: "cup" },
        { name: "Chocolate syrup (for garnish)", amount: 2, unit: "tbsp" },
        { name: "Granulated sugar (optional)", amount: 1, unit: "tbsp" }
      ],
      instructions: [
        "Chill your serving glasses in the freezer for 5 minutes so the shake stays cold longer.",
        "Separate 8 Oreo cookies and place them into a blender. Crush 2 extra Oreos by hand and set aside for garnish.",
        "Add 4 scoops of vanilla ice cream and 1.5 cups of chilled whole milk to the blender with the Oreos.",
        "Blend on high speed for 30-45 seconds until completely smooth, thick, and creamy. Taste and add sugar if needed.",
        "Remove the glasses from the freezer. Drizzle chocolate syrup along the inner walls of the glasses for a restaurant-style finish.",
        "Pour the Oreo shake into the glasses. Top with a generous swirl of whipped cream, crushed Oreo pieces, and an extra whole Oreo cookie. Serve immediately with a wide straw."
      ],
      rating: 4.9, reviews: [], isUserCreated: false
    };

  // ---------- MANGO LASSI ----------
  } else if (normalized.includes("lassi") || normalized.includes("mango lassi")) {
    baseRecipe = {
      id: "mock_mango_lassi",
      title: "Chilled Mango Lassi",
      description: "A refreshing Indian yogurt-based mango drink blended with ripe Alphonso mangoes, chilled yogurt, and a hint of cardamom.",
      image: "https://images.unsplash.com/photo-1527826854070-3f1d5e27f040?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 5, cookTime: 0, servings: 2, category: "Dessert",
      tags: ["Vegetarian", "Quick & Easy", "Beverage", "Healthy"],
      nutrition: { calories: 220, protein: 6, carbs: 40, fat: 4 },
      ingredients: [
        { name: "Ripe mango pulp (Alphonso or Kesar)", amount: 1, unit: "cup" },
        { name: "Full-fat yogurt (chilled)", amount: 1.5, unit: "cups" },
        { name: "Whole milk (chilled)", amount: 0.5, unit: "cup" },
        { name: "Sugar or honey", amount: 2, unit: "tbsp" },
        { name: "Cardamom powder", amount: 0.25, unit: "tsp" },
        { name: "Ice cubes", amount: 6, unit: "pcs" },
        { name: "Saffron (optional, for garnish)", amount: 1, unit: "pinch" }
      ],
      instructions: [
        "If using fresh mango, peel and chop the ripe mango into chunks. For canned mango pulp, measure 1 cup directly.",
        "Add the mango pulp, chilled yogurt, cold milk, sugar, cardamom powder, and ice cubes to a blender.",
        "Blend on high speed for 45-60 seconds until completely smooth and frothy. Taste and adjust sweetness.",
        "Pour into tall chilled glasses. Garnish with a few saffron strands soaked in warm milk and a small piece of mango on the rim.",
        "Serve immediately for the freshest, most refreshing flavour."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- DALGONA / COLD COFFEE / ICED COFFEE ----------
  } else if (normalized.includes("dalgona") || normalized.includes("cold coffee") || normalized.includes("iced coffee") || normalized.includes("cold brew")) {
    baseRecipe = {
      id: "mock_dalgona_coffee",
      title: "Dalgona Whipped Cold Coffee",
      description: "A trendy, velvety whipped coffee cloud made from instant coffee, sugar, and hot water — spooned over a glass of chilled milk and ice.",
      image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 8, cookTime: 0, servings: 2, category: "Breakfast",
      tags: ["Quick & Easy", "Beverage", "Caffeine"],
      nutrition: { calories: 180, protein: 5, carbs: 28, fat: 5 },
      ingredients: [
        { name: "Instant coffee powder (Nescafé or similar)", amount: 2, unit: "tbsp" },
        { name: "Granulated sugar", amount: 2, unit: "tbsp" },
        { name: "Hot water", amount: 2, unit: "tbsp" },
        { name: "Whole milk or oat milk (chilled)", amount: 1.5, unit: "cups" },
        { name: "Ice cubes", amount: 8, unit: "pcs" },
        { name: "Cocoa powder or cinnamon (for garnish, optional)", amount: 1, unit: "pinch" }
      ],
      instructions: [
        "In a medium mixing bowl, combine instant coffee powder, sugar, and hot water in equal ratios (2 tbsp each).",
        "Using a hand electric whisk or a manual whisk, beat the mixture vigorously on high speed for 3-5 minutes until it transforms into a thick, glossy, caramel-coloured whipped foam that holds stiff peaks.",
        "Fill two tall glasses with ice cubes. Pour chilled milk (or oat milk) into each glass, filling about 3/4 of the way.",
        "Using a spoon, gently dollop the whipped coffee foam on top of the milk in each glass. Make a generous, cloud-like mound.",
        "Optional: dust lightly with cocoa powder or cinnamon for extra flavour and presentation.",
        "Stir the coffee cloud into the milk just before drinking to swirl together the creamy and bold flavours. Serve with a straw."
      ],
      rating: 4.9, reviews: [], isUserCreated: false
    };

  // ---------- HOT COFFEE / ESPRESSO / CAPPUCCINO / LATTE ----------
  } else if (normalized.includes("coffee") || normalized.includes("espresso") || normalized.includes("cappuccino") || normalized.includes("latte") || normalized.includes("mocha") || normalized.includes("americano")) {
    baseRecipe = {
      id: "mock_coffee",
      title: "Perfect Homemade Cappuccino",
      description: "A barista-quality cappuccino made at home with a rich double espresso shot, silky steamed milk, and a thick, velvety microfoam crown.",
      image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 5, cookTime: 3, servings: 1, category: "Breakfast",
      tags: ["Quick & Easy", "Beverage", "Caffeine"],
      nutrition: { calories: 120, protein: 6, carbs: 10, fat: 4 },
      ingredients: [
        { name: "Finely ground espresso coffee beans (or instant espresso)", amount: 18, unit: "g" },
        { name: "Whole milk (full-fat, chilled for best foam)", amount: 120, unit: "ml" },
        { name: "Hot water (for espresso, 90°C)", amount: 60, unit: "ml" },
        { name: "Sugar (optional, to taste)", amount: 1, unit: "tsp" },
        { name: "Cocoa powder or cinnamon (for garnish)", amount: 1, unit: "pinch" }
      ],
      instructions: [
        "Warm your coffee cup by rinsing it with hot water. This prevents the espresso from cooling too quickly.",
        "Brew a double espresso: if using a moka pot, fill the bottom chamber with hot water (90°C, just below boiling), add ground coffee to the filter basket without pressing. Brew on medium heat for 4-5 minutes until the coffee begins to bubble up. If using instant, dissolve 2 tsp instant espresso powder in 60ml hot water.",
        "Pour the brewed espresso into your warm cup. It should have a golden-brown crema layer on top.",
        "Heat milk in a small saucepan over medium heat until steam just begins to rise (about 65°C — do not boil). Alternatively, microwave for 40-50 seconds.",
        "Froth the milk: use a handheld milk frother and move it in circular and up-down motions near the surface for 20-30 seconds until a thick, velvety microfoam forms with fine bubbles.",
        "Pour the steamed milk into the espresso in a slow, circular motion to create latte art. Spoon the thick foam on top to form a generous crown.",
        "Dust with a pinch of cocoa powder or cinnamon. Serve immediately while hot."
      ],
      rating: 4.9, reviews: [], isUserCreated: false
    };

  // ---------- MASALA CHAI / TEA ----------
  } else if (normalized.includes("chai") || normalized.includes("tea") || normalized.includes("masala chai") || normalized.includes("masala tea") || normalized.includes("ginger tea")) {
    baseRecipe = {
      id: "mock_masala_chai",
      title: "Authentic Masala Chai",
      description: "A warming, aromatic Indian spiced tea brewed with fresh ginger, cardamom, cinnamon, and cloves in whole milk for a rich, soul-comforting cup.",
      image: "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 2, cookTime: 8, servings: 2, category: "Breakfast",
      tags: ["Vegetarian", "Quick & Easy", "Beverage", "Healthy"],
      nutrition: { calories: 90, protein: 4, carbs: 10, fat: 4 },
      ingredients: [
        { name: "Water", amount: 1, unit: "cup" },
        { name: "Whole milk", amount: 1, unit: "cup" },
        { name: "Loose-leaf black tea (or 2 tea bags)", amount: 2, unit: "tsp" },
        { name: "Fresh ginger, grated or sliced", amount: 1, unit: "inch" },
        { name: "Green cardamom pods, lightly crushed", amount: 4, unit: "pcs" },
        { name: "Cinnamon stick", amount: 0.5, unit: "pc" },
        { name: "Cloves", amount: 2, unit: "pcs" },
        { name: "Black pepper corns (optional)", amount: 2, unit: "pcs" },
        { name: "Sugar or jaggery", amount: 2, unit: "tsp" }
      ],
      instructions: [
        "In a small saucepan, add 1 cup of water. Add freshly grated ginger, crushed cardamom pods, cinnamon stick, and cloves. Bring to a boil over medium-high heat.",
        "Once boiling, reduce heat to medium and let the spices simmer in the water for 2-3 minutes until the water turns a light amber and becomes intensely fragrant.",
        "Add the black tea leaves (or tea bags) to the simmering spiced water. Brew for exactly 1 minute on medium heat — do not overbrew or the tea turns bitter.",
        "Pour in 1 cup of whole milk. Stir to combine. Increase heat to medium-high and bring the chai to a full rolling boil.",
        "As soon as it boils and rises, reduce heat and let it simmer for 2 more minutes. This allows the tea to fully infuse into the milk for a strong, creamy cup.",
        "Add sugar or jaggery to taste. Stir until dissolved.",
        "Strain the chai through a fine mesh strainer into two cups. Serve immediately, piping hot."
      ],
      rating: 4.9, reviews: [], isUserCreated: false
    };

  // ---------- JUICE / LEMONADE / NIMBU PANI ----------
  } else if (normalized.includes("juice") || normalized.includes("lemonade") || normalized.includes("nimbu pani") || normalized.includes("nimbu") || normalized.includes("lemon water")) {
    baseRecipe = {
      id: "mock_lemonade",
      title: "Sparkling Indian Nimbu Pani (Fresh Lemonade)",
      description: "A refreshing Indian-style lemonade with freshly squeezed lemon juice, black salt, roasted cumin, and chilled sparkling water for a fizzy kick.",
      image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 5, cookTime: 0, servings: 2, category: "Breakfast",
      tags: ["Vegan", "Quick & Easy", "Beverage", "Healthy", "Gluten-Free"],
      nutrition: { calories: 40, protein: 0, carbs: 10, fat: 0 },
      ingredients: [
        { name: "Fresh lemons", amount: 3, unit: "pcs" },
        { name: "Water or sparkling water (chilled)", amount: 2, unit: "cups" },
        { name: "Sugar or honey", amount: 2, unit: "tbsp" },
        { name: "Black salt (kala namak)", amount: 0.25, unit: "tsp" },
        { name: "Roasted cumin powder", amount: 0.25, unit: "tsp" },
        { name: "Fresh mint leaves", amount: 8, unit: "pcs" },
        { name: "Ice cubes", amount: 10, unit: "pcs" }
      ],
      instructions: [
        "Roll the lemons firmly on a countertop with your palm before cutting — this helps to release more juice.",
        "Juice all 3 lemons using a citrus squeezer or by hand. Strain out any seeds. You should have about 5-6 tbsp of fresh lemon juice.",
        "In a small bowl or cup, mix the lemon juice with sugar (or honey) until the sugar fully dissolves — about 1 minute of stirring. This creates a lemon syrup base.",
        "Add black salt and roasted cumin powder to the syrup. Stir well — these spices are the secret to authentic nimbu pani.",
        "Fill two tall glasses with ice cubes. Pour 1 cup of chilled sparkling water (or plain water) into each glass.",
        "Divide the lemon syrup between the two glasses. Stir gently to combine without losing too much fizz.",
        "Garnish with fresh mint leaves and a lemon wheel on the rim. Taste and adjust salt or sweetness. Serve immediately ice-cold."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- GENERAL SHAKE / SMOOTHIE ----------
  } else if (normalized.includes("shake") || normalized.includes("smoothie") || normalized.includes("drink") || normalized.includes("beverage")) {
    const titleText = promptText || "Gourmet Shake";
    baseRecipe = {
      id: "mock_shake_" + Math.random().toString(36).substring(2, 5),
      title: titleText.charAt(0).toUpperCase() + titleText.slice(1),
      description: `A thick, creamy, and delicious ${titleText} blended to smooth perfection.`,
      image: getGourmetRecipeImage(titleText),
      difficulty: "Easy",
      prepTime: 5, cookTime: 0, servings: 2, category: "Dessert",
      tags: ["Quick & Easy", "Beverage", "Sweet Treat"],
      nutrition: { calories: 380, protein: 7, carbs: 52, fat: 14 },
      ingredients: [
        { name: "Main flavour base (fruits, chocolate, etc.)", amount: 1, unit: "cup" },
        { name: "Vanilla ice cream", amount: 3, unit: "scoops" },
        { name: "Whole milk (chilled)", amount: 1.5, unit: "cups" },
        { name: "Sugar or honey", amount: 1, unit: "tbsp" },
        { name: "Whipped cream (for topping)", amount: 0.5, unit: "cup" }
      ],
      instructions: [
        "Chill your glasses in the freezer for 5 minutes before starting.",
        "Add the flavour base, ice cream, chilled milk, and sugar into a high-speed blender.",
        "Blend on high speed for 30-45 seconds until thick and smooth. Adjust consistency by adding more milk if needed.",
        "Pour into chilled glasses, top with whipped cream and your choice of garnish, and serve immediately."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- PIZZA ----------
  } else if (normalized.includes("pizza")) {
    baseRecipe = {
      id: "mock_pizza",
      title: "Homemade Margherita Pizza",
      description: "A classic Neapolitan-style pizza with a hand-stretched thin crust, rich tomato sauce, fresh mozzarella, and fragrant basil leaves.",
      image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=600&auto=format&fit=crop",
      difficulty: "Medium",
      prepTime: 30, cookTime: 15, servings: 2, category: "Dinner",
      tags: ["Vegetarian", "Classic"],
      nutrition: { calories: 560, protein: 18, carbs: 78, fat: 20 },
      ingredients: [
        { name: "Pizza dough (store-bought or homemade)", amount: 250, unit: "g" },
        { name: "Tomato passata or crushed tomatoes", amount: 0.75, unit: "cup" },
        { name: "Fresh mozzarella, sliced", amount: 150, unit: "g" },
        { name: "Fresh basil leaves", amount: 10, unit: "pcs" },
        { name: "Extra virgin olive oil", amount: 2, unit: "tbsp" },
        { name: "Garlic, minced", amount: 2, unit: "cloves" },
        { name: "Salt and black pepper", amount: 1, unit: "pinch" },
        { name: "Dried oregano", amount: 0.5, unit: "tsp" }
      ],
      instructions: [
        "Preheat your oven to its maximum temperature (250°C / 480°F) for at least 30 minutes with a pizza stone or baking tray inside.",
        "Mix tomato passata with minced garlic, a pinch of salt, and dried oregano to make the sauce. Set aside.",
        "On a lightly floured surface, stretch or roll the pizza dough into a 10-12 inch round, keeping the edges slightly thicker.",
        "Transfer the dough to a piece of parchment paper. Spread the tomato sauce evenly leaving a 1-inch border for the crust.",
        "Tear the fresh mozzarella and distribute it evenly over the sauce. Drizzle with 1 tbsp of olive oil.",
        "Slide the pizza (on parchment) onto the hot baking stone. Bake for 10-13 minutes until the crust is golden and the cheese is bubbling and lightly browned.",
        "Remove from oven, immediately scatter fresh basil leaves, drizzle remaining olive oil, slice into 6 pieces, and serve hot."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- CHOCOLATE CAKE / BROWNIE / BAKING ----------
  } else if (normalized.includes("chocolate cake") || normalized.includes("choco cake")) {
    baseRecipe = {
      id: "mock_choco_cake",
      title: "Rich Moist Chocolate Cake",
      description: "A deep, decadent chocolate layer cake with moist crumb, fudgy ganache frosting, and a touch of espresso to intensify the chocolate flavour.",
      image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=600&auto=format&fit=crop",
      difficulty: "Medium",
      prepTime: 20, cookTime: 30, servings: 8, category: "Dessert",
      tags: ["Baking", "Sweet Treat", "Chocolate"],
      nutrition: { calories: 420, protein: 6, carbs: 58, fat: 18 },
      ingredients: [
        { name: "All-purpose flour", amount: 1.75, unit: "cups" },
        { name: "Unsweetened cocoa powder", amount: 0.75, unit: "cup" },
        { name: "Granulated sugar", amount: 2, unit: "cups" },
        { name: "Baking soda", amount: 1.5, unit: "tsp" },
        { name: "Baking powder", amount: 1.5, unit: "tsp" },
        { name: "Salt", amount: 1, unit: "tsp" },
        { name: "Eggs", amount: 2, unit: "pcs" },
        { name: "Buttermilk", amount: 1, unit: "cup" },
        { name: "Vegetable oil", amount: 0.5, unit: "cup" },
        { name: "Vanilla extract", amount: 2, unit: "tsp" },
        { name: "Hot espresso or strong coffee", amount: 1, unit: "cup" },
        { name: "Dark chocolate (for ganache)", amount: 200, unit: "g" },
        { name: "Heavy cream (for ganache)", amount: 0.75, unit: "cup" }
      ],
      instructions: [
        "Preheat oven to 175°C (350°F). Grease two 9-inch round cake pans and line the bottoms with parchment paper.",
        "Sift together flour, cocoa powder, sugar, baking soda, baking powder, and salt into a large mixing bowl.",
        "In another bowl, whisk eggs, buttermilk, oil, and vanilla extract until combined.",
        "Pour the wet ingredients into the dry ingredients. Mix until just combined, then slowly stir in the hot espresso. The batter will be thin — this is correct.",
        "Divide the batter evenly between the two prepared pans. Bake for 28-32 minutes, or until a toothpick inserted in the center comes out clean.",
        "Cool in pans for 10 minutes, then turn out onto a wire rack and cool completely (about 1 hour).",
        "To make the ganache: heat heavy cream until just simmering, pour over chopped dark chocolate, let sit for 2 minutes, then stir until smooth. Cool for 10 minutes until spreadable.",
        "Place one cake layer on a plate. Spread a generous layer of ganache. Top with second layer, then pour remaining ganache over the top and sides. Slice and serve."
      ],
      rating: 4.9, reviews: [], isUserCreated: false
    };

  // ---------- CAKE / BROWNIE / OTHER BAKED ----------
  } else if (normalized.includes("cake") || normalized.includes("brownie") || normalized.includes("muffin") || normalized.includes("cookie") || normalized.includes("cupcake") || normalized.includes("dessert") || normalized.includes("sweet") || normalized.includes("pie") || normalized.includes("tart")) {
    const titleText = promptText || "Gourmet Sweet Creation";
    baseRecipe = {
      id: "mock_cake_" + Math.random().toString(36).substring(2, 5),
      title: titleText.charAt(0).toUpperCase() + titleText.slice(1),
      description: `A delicious, moist, and perfectly baked ${titleText} finished with chef's premium toppings.`,
      image: getGourmetRecipeImage(titleText),
      difficulty: "Medium",
      prepTime: 15, cookTime: 25, servings: 6, category: "Dessert",
      tags: ["Baking", "Sweet Treat", "Decadent"],
      nutrition: { calories: 380, protein: 5, carbs: 52, fat: 14 },
      ingredients: [
        { name: "All-purpose flour", amount: 1.5, unit: "cups" },
        { name: "Granulated sugar", amount: 1, unit: "cup" },
        { name: "Unsalted butter (melted)", amount: 100, unit: "g" },
        { name: "Large eggs", amount: 2, unit: "pcs" },
        { name: "Baking powder", amount: 1.5, unit: "tsp" },
        { name: "Vanilla extract", amount: 1, unit: "tsp" },
        { name: "Salt", amount: 0.25, unit: "tsp" },
        { name: "Chocolate chips or frosting", amount: 0.5, unit: "cup" }
      ],
      instructions: [
        "Preheat oven to 175°C (350°F). Grease your baking dish and line with parchment paper.",
        "Sift together flour, sugar, baking powder, and salt in a large mixing bowl.",
        "In a separate bowl, whisk together melted butter, eggs, and vanilla extract until emulsified.",
        "Fold the wet mixture into the dry ingredients with a rubber spatula until just combined. Do not over-mix.",
        "Pour batter into the prepared pan, leveling the top. Sprinkle chocolate chips on top if desired.",
        "Bake for 22-25 minutes, or until a toothpick inserted in the center comes out clean.",
        "Cool in the pan for 10 minutes on a wire rack, then slice, garnish with icing sugar or frosting, and serve."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- FRIED RICE / EGG FRIED RICE ----------
  } else if (normalized.includes("fried rice") || normalized.includes("egg fried rice")) {
    baseRecipe = {
      id: "mock_fried_rice",
      title: "Restaurant-Style Egg Fried Rice",
      description: "Fluffy day-old rice stir-fried on high heat with scrambled eggs, spring onions, soy sauce, and a drizzle of sesame oil for authentic wok flavour.",
      image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 5, cookTime: 10, servings: 2, category: "Lunch",
      tags: ["Quick & Easy", "Vegetarian"],
      nutrition: { calories: 380, protein: 12, carbs: 58, fat: 10 },
      ingredients: [
        { name: "Cooked rice (day-old, chilled)", amount: 2, unit: "cups" },
        { name: "Eggs", amount: 3, unit: "pcs" },
        { name: "Spring onions, finely sliced", amount: 3, unit: "stalks" },
        { name: "Soy sauce", amount: 2, unit: "tbsp" },
        { name: "Sesame oil", amount: 1, unit: "tsp" },
        { name: "Garlic, minced", amount: 3, unit: "cloves" },
        { name: "Vegetable or sesame oil (for wok)", amount: 2, unit: "tbsp" },
        { name: "White pepper powder", amount: 0.5, unit: "tsp" },
        { name: "Salt", amount: 0.5, unit: "tsp" }
      ],
      instructions: [
        "Use day-old chilled rice for best results — fresh rice is too moist. Break up any clumps with your hands before cooking.",
        "Heat a wok or large non-stick skillet over the highest heat possible for 2 minutes until very hot and slightly smoking.",
        "Add 2 tbsp oil, then pour in beaten eggs. Scramble vigorously on high heat for 30 seconds until just set but still slightly soft. Push to the side.",
        "Add minced garlic to the empty side of the wok. Stir-fry for 15 seconds until fragrant.",
        "Add the cold rice to the wok. Spread it in an even layer and press down. Let it sit undisturbed on high heat for 1 minute to get slightly crispy.",
        "Toss everything together. Add soy sauce and white pepper. Stir-fry tossing constantly for 2-3 minutes until every grain is coated and hot.",
        "Drizzle sesame oil, add spring onions, toss one final time, taste for salt, and serve immediately."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- OMELETTE / MASALA OMELETTE ----------
  } else if (normalized.includes("omelette") || normalized.includes("omelet") || normalized.includes("masala egg")) {
    baseRecipe = {
      id: "mock_omelette",
      title: "Spicy Indian Masala Omelette",
      description: "A fluffy, golden Indian-style omelette packed with onions, tomatoes, green chilies, fresh coriander, and a sprinkle of warm spices.",
      image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 5, cookTime: 6, servings: 1, category: "Breakfast",
      tags: ["Quick & Easy", "High-Protein", "Vegetarian"],
      nutrition: { calories: 220, protein: 14, carbs: 6, fat: 14 },
      ingredients: [
        { name: "Eggs", amount: 3, unit: "pcs" },
        { name: "Onion, finely chopped", amount: 0.25, unit: "pc" },
        { name: "Tomato, finely chopped", amount: 0.5, unit: "pc" },
        { name: "Green chili, finely chopped", amount: 1, unit: "pc" },
        { name: "Fresh coriander, chopped", amount: 2, unit: "tbsp" },
        { name: "Turmeric powder", amount: 0.25, unit: "tsp" },
        { name: "Red chili powder", amount: 0.25, unit: "tsp" },
        { name: "Salt", amount: 0.5, unit: "tsp" },
        { name: "Butter or oil", amount: 1, unit: "tbsp" }
      ],
      instructions: [
        "Crack the eggs into a bowl. Add salt, turmeric, red chili powder, and a splash of water (2 tsp). Whisk vigorously for 1 minute until frothy and well combined.",
        "Add the finely chopped onion, tomato, green chili, and coriander to the egg mixture. Mix together.",
        "Heat a non-stick pan over medium heat. Add butter or oil and let it melt and coat the pan evenly.",
        "Pour the egg mixture into the pan. Let it spread naturally. Cook undisturbed on medium-low heat for 2-3 minutes until the edges are set but the center is still slightly soft.",
        "Gently fold the omelette in half using a spatula. Cook for 1 more minute until golden on the outside.",
        "Slide onto a plate, garnish with extra fresh coriander, and serve immediately with toast or paratha."
      ],
      rating: 4.7, reviews: [], isUserCreated: false
    };

  // ---------- AVOCADO TOAST ----------
  } else if (normalized.includes("avocado toast") || normalized.includes("avocado")) {
    baseRecipe = {
      id: "mock_avocado_toast",
      title: "Gourmet Avocado Toast with Poached Egg",
      description: "Thick sourdough toast crowned with silky smashed avocado, a perfectly poached egg, and a drizzle of chili flakes and extra virgin olive oil.",
      image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 10, cookTime: 5, servings: 1, category: "Breakfast",
      tags: ["Healthy", "Vegetarian"],
      nutrition: { calories: 310, protein: 14, carbs: 28, fat: 16 },
      ingredients: [
        { name: "Sourdough bread, thick-sliced", amount: 2, unit: "slices" },
        { name: "Ripe avocado", amount: 1, unit: "pc" },
        { name: "Eggs", amount: 1, unit: "pc" },
        { name: "White vinegar (for poaching)", amount: 1, unit: "tsp" },
        { name: "Lemon juice", amount: 1, unit: "tsp" },
        { name: "Red chili flakes", amount: 0.25, unit: "tsp" },
        { name: "Extra virgin olive oil", amount: 1, unit: "tsp" },
        { name: "Salt and black pepper", amount: 1, unit: "pinch" }
      ],
      instructions: [
        "Toast the sourdough slices in a toaster or under a broiler until golden and crisp on the outside.",
        "Halve the avocado, remove the pit, and scoop the flesh into a bowl. Add lemon juice, salt, and black pepper. Mash with a fork to a chunky-smooth consistency.",
        "Fill a small saucepan with water, add the vinegar, and bring to a gentle simmer (not a boil). Swirl the water gently with a spoon.",
        "Crack the egg into a small cup first. Lower the cup close to the simmering water and gently slide the egg in. Poach for exactly 3-4 minutes for a runny yolk.",
        "Spread the smashed avocado generously over the toasted sourdough slices.",
        "Using a slotted spoon, remove the poached egg, blot with paper towel, and place on top of the avocado toast.",
        "Drizzle with olive oil, sprinkle red chili flakes, add a crack of black pepper, and serve immediately."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- DAL MAKHANI ----------
  } else if (normalized.includes("dal") || normalized.includes("daal") || normalized.includes("lentil")) {
    baseRecipe = {
      id: "mock_dal_makhani",
      title: "Slow-Cooked Dal Makhani",
      description: "A beloved North Indian lentil dish made with whole black lentils and kidney beans simmered overnight in a buttery, spiced tomato base.",
      image: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 10, cookTime: 45, servings: 4, category: "Dinner",
      tags: ["Vegetarian", "High-Protein", "Gluten-Free"],
      nutrition: { calories: 340, protein: 16, carbs: 42, fat: 12 },
      ingredients: [
        { name: "Whole black lentils (urad dal), soaked overnight", amount: 1, unit: "cup" },
        { name: "Kidney beans (rajma), soaked overnight", amount: 0.25, unit: "cup" },
        { name: "Butter", amount: 30, unit: "g" },
        { name: "Onion, finely chopped", amount: 1, unit: "pc" },
        { name: "Ginger-garlic paste", amount: 1, unit: "tbsp" },
        { name: "Tomato puree", amount: 1, unit: "cup" },
        { name: "Heavy cream", amount: 3, unit: "tbsp" },
        { name: "Garam masala", amount: 1, unit: "tsp" },
        { name: "Red chili powder", amount: 1, unit: "tsp" },
        { name: "Salt", amount: 1.5, unit: "tsp" }
      ],
      instructions: [
        "Pressure cook the soaked lentils and kidney beans with 3 cups of water and 1 tsp salt for 4-5 whistles (or cook on the stove for 45 minutes) until very soft.",
        "Melt butter in a heavy-bottomed pot over medium heat. Add chopped onions and sauté for 8-10 minutes until deep golden brown.",
        "Add ginger-garlic paste and cook for 2 minutes. Add tomato puree, chili powder, and cook on medium heat for 8-10 minutes until oil separates.",
        "Add the cooked lentils and beans (with their cooking water) to the pot. Stir everything together.",
        "Simmer uncovered on low heat for 20-25 minutes, stirring occasionally, until the dal thickens to a creamy consistency.",
        "Stir in garam masala and 2 tbsp of cream. Simmer for 2 more minutes.",
        "Finish with the remaining butter swirled on top, garnish with cream and fresh coriander, and serve with garlic naan or rice."
      ],
      rating: 4.9, reviews: [], isUserCreated: false
    };

  // ---------- ALOO PARATHA ----------
  } else if (normalized.includes("paratha") || normalized.includes("aloo paratha")) {
    baseRecipe = {
      id: "mock_aloo_paratha",
      title: "Golden Aloo Paratha",
      description: "Flaky, golden-brown whole wheat flatbreads stuffed with a spiced mashed potato filling, cooked in butter for an irresistible crust.",
      image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 20, cookTime: 15, servings: 4, category: "Breakfast",
      tags: ["Vegetarian", "Indian"],
      nutrition: { calories: 310, protein: 8, carbs: 52, fat: 8 },
      ingredients: [
        { name: "Whole wheat flour (atta)", amount: 2, unit: "cups" },
        { name: "Water (for dough)", amount: 0.75, unit: "cup" },
        { name: "Boiled potatoes, mashed", amount: 2, unit: "pcs" },
        { name: "Green chili, finely chopped", amount: 1, unit: "pc" },
        { name: "Fresh coriander, chopped", amount: 2, unit: "tbsp" },
        { name: "Cumin seeds", amount: 0.5, unit: "tsp" },
        { name: "Garam masala", amount: 0.5, unit: "tsp" },
        { name: "Salt", amount: 1, unit: "tsp" },
        { name: "Butter or ghee (for cooking)", amount: 2, unit: "tbsp" }
      ],
      instructions: [
        "Make a soft, pliable dough: combine wheat flour and salt, add water gradually, and knead for 5-7 minutes until smooth. Cover and rest for 15 minutes.",
        "Mix mashed potatoes with green chili, coriander, cumin seeds, garam masala, and salt. Taste and adjust seasoning.",
        "Divide the dough into equal balls (golf-ball sized). Roll one ball into a small circle (4 inches). Place 2 tbsp potato filling in the center.",
        "Bring the dough edges together to seal the filling inside. Press gently into a ball again. On a floured surface, carefully roll into a flat 7-8 inch disc.",
        "Heat a flat pan (tawa) over medium-high heat. Place the paratha on the hot pan. Cook for 1.5-2 minutes until brown spots form.",
        "Flip the paratha. Apply 0.5 tsp butter and spread evenly. Cook for 1 more minute. Flip again, apply butter on the other side too.",
        "Cook for 30 more seconds until golden and slightly crispy. Serve hot with yogurt, butter, and mango pickle."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- CHOLE / CHICKPEA CURRY ----------
  } else if (normalized.includes("chole") || normalized.includes("chana") || normalized.includes("chickpea")) {
    baseRecipe = {
      id: "mock_chole",
      title: "Punjabi Chole (Spiced Chickpea Curry)",
      description: "A bold, hearty Punjabi-style chickpea curry cooked with a deeply spiced onion-tomato masala and finished with a squeeze of fresh lemon.",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600&auto=format&fit=crop",
      difficulty: "Easy",
      prepTime: 10, cookTime: 30, servings: 4, category: "Lunch",
      tags: ["Vegan", "Vegetarian", "High-Protein"],
      nutrition: { calories: 310, protein: 14, carbs: 46, fat: 8 },
      ingredients: [
        { name: "Cooked chickpeas (canned or boiled)", amount: 2, unit: "cups" },
        { name: "Onion, finely chopped", amount: 2, unit: "pcs" },
        { name: "Tomatoes, chopped", amount: 2, unit: "pcs" },
        { name: "Ginger-garlic paste", amount: 1.5, unit: "tbsp" },
        { name: "Chole masala powder", amount: 2, unit: "tbsp" },
        { name: "Cumin seeds", amount: 1, unit: "tsp" },
        { name: "Turmeric powder", amount: 0.5, unit: "tsp" },
        { name: "Kashmiri red chili powder", amount: 1, unit: "tsp" },
        { name: "Fresh lemon juice", amount: 1, unit: "tbsp" },
        { name: "Fresh coriander for garnish", amount: 2, unit: "tbsp" },
        { name: "Oil", amount: 3, unit: "tbsp" }
      ],
      instructions: [
        "Heat oil in a large pan over medium heat. Add cumin seeds and let them splutter for 30 seconds.",
        "Add finely chopped onions. Cook on medium heat for 10-12 minutes, stirring occasionally, until deep golden brown.",
        "Add ginger-garlic paste and cook for 2 minutes until the raw smell disappears.",
        "Add chopped tomatoes, turmeric, red chili powder, and half the chole masala. Cook on medium heat for 8-10 minutes until tomatoes break down and oil separates.",
        "Add the cooked chickpeas and 1 cup of warm water. Stir well to coat the chickpeas in the masala.",
        "Simmer for 10-12 minutes on medium-low heat until the gravy thickens to your desired consistency. Mash a few chickpeas with the back of a spoon to thicken naturally.",
        "Stir in remaining chole masala and lemon juice. Garnish with fresh coriander and serve with bhature, puri, or rice."
      ],
      rating: 4.8, reviews: [], isUserCreated: false
    };

  // ---------- SALAD ----------
  } else if (normalized.includes("salad")) {
    const titleText = promptText || "Gourmet Garden Salad";
    baseRecipe = {
      id: "mock_salad_" + Math.random().toString(36).substring(2, 5),
      title: titleText.charAt(0).toUpperCase() + titleText.slice(1),
      description: `A fresh, crisp, and vibrant ${titleText} tossed in a handmade chef dressing.`,
      image: getGourmetRecipeImage(titleText),
      difficulty: "Easy",
      prepTime: 10, cookTime: 0, servings: 2, category: "Lunch",
      tags: ["Healthy", "Fresh", "Low-Carb", "Gluten-Free"],
      nutrition: { calories: 240, protein: 6, carbs: 12, fat: 18 },
      ingredients: [
        { name: "Mixed salad greens", amount: 4, unit: "cups" },
        { name: "Cherry tomatoes (halved)", amount: 1, unit: "cup" },
        { name: "Cucumber (sliced)", amount: 0.5, unit: "pc" },
        { name: "Extra virgin olive oil", amount: 3, unit: "tbsp" },
        { name: "Fresh lemon juice", amount: 1.5, unit: "tbsp" },
        { name: "Feta cheese or avocado", amount: 50, unit: "g" },
        { name: "Salt and black pepper", amount: 1, unit: "pinch" }
      ],
      instructions: [
        "Wash and thoroughly dry all salad greens and vegetables.",
        "Halve the tomatoes and slice the cucumber into bite-sized pieces.",
        "Whisk together olive oil, lemon juice, salt, and pepper to make the dressing.",
        "Combine greens, tomatoes, and cucumber in a large bowl.",
        "Drizzle the dressing and toss gently to coat every leaf.",
        "Garnish with crumbled feta or avocado slices and serve immediately."
      ],
      rating: 4.7, reviews: [], isUserCreated: false
    };

  // ---------- GENERIC FALLBACK WITH INGREDIENT-AWARE RECIPE ----------
  } else {
    const titleText = promptText || (ingredients.length > 0 ? `${ingredients.slice(0, 2).join(" & ")} Recipe` : "Gourmet Chef Creation");
    const isPantryBased = ingredients.length > 0 && !promptText;
    baseRecipe = {
      id: "mock_generic_" + Math.random().toString(36).substring(2, 5),
      title: titleText.charAt(0).toUpperCase() + titleText.slice(1),
      description: isPantryBased
        ? `A delicious and satisfying dish crafted from your available pantry ingredients: ${ingredients.slice(0, 3).join(", ")}.`
        : `A detailed, step-by-step recipe for preparing a delicious ${titleText}, adapted to a ${diet !== "None" ? diet : "balanced"} diet.`,
      image: getGourmetRecipeImage(titleText),
      difficulty: "Easy",
      prepTime: 15,
      cookTime: Math.min(maxTime - 15, 25),
      servings: 2,
      category: "Dinner",
      tags: diet !== "None" ? [diet] : ["Easy Cooking", "Quick Meal"],
      nutrition: { calories: 380, protein: 16, carbs: 42, fat: 12 },
      ingredients: (ingredients.length > 0 ? ingredients : ["Main Ingredient", "Onion", "Garlic", "Tomato", "Spices"]).map((name, i) => ({
        name: name + (i === 0 ? " (main, chopped into bite-sized pieces)" : ""),
        amount: [200, 1, 3, 2, 1][i % 5] || 10,
        unit: ["g", "pc", "cloves", "tbsp", "tsp"][i % 5] || "g"
      })).concat([
        { name: "Olive oil or butter", amount: 1.5, unit: "tbsp" },
        { name: "Salt and black pepper", amount: 1, unit: "pinch" },
        { name: "Fresh herbs (parsley, coriander, or basil)", amount: 2, unit: "tbsp" }
      ]),
      instructions: [
        "Prepare all ingredients: wash, peel, and chop everything into uniform pieces for even cooking. Mince the garlic and finely dice the onion.",
        "Heat olive oil or butter in a heavy-bottomed skillet over medium heat until shimmering, about 1 minute.",
        "Add the onion and garlic. Sauté on medium-low heat for 3-4 minutes, stirring frequently, until soft, fragrant, and translucent.",
        "Increase heat to medium. Add the main ingredients to the pan. Cook for 6-8 minutes, tossing occasionally, until cooked through and lightly golden on the edges.",
        "Season generously with salt, black pepper, and your chosen spices. Stir for 1 minute to bloom the spice flavours.",
        "Reduce heat to low, cover, and let the dish steam and meld for 3-4 minutes. Uncover, taste for seasoning, garnish with fresh herbs, and serve immediately."
      ],
      rating: 4.7, reviews: [], isUserCreated: false
    };
  }

  // Ensure baseRecipe has Chef Gourmet AI's new fields
  if (!baseRecipe.cuisine) {
    baseRecipe.cuisine = baseRecipe.category === "Breakfast" || baseRecipe.tags.includes("Indian") ? "Indian" : "American/Global";
  }
  if (!baseRecipe.imageKeywords) {
    baseRecipe.imageKeywords = baseRecipe.tags.slice(0, 3);
  }
  if (!baseRecipe.recommendations) {
    baseRecipe.recommendations = {
      lunch: {
        title: "Avocado Chickpea Salad Bowl",
        description: "A fresh, protein-packed lunch option with cherry tomatoes, cucumbers, and a lemon-vinaigrette dressing."
      },
      dinner: {
        title: "Lemon Herb Grilled Chicken",
        description: "Juicy, perfectly seasoned chicken breasts served with roasted asparagus and wild rice."
      },
      dessert: {
        title: "Warm Chocolate Fudge Mug Cake",
        description: "A quick, decadent chocolate cake cooked in a mug, topped with a scoop of vanilla ice cream."
      }
    };
  }
  
  // Ensure all ingredients have their quantity field populated as string
  baseRecipe.ingredients = baseRecipe.ingredients.map(ing => ({
    ...ing,
    quantity: ing.quantity || `${ing.amount} ${ing.unit}`
  }));

  return translateMockRecipe(baseRecipe, language);
}



export async function generateAIPickedRecipe(
  ingredients: string[],
  diet: string = "None",
  maxTime: number = 60,
  recipePrompt?: string,
  language: string = "English"
): Promise<Recipe> {
  const isPromptFlow = !!recipePrompt && recipePrompt.trim() !== "";
  const queryText = isPromptFlow ? recipePrompt : ingredients.join(", ");
  
  if (!hasKey || !genAI) {
    console.warn("GEMINI_API_KEY is not defined. Returning high-quality detailed mock recipe.");
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return getDetailedMockRecipe(queryText, ingredients, diet, maxTime, language);
  }

  const detectedCategory = detectCategory(queryText);
  let attempts = 0;
  const maxAttempts = 3;
  let lastError: string | null = null;
  let parsedRecipe: RawRecipe | null = null;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const promptSubject = isPromptFlow 
    ? `Generate a detailed recipe for: "${recipePrompt}". Make it authentic and chef-level.`
    : `Generate a detailed recipe using these ingredients: ${ingredients.join(", ")}.`;

  while (attempts < maxAttempts) {
    attempts++;
    let errorSteering = "";
    if (lastError) {
      errorSteering = `
      IMPORTANT: In your previous attempt, the validation failed with the following error:
      "${lastError}"
      You MUST fix this error in your new response. For example:
      - If category was wrong, enforce the correct category.
      - If authentic ingredients were missing, add them (e.g. Mascarpone/Ladyfingers for Tiramisu).
      - If savory leaks (Onion, Garlic, Tomato) occurred in a sweet dish, remove them completely.
      - NEVER use placeholders like "Main Ingredient", "Supporting Element", "Generic Vegetables", "Seasonings & Spices", etc.
      `;
    }

    const prompt = `
      You are Chef Gourmet AI, an expert chef, nutritionist, and meal-planning assistant.
      Your goal is to generate realistic, high-quality, visually appealing, and authentic recipes.
      
      Generate a recipe for: ${promptSubject}
      
      STRICT AUTHENTICITY RULES:
      1. ONLY generate real-world, authentic recipes using their traditional ingredients. 
         - If the request is for a specific classic dish, you MUST use its authentic traditional ingredients (e.g., Tiramisu MUST include mascarpone cheese and ladyfinger cookies/savoiardi; Veg Biryani must include basmati rice, biryani spices, and mixed vegetables).
         - NEVER use generic placeholders like "Main Ingredient", "Supporting Element", "Generic Vegetables", "Seasonings & Spices", etc. List actual, specific ingredients (e.g., "zucchini", "bell pepper", "cumin", "oregano").
         - NEVER mix sweet and savory ingredients inappropriately. Sweet desserts (like Tiramisu, Cheesecake, Lava Cake, Panna Cotta, Brownie) or sweet drinks (like Lemonade, Cold Coffee) must NEVER contain savory vegetables/seasonings (like Onion, Garlic, Tomato).
      2. Quantities must be realistic and specific (e.g., "250g", "1 cup", "2 cloves", "1/2 tsp").
      3. Nutrition values must be realistic and scientifically plausible for the dish (e.g., calories, protein, carbs, fat).
      4. Instructions must be detailed, step-by-step, and beginner-friendly, explaining techniques clearly.
      5. The recipe category MUST be classified accurately:
         - Sweet desserts (Tiramisu, Cheesecake, Brownie, Cake, Panna Cotta) MUST be categorized as "Dessert".
         - Beverages/drinks (Cold Coffee, Lemonade, juice, shake, smoothie, mocktail) MUST be categorized as "Drink".
         - Main course savory dishes (Paneer Butter Masala, Veg Biryani, Pasta, Pizza, Salads) MUST be categorized as "Lunch" or "Dinner".
         - Target Category for this dish: "${detectedCategory}".
      
      ${errorSteering}

      MEAL RECOMMENDATION RULES:
      Generate exactly 3 personalized recipe recommendations (one for lunch, one for dinner, one for dessert).
      - Category constraints: Lunch must be a meal ("Lunch"), Dinner must be a meal ("Dinner"), Dessert must be a dessert ("Dessert").
      - Under no circumstances recommend drinks/beverages.
      - Ensure no duplicate recommendation titles.
      - Choose different cuisines for each recommendation to avoid repetition.
      - Keep recommendations simple, practical, and popular.

      IMAGE MATCHING GUIDELINES:
      - Include a short "imageKeywords" field with 2-5 specific food terms (e.g., ["tiramisu", "dessert"], ["coffee", "beverage"], ["curry", "indian"]).
      
      OUTPUT FORMAT:
      Return ONLY a valid JSON object matching the schema below. No conversational text, no markdown wrappers (no \`\`\`json blocks, just raw JSON).
      
      Dietary constraints: Adhere to the "${diet}" diet.
      Max time limit: Must be completed within ${maxTime} minutes.
      Language: You MUST translate the recipe title, ingredient names, description (if any), instructions, recommendations, and cuisine into: ${language}. Keep JSON keys strictly in English, but values must be translated.
      
      JSON Schema:
      {
        "title": "Specific Authentic Title",
        "category": "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert" | "Drink",
        "cuisine": "Cuisine Name",
        "difficulty": "Easy" | "Medium" | "Hard",
        "prepTime": "Prep time in minutes, e.g. '15 mins'",
        "cookTime": "Cook time in minutes, e.g. '20 mins'",
        "servings": 4,
        "imageKeywords": ["keyword1", "keyword2"],
        "ingredients": [
          { "name": "Specific Ingredient Name", "quantity": "Realistic Quantity" }
        ],
        "instructions": ["Step 1...", "Step 2..."],
        "nutrition": {
          "calories": 350,
          "protein": 10,
          "carbs": 40,
          "fat": 15
        },
        "recommendations": {
          "lunch": { "title": "Meal title", "description": "Short description" },
          "dinner": { "title": "Meal title", "description": "Short description" },
          "dessert": { "title": "Dessert title", "description": "Short description" }
        }
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanJson = extractJson(responseText);
      parsedRecipe = JSON.parse(cleanJson) as RawRecipe;
      if (!parsedRecipe) {
        throw new Error("Parsed recipe JSON is invalid or empty");
      }

      const validationError = validateRecipe(parsedRecipe, queryText);
      if (validationError) {
        console.warn(`Validation failed on attempt ${attempts}: ${validationError}`);
        lastError = validationError;
      } else {
        break; // Passed validation!
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Failed to generate or parse JSON on attempt ${attempts}:`, err);
      lastError = `Failed to generate or parse JSON: ${errMsg}`;
    }
  }

  if (!parsedRecipe) {
    throw new Error(`Recipe generation failed after ${maxAttempts} attempts. Last error: ${lastError}`);
  }

  // Map the new format back to the database-compatible Recipe model
  const mappedIngredients = (parsedRecipe.ingredients || []).map((ing) => {
    const parsedQty = parseQuantity(ing.quantity || "");
    return {
      name: ing.name || "",
      amount: parsedQty.amount,
      unit: parsedQty.unit,
      quantity: ing.quantity || ""
    };
  });

  const parsedPrepTime = parseTime(parsedRecipe.prepTime || "10");
  const parsedCookTime = parseTime(parsedRecipe.cookTime || "15");
  const description = parsedRecipe.description || `${parsedRecipe.cuisine || "Gourmet"} style ${parsedRecipe.title} prepared in ${parsedPrepTime + parsedCookTime} minutes.`;

  const mappedRecipe: Recipe = {
    id: "ai_" + Math.random().toString(36).substring(2, 9),
    title: parsedRecipe.title || "Gourmet Recipe",
    description: description,
    image: getGourmetRecipeImage(parsedRecipe.title || "Gourmet", parsedRecipe.category, parsedRecipe.imageKeywords),
    difficulty: parsedRecipe.difficulty || "Easy",
    prepTime: parsedPrepTime,
    cookTime: parsedCookTime,
    servings: parsedRecipe.servings || 2,
    category: parsedRecipe.category || "Dinner",
    tags: parsedRecipe.imageKeywords || [],
    nutrition: {
      calories: parsedRecipe.nutrition?.calories || 0,
      protein: parsedRecipe.nutrition?.protein || 0,
      carbs: parsedRecipe.nutrition?.carbs || 0,
      fat: parsedRecipe.nutrition?.fat || 0,
    },
    ingredients: mappedIngredients,
    instructions: parsedRecipe.instructions || [],
    rating: 5.0,
    reviews: [],
    isUserCreated: false,
    cuisine: parsedRecipe.cuisine || "",
    imageKeywords: parsedRecipe.imageKeywords || [],
    recommendations: parsedRecipe.recommendations
      ? {
          lunch: {
            title: parsedRecipe.recommendations.lunch?.title || "",
            description: parsedRecipe.recommendations.lunch?.description || ""
          },
          dinner: {
            title: parsedRecipe.recommendations.dinner?.title || "",
            description: parsedRecipe.recommendations.dinner?.description || ""
          },
          dessert: {
            title: parsedRecipe.recommendations.dessert?.title || "",
            description: parsedRecipe.recommendations.dessert?.description || ""
          }
        }
      : undefined
  };

  return mappedRecipe;
}

export async function detectIngredientsFromImage(base64Image: string): Promise<string[]> {
  if (!hasKey || !genAI) {
    console.warn("GEMINI_API_KEY is not defined. Returning mock detected ingredients.");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Simulate detecting ingredients based on a random subset
    const pantryPool = ["Tomato", "Avocado", "Egg", "Broccoli", "Garlic", "Onion", "Spinach", "Chicken Breast", "Tofu", "Lemon"];
    const shuffled = pantryPool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4); // return 4 ingredients
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Split headers (e.g. data:image/jpeg;base64,) if present
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg"
      }
    };

    const prompt = `
      Identify all visible raw cooking ingredients or food items in this pantry/refrigerator image.
      Provide the list as a clean JSON array of strings containing ONLY the names of the ingredients, e.g. ["tomato", "bell pepper", "eggs"].
      Do not include brand names or packaged wrappers. Limit the response to the top 10 main ingredients detected.
      Do not write any conversational text outside the JSON block.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const cleanJson = extractJson(responseText);
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error scanning pantry image via Gemini:", error);
    throw new Error("Pantry scanner image analysis failed.");
  }
}

export async function chefAssistantReply(
  message: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[]
): Promise<string> {
  if (!hasKey || !genAI) {
    console.warn("GEMINI_API_KEY is not defined. Returning chef canned response.");
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("substitute") || lowerMessage.includes("instead of")) {
      return "Bonjour! Substitution is an art form. If you need to substitute eggs, you can use apple sauce (1/4 cup per egg) or mashed banana for sweet baking. If it is savory, a flax egg (1 tbsp ground flaxseeds + 3 tbsp water) works wonderfully! What specific recipe are you working on?";
    }
    if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      return "Greetings, home chef! I am Chef Gourmet. What culinary adventure are we embarking on today? Ask me about techniques, substitutions, or menu planning!";
    }
    return `Chef Gourmet here! You asked: "${message}". That is a wonderful culinary inquiry. To get a perfect result, remember that temperature control is everything, and seasoning should happen at every stage of cooking, not just at the end. Tell me, do you have any specific ingredients you are trying to work with?`;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: CHEF_SYSTEM_INSTRUCTION
    });

    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.parts[0].text }]
      }))
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.error("Error getting chef chat response:", error);
    throw new Error("Chef chat assistant request failed.");
  }
}

export async function generateRecommendations(
  favorites: string[],
  recentSearches: string[],
  seed: number = 0
): Promise<Array<{
  title: string;
  description: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  prepTime: number;
  cookTime: number;
  reason: string;
}>> {
  const mockLunchRecipes = [
    { title: "Creamy Garlic Spinach Pasta", description: "Al dente penne tossed in a luxurious garlic-spinach cream sauce.", category: "Lunch", difficulty: "Easy" as const, prepTime: 10, cookTime: 12, reason: "Vegetable-rich, quick, and crowd-pleasing", cuisine: "Italian" },
    { title: "Avocado Chickpea Salad Bowl", description: "Fresh greens, cucumbers, tomatoes, and chickpeas in a lemon-herb vinaigrette.", category: "Lunch", difficulty: "Easy" as const, prepTime: 10, cookTime: 0, reason: "Light, healthy, and full of protein", cuisine: "Greek" },
    { title: "Restaurant-Style Egg Fried Rice", description: "Fluffy wok-tossed rice with scrambled eggs, soy sauce, and spring onions.", category: "Lunch", difficulty: "Easy" as const, prepTime: 5, cookTime: 10, reason: "A quick power lunch using pantry staples", cuisine: "Chinese" },
    { title: "Chicken Caesar Salad Wrap", description: "Grilled chicken strips and crisp romaine lettuce tossed in classic Caesar dressing wrapped in a soft tortilla.", category: "Lunch", difficulty: "Easy" as const, prepTime: 10, cookTime: 10, reason: "Balanced, protein-packed, and highly satisfying", cuisine: "American" }
  ];

  const mockDinnerRecipes = [
    { title: "Homestyle Butter Chicken", description: "Tender chicken pieces simmered in a creamy, spiced butter tomato gravy.", category: "Dinner", difficulty: "Medium" as const, prepTime: 20, cookTime: 25, reason: "Chef's favourite all-time dinner choice", cuisine: "Indian" },
    { title: "Tikka Masala Paneer Skewers", description: "Charred paneer and capsicum skewers in a smoky yogurt-spice marinade.", category: "Dinner", difficulty: "Easy" as const, prepTime: 15, cookTime: 15, reason: "Great for a quick weeknight Indian dinner", cuisine: "Indian" },
    { title: "Truffle & Forest Mushroom Risotto", description: "Creamy Arborio rice infused with forest mushrooms, white wine, and truffle oil.", category: "Dinner", difficulty: "Medium" as const, prepTime: 15, cookTime: 30, reason: "Restaurant-level dinner from home", cuisine: "Italian" },
    { title: "Veggie Tacos with Guacamole", description: "Crispy soft tacos filled with sautéed veggies, black beans, cheese, and fresh guacamole.", category: "Dinner", difficulty: "Easy" as const, prepTime: 15, cookTime: 10, reason: "Fast, fresh Mexican comfort food", cuisine: "Mexican" }
  ];

  const mockDessertRecipes = [
    { title: "Classic Italian Tiramisu", description: "Decadent dessert layered with coffee-soaked ladyfingers and sweet mascarpone cream.", category: "Dessert", difficulty: "Medium" as const, prepTime: 20, cookTime: 0, reason: "An elegant, traditional Italian sweet treat", cuisine: "Italian" },
    { title: "Warm Chocolate Lava Cake", description: "A rich, personal-sized chocolate cake with a warm, gooey molten center.", category: "Dessert", difficulty: "Medium" as const, prepTime: 10, cookTime: 12, reason: "The ultimate indulgent chocolate dessert", cuisine: "French" },
    { title: "Silky Mango Panna Cotta", description: "Vanilla cream pudding topped with a sweet tropical mango coulis.", category: "Dessert", difficulty: "Easy" as const, prepTime: 15, cookTime: 5, reason: "A light, refreshing, and creamy fruit dessert", cuisine: "Italian" },
    { title: "Fudgy Chocolate Brownies", description: "Dense, decadent brownies baked to fudgy perfection, loaded with chocolate chips.", category: "Dessert", difficulty: "Easy" as const, prepTime: 10, cookTime: 20, reason: "Perfect bake for chocolate lovers", cuisine: "American" }
  ];

  if (!hasKey || !genAI) {
    console.warn("GEMINI_API_KEY is not defined. Returning high-quality mock recommendations.");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    let lunchCandidates = mockLunchRecipes;
    let dinnerCandidates = mockDinnerRecipes;
    let dessertCandidates = mockDessertRecipes;

    interface RecommendationCandidate {
      title: string;
      description: string;
      category: string;
      difficulty: "Easy" | "Medium" | "Hard";
      prepTime: number;
      cookTime: number;
      reason: string;
      cuisine: string;
    }

    if (recentSearches.length > 0) {
      const matcher = (item: RecommendationCandidate) => {
        return recentSearches.some(term => 
          item.title.toLowerCase().includes(term.toLowerCase()) || 
          item.description.toLowerCase().includes(term.toLowerCase())
        );
      };
      const matchedLunch = mockLunchRecipes.filter(matcher);
      const matchedDinner = mockDinnerRecipes.filter(matcher);
      const matchedDessert = mockDessertRecipes.filter(matcher);

      if (matchedLunch.length > 0) lunchCandidates = matchedLunch;
      if (matchedDinner.length > 0) dinnerCandidates = matchedDinner;
      if (matchedDessert.length > 0) dessertCandidates = matchedDessert;
    }

    const lunchIdx = seed % lunchCandidates.length;
    const dinnerIdx = (seed + 1) % dinnerCandidates.length;
    const dessertIdx = (seed + 2) % dessertCandidates.length;

    const lunch = { ...lunchCandidates[lunchIdx] };
    const dinner = { ...dinnerCandidates[dinnerIdx] };
    const dessert = { ...dessertCandidates[dessertIdx] };

    const updateReason = (item: RecommendationCandidate) => {
      const matchedSearch = recentSearches.find(s =>
        item.title.toLowerCase().includes(s.toLowerCase()) ||
        item.description.toLowerCase().includes(s.toLowerCase())
      );
      if (matchedSearch) {
        return { ...item, reason: `Inspired by your search for "${matchedSearch}"` };
      }
      return item;
    };

    return [updateReason(lunch), updateReason(dinner), updateReason(dessert)];
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const dbRecipes = getRecipes();
    const dbSummaries = dbRecipes.map(r => ({
      title: r.title,
      description: r.description,
      category: r.category,
      difficulty: r.difficulty,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      cuisine: r.cuisine || ""
    }));

    const favsStr = favorites.length > 0 ? favorites.join(", ") : "None specified yet";
    const searchStr = recentSearches.length > 0 ? recentSearches.join(", ") : "None specified yet";

    const prompt = `
      You are a gourmet kitchen planner and recipe recommender system.
      The user's favorite recipe titles: [${favsStr}]
      The user's recent search keywords: [${searchStr}]
      Shuffle seed / offset: ${seed}

      Available recipes from the database:
      ${JSON.stringify(dbSummaries)}

      Suggest exactly 3 personalized recipe concepts that this user would love to cook.
      You MUST return:
      1. One Lunch suggestion (must be a meal suitable for lunch, e.g. "Lunch")
      2. One Dinner suggestion (must be a meal suitable for dinner, e.g. "Dinner")
      3. One Dessert suggestion (must be a sweet dessert, e.g. "Dessert")

      Strict Rules:
      - Never suggest drinks/beverages.
      - Ensure the lunch is a lunch meal.
      - Ensure the dinner is a dinner meal.
      - Ensure the dessert is a dessert.
      - No duplicate recommendations.
      - Avoid repeating cuisines whenever possible.
      - Recommendations should be practical and easy to cook.
      - USE available recipes from the database list above whenever they match the user's tastes or search patterns. Keep their titles exactly as listed in the database.
      - Use the shuffle seed/offset (${seed}) to rotate the recommendations so that they are completely different when the seed changes. Choose completely different options for seed=0, seed=1, seed=2, etc.

      For each recommendation, provide:
      - title: A specific, mouth-watering recipe title that fits what the user is looking for.
      - description: A brief, single-sentence mouth-watering summary of the dish.
      - category: MUST be exactly "Lunch" (for lunch), "Dinner" (for dinner), or "Dessert" (for dessert).
      - difficulty: One of "Easy", "Medium", "Hard".
      - prepTime: Number of minutes for preparation.
      - cookTime: Number of minutes for cooking.
      - reason: A short, friendly explanation of why this is recommended (e.g. "Inspired by your search for pasta", or "Since you love [Favorite]").

      Respond ONLY with a valid JSON object of this exact structure (no markdown, no extra text):
      {
        "lunch": {
          "title": "",
          "description": "",
          "category": "Lunch",
          "difficulty": "Easy" | "Medium" | "Hard",
          "prepTime": 0,
          "cookTime": 0,
          "reason": ""
        },
        "dinner": {
          "title": "",
          "description": "",
          "category": "Dinner",
          "difficulty": "Easy" | "Medium" | "Hard",
          "prepTime": 0,
          "cookTime": 0,
          "reason": ""
        },
        "dessert": {
          "title": "",
          "description": "",
          "category": "Dessert",
          "difficulty": "Easy" | "Medium" | "Hard",
          "prepTime": 0,
          "cookTime": 0,
          "reason": ""
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = extractJson(responseText);
    const parsed = JSON.parse(cleanJson);
    return [parsed.lunch, parsed.dinner, parsed.dessert];
  } catch (error) {
    console.error("Error generating recommendations:", error);
    // Fallback on error with seed rotation
    const lunchCandidates = mockLunchRecipes;
    const dinnerCandidates = mockDinnerRecipes;
    const dessertCandidates = mockDessertRecipes;

    const lunchIdx = seed % lunchCandidates.length;
    const dinnerIdx = (seed + 1) % dinnerCandidates.length;
    const dessertIdx = (seed + 2) % dessertCandidates.length;
    return [lunchCandidates[lunchIdx], dinnerCandidates[dinnerIdx], dessertCandidates[dessertIdx]];
  }
}

