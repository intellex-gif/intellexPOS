import { GoogleGenAI } from "@google/genai";
import { Product, Transaction } from "../types.ts";

const GEMINI_API_KEY = process.env.API_KEY || '';

export const GeminiService = {
  analyzeBusiness: async (products: Product[], transactions: Transaction[]) => {
    if (!GEMINI_API_KEY) {
      throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // Prepare context
    const lowStock = products.filter(p => p.stock < 10).map(p => p.name);
    const expired = products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date()).map(p => p.name);
    const recentSales = transactions.slice(0, 10);
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);

    const prompt = `
      You are an expert retail analyst. Analyze the following store data and provide 3 concise, actionable bullet points for the store owner.
      Focus on inventory health, sales trends, and immediate actions needed.

      Data:
      - Total Revenue (All Time): $${totalRevenue.toFixed(2)}
      - Low Stock Items (<10 units): ${lowStock.join(', ') || 'None'}
      - Expired/Expiring Items: ${expired.join(', ') || 'None'}
      - Recent Transaction Count: ${recentSales.length}

      Keep the tone professional yet encouraging.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  },

  generateProductDescription: async (name: string, category: string) => {
    if (!GEMINI_API_KEY) return "AI description unavailable (Missing API Key).";
    
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `Write a short, catchy 1-sentence product description for a retail point of sale display. Product: "${name}", Category: "${category}".`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text.trim();
    } catch (error) {
      return "Could not generate description.";
    }
  }
};