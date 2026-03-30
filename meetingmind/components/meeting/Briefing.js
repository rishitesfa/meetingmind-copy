"use client"
import { useState } from "react"
import s from "./Briefing.module.css"

export default function Briefing({ prefill, pastMeetings, onStart, onSkip }) {
  const [title, setTitle] = useState(prefill?.title || "")
  const [participants, setParticipants] = useState(prefill?.participants || "")
  const [loading, setLoading] = useState(false)
  const [briefing, setBriefing] = useState(null)

  const loadBriefing = async () => {
    if (!participants.trim()) return
    setLoading(true)
    try {
      const relevant = pastMeetings.filter(m =>
        participants.toLowerCase().split(",").some(p =>
          m.participants?.some(mp => mp.name?.toLowerCase().includes(p.trim().toLowerCase()))
          || m.title?.toLowerCase().includes(p.trim().toLowerCase())
        )
      ).slice(0, 5)

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "briefing", participants, pastMeetings: relevant })
      })
      const data = await res.json()
      setBriefing(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.header}>
          <div className={s.logo}>meeting<span>mind</span></div>
          <div className={s.headerTitle}>Pre-meeting briefing</div>
        </div>

        <div className={s.fields}>
          <div className={s.field}>
            <label className={s.label}>Meeting title</label>
            <input className={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. PowerScience Q2 Review" />
          </div>
          <div className={s.field}>
            <label className={s.label}>Participants (names or emails, comma separated)</label>
            <input className={s.input} value={participants} onChange={e => setParticipants(e.target.value)} placeholder="e.g. Sarah Chen, Mike from PowerScience" />
          </div>
          {!briefing && (
            <button className={s.briefBtn} onClick={loadBriefing} disabled={loading || !participants.trim()}>
              {loading ? "Loading briefing..." : "Get pre-meeting briefing"}
            </button>
          )}
        </div>

        {briefing && (
          <div className={s.briefing}>
            {briefing.lastMeeting && (
              <div className={s.bSection}>
                <div className={s.bLabel}>Last meeting</div>
                <div className={s.bText}>{briefing.lastMeeting}</div>
              </div>
            )}
            {briefing.openActions?.length > 0 && (
              <div className={s.bSection}>
                <div className={s.bLabel}>Open actions from last time</div>
                {briefing.openActions.map((a, i) => (
                  <div key={i} className={s.actionRow}>
                    <div className={`${s.actionDot} ${a.status === "done" ? s.actionDone : s.actionOpen}`}/>
                    <span>{a.text}</span>
                    {a.owner && <span className={s.owner}>{a.owner}</span>}
                  </div>
                ))}
              </div>
            )}
            {briefing.keyContext?.length > 0 && (
              <div className={s.bSection}>
                <div className={s.bLabel}>Key context</div>
                {briefing.keyContext.map((c, i) => <div key={i} className={s.contextItem}>— {c}</div>)}
              </div>
            )}
            {briefing.suggestedTopics?.length > 0 && (
              <div className={s.bSection}>
                <div className={s.bLabel}>Suggested follow-ups</div>
                {briefing.suggestedTopics.map((t, i) => <div key={i} className={s.contextItem}>→ {t}</div>)}
              </div>
            )}
            {briefing.relationshipNote && (
              <div className={s.relNote}>{briefing.relationshipNote}</div>
            )}
          </div>
        )}

        {pastMeetings.length === 0 && !briefing && !loading && participants && (
          <div className={s.noHistory}>No past meetings with these participants yet — context will build over time.</div>
        )}

        <div className={s.actions}>
          <button className={s.skipBtn} onClick={() => onSkip(title, participants)}>Skip briefing</button>
          <button className={s.startBtn} onClick={() => onStart(title, participants, briefing)} disabled={!title.trim()}>
            Start meeting →
          </button>
        </div>
      </div>
    </div>
  )
}
