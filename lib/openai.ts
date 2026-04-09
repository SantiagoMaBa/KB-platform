// Este módulo solo se importa desde API routes (server-side).
// La OPENAI_API_KEY nunca se expone al cliente.
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY no está definida en las variables de entorno.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODEL = "gpt-4o-mini";
