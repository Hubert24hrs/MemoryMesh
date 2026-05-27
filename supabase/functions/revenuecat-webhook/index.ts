// Deno Supabase Edge Function: revenuecat-webhook
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
    const body = await req.json();
    const event = body.event;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const appUserId = event.app_user_id;
    const entitlementId = event.entitlement_id;
    const eventType = event.type;

    console.log(`💳 [Edge revenuecat-webhook] Billing webhook: ${eventType} for ${appUserId}`);

    let activePro = false;
    if (eventType === "INITIAL_PURCHASE" || eventType === "RENEWAL") {
      activePro = true;
    } else if (eventType === "CANCELLATION" || eventType === "EXPIRATION") {
      activePro = false;
    } else {
      return new Response(JSON.stringify({ success: true, message: "Ignored event type." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Toggle active Pro plans status in remote profiles database
    const { error } = await supabaseClient
      .from("users")
      .update({
        is_pro: activePro,
        plan_tier: activePro ? "pro" : "free",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appUserId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: "Entitlement synchronized." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("RevenueCat webhook failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
