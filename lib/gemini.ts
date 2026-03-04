import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const geminiChat = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
export const geminiFlash = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
