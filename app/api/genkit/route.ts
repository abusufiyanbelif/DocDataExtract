import "@/ai/genkit"; // Point to the correct, centralized Genkit config
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "Genkit loaded" });
}
