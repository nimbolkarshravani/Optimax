import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const VALID_STATUSES = [
  "Defining",
  "In Progress",
  "Blocked",
  "Awaiting Verification",
  "Verified",
  "Done",
];

const SYSTEM_PROMPT = `You are a conversation analyst and quality checker. After every AI response, extract structured information and determine the correct status.

You will receive the current status. Only change it when a genuine stage transition has occurred — do not change it for incremental field updates or minor clarifications.

Return ONLY a valid JSON object with exactly these fields:
{
  "objective": "string - the main goal or problem being solved",
  "constraints": "string - limitations, requirements, or boundaries mentioned",
  "openQuestions": "string - only questions that are STILL unanswered",
  "assumptions": "string - things being assumed or taken for granted",
  "status": "string - MUST be exactly one of: Defining, In Progress, Blocked, Awaiting Verification, Verified, Done"
}

## Open Questions rules:
- Only list questions that have NOT yet been answered in the conversation.
- If a user message provides information that answers an open question, remove it immediately.
- Example: "What is the distance?" was open → user says "150 km" → remove that question.
- Do not carry forward resolved questions. The list reflects only current unknowns.

## Status transition rules (follow strictly):

**Defining** — set this when the objective changes substantially mid-conversation (pivot detected):
the user abandons or significantly reframes the original goal. This resets the bar so the new
objective can be properly scoped. Do NOT set it for minor refinements to the same goal.

**In Progress** — default while the conversation is actively working toward the goal.

**Blocked** — the user is stuck, missing information, or hit an error that stops progress.

**Awaiting Verification** — set this ONLY when the USER (not the AI) explicitly submits their own
solution/output for review. Trigger phrases from the user: "here's my answer", "is this correct?",
"does this work?", "can you verify this", "check this", or they paste their own code/calculation.
NEVER set this because the AI provided an answer or completed a task — AI output does not count.

**Verified** — set ONLY when current status is "Awaiting Verification" AND the user's solution
satisfies the objective and every constraint. If it fails any constraint, keep status "In Progress"
and add a specific failure note to openQuestions.

**Done** — never set automatically. Only if the user explicitly says "done", "close", or "finished"
after Verified, or they set it manually.

## Status stickiness:
- Do NOT change status just because a field was updated or clarified.
- Only change status when a real stage boundary is crossed (see transitions above).
- When in doubt, keep the current status.

## General rules:
- status MUST be one of the six values above — no other values are valid.
- Be concise. If a field has no content yet, use an empty string.
- Return ONLY the JSON object, no markdown, no explanation.`;

export async function POST(request: Request) {
  try {
    const { messages, currentStatus } = await request.json();

    const conversationText = messages
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
      )
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 768,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Current status: "${currentStatus ?? "In Progress"}"\n\nAnalyze this conversation and return the JSON:\n\n${conversationText}`,
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

    if (!VALID_STATUSES.includes(parsed.status)) {
      parsed.status = "In Progress";
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("analyze error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
