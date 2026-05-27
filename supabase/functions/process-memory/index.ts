// Deno Supabase Edge Function: process-memory
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
    const { memoryId, userId, content, type } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`🧠 [Edge process-memory] Processing ID: ${memoryId} for User: ${userId}`);

    // Update remote DB with structured processing states
    const { error } = await supabaseClient
      .from("memories")
      .update({
        summary: `Processed neural memory capture of type ${type}`,
        importance: 5,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memoryId);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: "Synapse metadata extracted and saved." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("Deno Edge Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
