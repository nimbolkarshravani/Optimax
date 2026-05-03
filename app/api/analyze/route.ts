import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const VALID_STATUSES = [
  "In Progress",
  "Blocked",
  "Awaiting Verification",
  "Verified",
  "Done",
];

const SYSTEM_PROMPT = `You are a conversation analyst and quality checker. After every AI response, extract structured information and determine the correct status.

Return ONLY a valid JSON object with exactly these fields:
{
  "objective": "string - the main goal or problem being solved",
  "constraints": "string - limitations, requirements, or boundaries mentioned",
  "openQuestions": "string - only questions that are STILL unanswered",
  "assumptions": "string - things being assumed or taken for granted",
  "status": "string - MUST be exactly one of: In Progress, Blocked, Awaiting Verification, Verified, Done"
}

## Open Questions rules:
- Only list questions that have NOT yet been answered in the conversation.
- If a user message provides information that answers an open question, remove that question from the list.
- Example: if "What is the distance?" was open and the user says "the distance is 150 km", remove it.
- Do not carry forward resolved questions. The list should reflect only current unknowns.

## Status transition rules (follow strictly):

**In Progress** — default while the conversation is working toward the goal.

**Blocked** — the user is stuck, missing information, or hit an error that stops progress.

**Awaiting Verification** — set this ONLY when the USER (not the AI) explicitly shares their own
solution, answer, or output for the AI to check. Trigger phrases from the user: "here's my answer",
"is this correct?", "does this work?", "can you verify this", "check this", or they paste their
own code/output/calculation.
NEVER set this because the AI provided an answer — the AI answering does not count.

**Verified** — set this ONLY when the most recent status was "Awaiting Verification" AND the
user's solution satisfies the objective and all constraints.
If it fails any constraint, set status to "In Progress" and add a specific failure note to
openQuestions (e.g. "User's solution ignores the 150 km constraint").

**Done** — never set this automatically. Only valid if the user explicitly says "done" or "close"
after Verified, or manually sets it themselves.

## General rules:
- status MUST be one of the five values above — no other values are valid.
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
      max_tokens: 768,
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

    if (!VALID_STATUSES.includes(parsed.status)) {
      parsed.status = "In Progress";
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("analyze error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
