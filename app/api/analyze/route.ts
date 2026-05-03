import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You analyze a conversation and extract structured information about it.
Return ONLY a valid JSON object with exactly these fields:
{
  "objective": "string - the main goal or problem being solved in this conversation",
  "constraints": "string - limitations, requirements, or boundaries mentioned",
  "openQuestions": "string - unresolved questions or things that need clarification",
  "assumptions": "string - things being assumed or taken for granted",
  "status": "string - MUST be exactly one of these three values: In Progress, Blocked, Done"
}

Rules:
- status MUST be one of: "In Progress", "Blocked", "Done" — no other values are valid.
- Be concise. If a field has no content yet, use an empty string.
- Return ONLY the JSON object, no markdown, no explanation.`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    const conversationText = messages
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
      )
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this conversation and return the JSON:\n\n${conversationText}`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown code fences if present
    const text = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(text);

    const VALID_STATUSES = ["In Progress", "Blocked", "Done"];
    if (!VALID_STATUSES.includes(parsed.status)) {
      parsed.status = "In Progress";
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("analyze error:", err);
    return Response.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
