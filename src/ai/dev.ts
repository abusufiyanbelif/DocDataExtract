import { config } from 'dotenv';
config();

import '@/ai/flows/extract-medical-findings.ts';
import '@/ai/flows/extract-and-correct-text.ts';
import '@/ai/flows/extract-billing-data.ts';
import '@/ai/flows/extract-key-info-identity.ts';
import '@/ai/flows/extract-dynamic-form.ts';
import '@/ai/flows/create-lead-story.ts';
import '@/ai/flows/extract-education-findings.ts';
import '@/ai/flows/create-education-story.ts';
import '@/ai/flows/extract-payment-details.ts';
