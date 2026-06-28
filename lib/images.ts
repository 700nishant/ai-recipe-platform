/**
 * Utility library for matching recipe titles to beautiful, context-relevant Unsplash images.
 */

const IMAGE_DICTIONARY: Record<string, string[]> = {
  tiramisu: [
    "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542326237-94b1c5a538d4?q=80&w=600&auto=format&fit=crop"
  ],
  cheesecake: [
    "https://images.unsplash.com/photo-1524351199679-46cddf530c04?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=600&auto=format&fit=crop"
  ],
  brownie: [
    "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?q=80&w=600&auto=format&fit=crop"
  ],
  pannacotta: [
    "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=600&auto=format&fit=crop"
  ],
  coffee: [
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1553909489-cd47e0907980?q=80&w=600&auto=format&fit=crop"
  ],
  lemonade: [
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1621263764928-df1444c5e859?q=80&w=600&auto=format&fit=crop"
  ],
  biryani: [
    "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1563379091-3d2045fedd3b?q=80&w=600&auto=format&fit=crop"
  ],
  pasta: [
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1546549032-9571cd6b27df?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=600&auto=format&fit=crop"
  ],
  noodle: [
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1552611052-33e04de081de?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=600&auto=format&fit=crop"
  ],
  curry: [
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=600&auto=format&fit=crop"
  ],
  burger: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=600&auto=format&fit=crop"
  ],
  pizza: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=600&auto=format&fit=crop"
  ],
  salad: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop"
  ],
  sandwich: [
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509722747041-616f39b57569?q=80&w=600&auto=format&fit=crop"
  ],
  soup: [
    "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1547592165-e1d17f97a1f8?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1607532941433-304659e8198a?q=80&w=600&auto=format&fit=crop"
  ],
  chicken: [
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1606728035253-49e8a23146de?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1598515214211-89d3e73ae83b?q=80&w=600&auto=format&fit=crop"
  ],
  meat: [
    "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558030006-450675393462?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1529692236671-f1f6e990a52b?q=80&w=600&auto=format&fit=crop"
  ],
  seafood: [
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1485704686097-ed47f7263ca4?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=600&auto=format&fit=crop"
  ],
  dessert: [
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1587314168485-3236d6710814?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=600&auto=format&fit=crop"
  ],
  breakfast: [
    "https://images.unsplash.com/photo-1528207776546-365bb710ee93?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1493770308161-fdc199e7c1d2?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1513442542250-854d436a73f2?q=80&w=600&auto=format&fit=crop"
  ],
  drink: [
    "https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497534446932-c925b458314e?q=80&w=600&auto=format&fit=crop"
  ],
  rice: [
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1596797038530-2c107229654b?q=80&w=600&auto=format&fit=crop"
  ],
  taco: [
    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=600&auto=format&fit=crop"
  ]
};

