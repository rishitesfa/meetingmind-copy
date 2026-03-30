import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { google } from "googleapis"

function getAuth(accessToken) {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ access_token: accessToken })
  return auth
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) return Response.json({ error: "Not authenticated" }, { status: 401 })

  const auth = getAuth(session.accessToken)
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "all"

  try {
    if (type === "calendar") {
      const calendar = google.calendar({ version: "v3", auth })
      const now = new Date()
      const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: weekOut.toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      })
      const events = (res.data.items || []).map(ev => ({
        id: ev.id,
        title: ev.summary || "Untitled",
        date: ev.start?.dateTime || ev.start?.date,
        attendees: (ev.attendees || []).map(a => a.displayName || a.email),
        description: (ev.description || "").slice(0, 300),
      }))
      return Response.json({ events })
    }

    if (type === "emails") {
      const gmail = google.gmail({ version: "v1", auth })
      const list = await gmail.users.messages.list({ userId: "me", maxResults: 5, labelIds: ["INBOX"] })
      const messages = await Promise.all((list.data.messages || []).map(async m => {
        const msg = await gmail.users.messages.get({ userId: "me", id: m.id, format: "metadata", metadataHeaders: ["From", "Subject", "Date"] })
        const h = msg.data.payload?.headers || []
        const get = n => h.find(x => x.name === n)?.value || ""
        return { from: get("From").replace(/<.*>/, "").trim(), subject: get("Subject"), snippet: msg.data.snippet?.slice(0, 100) }
      }))
      return Response.json({ messages })
    }

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
