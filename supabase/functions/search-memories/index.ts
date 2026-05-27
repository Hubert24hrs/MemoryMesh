// Deno Supabase Edge Function: search-memories
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, query, limit = 10 } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`🔎 [Edge search-memories] Query: "${query}" for User: ${userId}`);

    // Fetch memory stubs matching the owner id
    const { data: dbMemories, error } = await supabaseClient
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .limit(limit);

    if (error) throw error;

    // Simulate vector matches rankings
    const matches = (dbMemories || []).map((m: any, index: number) => ({
      memory: m,
      score: 0.95 - index * 0.05, // Simulated cosine scores
      highlights: [m.summary || ''],
    }));

    return new Response(JSON.stringify(matches), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Deno Edge Search failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
