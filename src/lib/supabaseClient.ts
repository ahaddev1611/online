
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types'; // Ensure this path is correct

// Hardcoded Supabase URL for project sduevmrlhwmwmdwpdhet
const supabaseUrl = 'https://sduevmrlhwmwmdwpdhet.supabase.co';

// Temporarily hardcoded Supabase Anon Key for project sduevmrlhwmwmdwpdhet
// WARNING: THIS IS FOR DEBUGGING ONLY. Revert to using environment variables.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdWV2bXJsaHdtd21kd3BkaGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNTkwNzYsImV4cCI6MjA2NDczNTA3Nn0.un2Fr5LI1D6iIWlPiKgdVxqi44c-5n1Cs0PhWJ-fp0g';

if (!supabaseUrl) {
  // This condition should ideally not be met as supabaseUrl is hardcoded.
  throw new Error(
    "CRITICAL CONFIGURATION ERROR: Supabase URL is not defined in src/lib/supabaseClient.ts. This is unexpected as it's hardcoded."
  );
}

if (!supabaseAnonKey) {
  // This error should not be hit if the key is hardcoded above.
  // If it is, it means the hardcoding was removed or there's a deeper issue.
  throw new Error(
`CRITICAL CONFIGURATION ERROR: Supabase anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is not defined.

To fix this (RECOMMENDED METHOD):
1. Create or ensure you have a file named '.env.local' in the ROOT directory of your project (the same level as 'package.json').
2. Add the line: NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
   (Replace 'your_actual_supabase_anon_key' with the key from your Supabase project 'sduevmrlhwmwmdwpdhet'. You can find this in your Supabase dashboard: Project Settings > API > Project API keys > anon public)
3. IMPORTANT: You MUST RESTART your Next.js development server after creating or modifying the .env.local file for the changes to take effect.`
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
