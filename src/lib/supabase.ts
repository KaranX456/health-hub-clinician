import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hmrdsqgbyoysmfdhmlkw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcmRzcWdieW95c21mZGhtbGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzY1NzcsImV4cCI6MjEwMjUxMjU3N30.5zmw0C3wd6vgqYvxydf75ywjvS7X_6VnQFOv2Pk_ouc";

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});