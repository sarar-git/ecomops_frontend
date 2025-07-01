import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.5";

export const supabase = createClient(
  "https://wllmlchqjnswuduftihd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbG1sY2hxam5zd3VkdWZ0aWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjQ0MTIsImV4cCI6MjA2NTg0MDQxMn0.hNNiXHMvmfy3eW_d2VeWQOJVFuUOH0qoqWE007-7vhM",
  {
    auth: {
      persistSession: true,         // ✅ Keep session after page reloads
      autoRefreshToken: true,       // ✅ Refresh access token automatically
      detectSessionInUrl: true     // ✅ Skip URL token handling (for SPA)
    }
  }
);
