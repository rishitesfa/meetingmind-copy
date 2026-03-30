// In-memory store for demo (replace with DB like Supabase/Postgres for production)
// Meetings are keyed by userId
const store = new Map()

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId") || "default"
  const meetings = store.get(userId) || []
  return Response.json({ meetings })
}

export async function POST(req) {
  const body = await req.json()
  const { userId = "default", meeting } = body
  const meetings = store.get(userId) || []
  // Keep last 20 meetings
  const updated = [meeting, ...meetings].slice(0, 20)
  store.set(userId, updated)
  return Response.json({ ok: true, meeting })
}
