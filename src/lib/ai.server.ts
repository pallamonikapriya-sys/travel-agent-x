const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function callAI(
  messages: Array<{ role: string; content: string }>,
  opts: { model?: string; json?: boolean } = {},
): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3.7-flash",
      messages,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("The travel agent is busy right now. Please retry in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace. Add credits to keep planning.");
    throw new Error(`AI request failed [${res.status}]: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned) as T;
}
