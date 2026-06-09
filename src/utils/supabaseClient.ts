/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (process.env.SUPABASE_URL as string) || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (process.env.SUPABASE_ANON_KEY as string) || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or Vercel dashboard.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