// Map keywords in recipe titles to categories
const KEYWORD_MAP: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["tiramisu"], category: "tiramisu" },
  { keywords: ["cheesecake"], category: "cheesecake" },
  { keywords: ["brownie", "brownies"], category: "brownie" },
  { keywords: ["panna cotta", "pannacotta"], category: "pannacotta" },
  { keywords: ["lemonade", "lemon juice", "nimbu pani"], category: "lemonade" },
  { keywords: ["coffee", "cold coffee", "iced coffee", "cappuccino", "latte", "espresso", "dalgona"], category: "coffee" },
  { keywords: ["biryani", "veg biryani", "chicken biryani", "pulao"], category: "biryani" },
  { keywords: ["pasta", "spaghetti", "carbonara", "macaroni", "penne", "lasagna", "fettuccine", "ravioli", "alfredo", "mac & cheese"], category: "pasta" },
  { keywords: ["noodle", "ramen", "maggi", "maggie", "chow mein", "chowmein", "pad thai", "lo mein"], category: "noodle" },
  { keywords: ["paneer", "tikka", "masala", "curry", "korma", "rogan josh", "samosa", "naan", "dal", "chana", "aloo", "indian", "makhani", "chole"], category: "curry" },
  { keywords: ["burger", "hamburger", "cheeseburger", "sliders"], category: "burger" },
  { keywords: ["pizza", "flatbread", "calzone", "focaccia", "margherita"], category: "pizza" },
  { keywords: ["salad", "greens", "caesar", "lettuce", "avocado", "spinach", "kale", "healthy", "vegan", "vegetarian", "caprese", "greek"], category: "salad" },
  { keywords: ["sandwich", "toast", "sourdough", "bread", "panini", "bruschetta", "crostini", "bagel"], category: "sandwich" },
  { keywords: ["soup", "broth", "stew", "chowder", "bisque"], category: "soup" },
  { keywords: ["chicken", "poultry", "roast", "wings", "breast", "turkey", "duck"], category: "chicken" },
  { keywords: ["steak", "beef", "ribeye", "meatballs", "pork", "bacon", "ribs", "meat", "lamb", "mutton", "sausage"], category: "meat" },
  { keywords: ["fish", "salmon", "seafood", "shrimp", "sushi", "prawn", "tuna", "lobster", "crab", "cod", "trout"], category: "seafood" },
  { keywords: ["cake", "chocolate", "cookie", "cookies", "sweet", "dessert", "pudding", "pie", "tart", "muffin", "cupcake", "truffle", "parfait"], category: "dessert" },
  { keywords: ["breakfast", "egg", "eggs", "omelette", "waffle", "pancakes", "pancake", "crepe", "oatmeal", "granola", "benedict", "paratha"], category: "breakfast" },
  { keywords: ["drink", "beverage", "smoothie", "shake", "cocktail", "mocktail", "juice", "mojito", "lassi", "chai", "cooler"], category: "drink" },
  { keywords: ["rice", "risotto", "pilaf"], category: "rice" },
  { keywords: ["taco", "tacos", "nachos", "quesadilla", "burrito", "mexican", "fajita", "enchilada"], category: "taco" }
];

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop";

/**
 * Deterministically maps a recipe title to a gorgeous Unsplash photo.
 */
export function getGourmetRecipeImage(title: string, category?: string, imageKeywords?: string[]): string {
  if (!title) return FALLBACK_IMAGE;

  const normalizedTitle = title.toLowerCase();
  
  // 1. Try to match using specific keywords in title or imageKeywords first (prioritize specific matches)
  let matchedCategory = "";

  const findMatch = (text: string) => {
    for (const mapping of KEYWORD_MAP) {
      if (mapping.keywords.some(kw => text.includes(kw))) {
        return mapping.category;
      }
    }
    return "";
  };

  // Try matching imageKeywords first (specific tags generated by AI)
  if (imageKeywords && imageKeywords.length > 0) {
    for (const kw of imageKeywords) {
      const match = findMatch(kw.toLowerCase());
      if (match) {
        matchedCategory = match;
        break;
      }
    }
  }

  // Try matching title next
  if (!matchedCategory) {
    matchedCategory = findMatch(normalizedTitle);
  }

  // 2. Try to match by general category fallback
  if (!matchedCategory && category) {
    const cat = category.toLowerCase();
    if (cat === "drink" || cat === "beverage") {
      matchedCategory = "drink";
    } else if (cat === "dessert" || cat === "sweet") {
      matchedCategory = "dessert";
    } else if (cat === "breakfast") {
      matchedCategory = "breakfast";
    } else if (cat === "salad") {
      matchedCategory = "salad";
    }
  }

  const images = matchedCategory ? IMAGE_DICTIONARY[matchedCategory] : null;
  if (!images || images.length === 0) {
    // Category level fallback
    if (category) {
      const cat = category.toLowerCase();
      if (cat === "drink" || cat === "beverage") {
        return IMAGE_DICTIONARY.drink[0];
      }
      if (cat === "dessert") {
        return IMAGE_DICTIONARY.dessert[0];
      }
    }
    return FALLBACK_IMAGE;
  }

  // Create a deterministic hash from the title to pick the same image consistently
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % images.length;
  
  return images[index];
}
