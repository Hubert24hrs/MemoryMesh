// Deno Supabase Edge Function: proactive-engine
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
    const { userId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`🤖 [Edge proactive-engine] Generating insights for: ${userId}`);

    // Create a new proactive insight connection
    const newInsight = {
      id: crypto.randomUUID(),
      user_id: userId,
      type: "pattern",
      title: "Causal Coding Habits Detected",
      description: "We identified that you captured multiple thoughts about mobile architecture. Consider dedicating 20 minutes to refine your tsconfig compiler configurations.",
      confidence: 0.92,
      created_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabaseClient
      .from("insights")
      .insert([newInsight]);

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true, insight: newInsight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Proactive engine failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
