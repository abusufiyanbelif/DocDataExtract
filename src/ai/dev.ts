import { config } from 'dotenv';
config();

import '@/ai/flows/extract-medical-findings.ts';
import '@/ai/flows/extract-and-correct-text.ts';
import '@/ai/flows/extract-billing-data.ts';
import '@/ai/flows/extract-key-info-identity.ts';