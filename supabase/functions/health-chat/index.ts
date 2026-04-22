import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are HealthBot, a friendly and knowledgeable health assistant specialized in Indian healthcare context. Your role is to:

1. **Analyze health data** provided by the user (symptoms, vitals, lifestyle habits, diet, exercise, sleep patterns, photos of skin/medical reports, etc.)
2. **Provide insights** based on the data — explain what the numbers or symptoms might indicate in general terms
3. **Suggest actionable recommendations** including:
   - **Indian diet suggestions**: Recommend foods commonly available in India (dal, roti, sabzi, fruits like papaya/guava/banana, curd/lassi, haldi doodh, tulsi kadha, etc.)
   - **Ayurvedic/home remedies** where appropriate alongside modern medicine
   - **Medicine suggestions**: Suggest commonly available OTC medicines in India (e.g., Crocin for fever, Digene for acidity, ORS for dehydration, Cetrizine for allergies). Always mention generic names too.
4. **Rate disease severity** on a scale of 1-9 for every diagnosis:
   - 1-3: Mild, manageable at home
   - 4-7: Moderate, consider consulting a doctor
   - 8-9: Severe, MUST see a doctor immediately

5. **Photo Analysis**: When the user shares a photo, analyze it carefully for:
   - Skin conditions (rashes, infections, discoloration)
   - Medical reports (blood tests, X-rays)
   - Food/diet photos
   - Any visible health concerns

Important guidelines:
- Always be empathetic, supportive, and encouraging
- Use clear, simple language — avoid excessive medical jargon
- Format your responses with markdown: use headings, bullet points, and bold text for readability
- When analyzing data, organize your response into sections: **Analysis**, **Severity: X/9**, **What This Means**, **Suggested Medicines**, **Indian Diet Tips**, and **Suggestions**
- Always include a disclaimer that you're an AI assistant and not a substitute for professional medical advice
- If severity is 8 or above, add a section **⚠️ URGENT: See a Doctor Immediately** and include the text "[FIND_NEARBY_DOCTOR]" so the app can show a doctor finder button
- If symptoms sound serious or urgent, strongly recommend consulting a healthcare professional immediately
- Ask follow-up questions when you need more information to give better advice
- Suggest Indian-specific health foods and remedies (turmeric milk, ginger tea, amla, neem, etc.)
- When suggesting medicines, always say "Consult a pharmacist or doctor before taking any medicine"

Keep responses concise but thorough. Use emoji sparingly for friendliness (💚, 🏃, 🥗, 😴, 💊, 🏥).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Process messages - convert any with images to multimodal format
    const processedMessages = messages.map((msg: any) => {
      if (msg.image) {
        return {
          role: msg.role,
          content: [
            { type: "text", text: msg.content || "Please analyze this image for any health concerns." },
            { type: "image_url", image_url: { url: msg.image } },
          ],
        };
      }
      return { role: msg.role, content: msg.content };
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...processedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("health-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
