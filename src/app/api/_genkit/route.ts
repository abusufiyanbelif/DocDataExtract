import '@/ai/genkit';
import {NextResponse} from 'next/server';

export async function GET() {
  return NextResponse.json({status: 'genkit-loaded'});
}
