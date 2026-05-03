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
  "openQuestions": "string - unresolved questions or things needing clarification",
  "assumptions": "string - things being assumed or taken for granted",
  "status": "string - MUST be exactly one of: In Progress, Blocked, Awaiting Verification, Verified, Done"
}

## Status transition rules (follow strictly):

**In Progress** — default while the conversation is working toward the goal.

**Blocked** — the user is stuck, missing information, or hit an error that stops progress.

**Awaiting Verification** — set this when the user signals they have a solution or answer
(phrases like "done", "finished", "here's my solution", "is this correct?", "does this work?",
"can you verify", "check this", or they paste a final answer/code/output for review).

**Verified** — set this ONLY when status was "Awaiting Verification" AND you have checked the
user's solution against the objective and all constraints and it genuinely satisfies them.
If the solution is incomplete or misses a constraint, do NOT set Verified — set "In Progress"
and add a specific failure note to openQuestions (e.g. "Solution ignores the 150 km constraint").

**Done** — never set this automatically. Only valid if the user explicitly says "done" or "close"
after Verified, or manually sets it themselves.

## Verification logic (applies when status should move from Awaiting Verification):
1. Re-read the objective.
2. Check every constraint against the proposed solution.
3. If all constraints are satisfied → set status to "Verified".
4. If any constraint is missed → set status to "In Progress", add a clear note in openQuestions
   describing exactly which constraint failed and why.

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
