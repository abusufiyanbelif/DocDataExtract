//import "@/ai/genkit";
//import { NextResponse } from "next/server";

//export async function GET() {
 // return NextResponse.json({ status: "genkit-loaded" });
//}

////

import "@/ai/genkit";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasKey: !!process.env.GEMINI_API_KEY,
    keyPrefix: process.env.GEMINI_API_KEY?.slice(0, 6) ?? null,
  });
}
