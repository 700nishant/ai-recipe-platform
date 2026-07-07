import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: "GEMINI_API_KEY is not defined in the environment variables of this server.",
      loadedKeys: Object.keys(process.env).filter(
        (k) => k.includes("KEY") || k.includes("API") || k.includes("GEMINI")
      )
    });
  }

  const maskedKey = apiKey.slice(0, 6) + "..." + apiKey.slice(-4);
  const keyType = apiKey.startsWith("AIzaSy")
    ? "Legacy (AIzaSy)"
    : apiKey.startsWith("AQ.")
    ? "New (AQ.)"
    : "Unknown";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Attempt a direct simple query using gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Respond with the word 'OK' if you can read this.");
    const text = result.response.text();

    return NextResponse.json({
      success: true,
      maskedKey,
      keyType,
      testOutput: text.trim(),
      message: "API key is active and successfully communicated with Gemini 1.5 Flash!"
    });
  } catch (error: any) {
    console.error("Gemini Debug Endpoint Error:", error);
    return NextResponse.json({
      success: false,
      maskedKey,
      keyType,
      errorName: error.name || "Error",
      errorMessage: error.message || String(error),
      suggestion: "If this is a 404, the API Key on this server does not have permission or is not valid for the Generative Language API. Double check that the key in Vercel settings is copied correctly and has no trailing spaces."
    });
  }
}
