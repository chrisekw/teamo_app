
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-team-communication.ts';
import '@/ai/flows/suggest-team-alignment-actions.ts';
import '@/ai/flows/suggest-actionable-tasks.ts';
import '@/ai/flows/answer-team-questions.ts';
import '@/ai/flows/generate-team-content.ts';
