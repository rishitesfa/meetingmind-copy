import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  const { transcript, pastMeetings, participants, mode } = await req.json()

  // MODE: briefing — pre-meeting context from past meetings
  if (mode === "briefing") {
    const system = `You are a meeting intelligence assistant. Given past meeting history with a person/team, generate a pre-meeting briefing.
Return ONLY valid JSON:
{
  "lastMeeting": "date and brief summary of last meeting",
  "openActions": [{"text": "action item text", "owner": "name", "status": "open|done"}],
  "keyContext": ["important context point 1", "context point 2"],
  "suggestedTopics": ["topic to follow up on"],
  "relationshipNote": "brief note on relationship dynamic / what to be aware of"
}`
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages: [{
        role: "user",
        content: `Participants: ${participants}\n\nPast meetings:\n${JSON.stringify(pastMeetings, null, 2)}`
      }]
    })
    const raw = msg.content.find(b => b.type === "text")?.text || "{}"
    try {
      return Response.json(JSON.parse(raw.replace(/```json|```/g, "").trim()))
    } catch { return Response.json({ error: "parse error" }, { status: 500 }) }
  }

  // MODE: analyze — live transcript → structured dashboard
  const system = `You are a real-time meeting intelligence layer. Analyze this meeting transcript and extract structured data.
Return ONLY valid JSON:
{
  "title": "meeting title inferred from conversation",
  "summary": "2-3 sentence summary of what's been discussed so far",
  "participants": [{"name": "name or Speaker 1", "role": "inferred role if possible"}],
  "decisions": [{"text": "decision made", "timestamp": "approx when"}],
  "actionItems": [
    {
      "text": "specific action item",
      "owner": "person responsible or 'TBD'",
      "priority": "high|medium|low",
      "tool": "notion|slack|jira|google|none",
      "toolAction": "brief description of what to do in that tool e.g. 'Create task in Notion'"
    }
  ],
  "topics": [{"label": "topic", "status": "discussed|ongoing|parked"}],
  "liveQueries": [],
  "wellnessNudge": null,
  "sentiment": "positive|neutral|tense|energetic"
}

For wellnessNudge: if you detect stress, fast pace, tension, or anxiety patterns in the transcript, set to a SHORT string like "Slow down — recipient seems tense" or "Take a breath, pace is fast". Otherwise null.
For liveQueries: if anyone asks about data (revenue, numbers, pipeline, status of something) that could be fetched, add {"query": "what they asked", "type": "revenue|pipeline|status|other"}.
Keep action items specific and actionable. Tool should be the best fit: notion for docs/tasks, slack for comms, google for calendar/docs.`

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: `Transcript so far:\n\n${transcript}` }]
    })
    const raw = msg.content.find(b => b.type === "text")?.text || "{}"
    return Response.json(JSON.parse(raw.replace(/```json|```/g, "").trim()))
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
