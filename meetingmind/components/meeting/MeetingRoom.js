"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import s from "./MeetingRoom.module.css"

const TOOL_LINKS = {
  notion: { label: "Notion", color: "#1A1916", url: "https://notion.so/new" },
  slack:  { label: "Slack",  color: "#4A154B", url: "https://app.slack.com/client" },
  google: { label: "Google", color: "#1A3A6B", url: "https://calendar.google.com" },
  jira:   { label: "Jira",   color: "#0052CC", url: "https://id.atlassian.com" },
}

export default function MeetingRoom({ title, participants, briefing, pastMeetings, onEnd }) {
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimText, setInterimText] = useState("")
  const [dashboard, setDashboard] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState("actions")
  const [nudge, setNudge] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [liveQueries, setLiveQueries] = useState([])
  const [queryInput, setQueryInput] = useState("")

  const recognitionRef = useRef(null)
  const analyzeTimerRef = useRef(null)
  const elapsedTimerRef = useRef(null)
  const startTimeRef = useRef(null)
  const transcriptRef = useRef("")

  // Keep ref in sync
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  const analyze = useCallback(async (text) => {
    if (!text || text.length < 50 || analyzing) return
    setAnalyzing(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, participants, mode: "analyze" })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDashboard(data)
      if (data.wellnessNudge) {
        setNudge(data.wellnessNudge)
        setTimeout(() => setNudge(null), 8000)
      }
      if (data.liveQueries?.length > 0) {
        setLiveQueries(prev => [...prev, ...data.liveQueries])
      }
    } catch (e) { console.error("Analyze error:", e) }
    setAnalyzing(false)
  }, [participants, analyzing])

  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition requires Chrome browser. Please open this in Chrome.")
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (e) => {
      let interim = ""
      let final = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " "
        else interim += e.results[i][0].transcript
      }
      if (final) setTranscript(prev => prev + final)
      setInterimText(interim)
    }
    recognition.onerror = (e) => {
      if (e.error !== "no-speech") console.error("Speech error:", e.error)
    }
    recognition.onend = () => {
      if (recording) recognition.start() // auto-restart
    }

    recognition.start()
    recognitionRef.current = recognition
    setRecording(true)
    startTimeRef.current = Date.now()

    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    // Auto-analyze every 45 seconds
    analyzeTimerRef.current = setInterval(() => {
      analyze(transcriptRef.current)
    }, 45000)
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    clearInterval(analyzeTimerRef.current)
    clearInterval(elapsedTimerRef.current)
    setRecording(false)
    setInterimText("")
    // Final analysis
    analyze(transcriptRef.current)
  }

  const endMeeting = async () => {
    stopRecording()
    const duration = `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    const meetingData = {
      title: title || dashboard?.title || "Untitled meeting",
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      duration,
      transcript,
      participants: dashboard?.participants || [],
      actionItems: dashboard?.actionItems || [],
      decisions: dashboard?.decisions || [],
      summary: dashboard?.summary || "",
    }
    onEnd(meetingData)
  }

  const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`

  const handleQuery = (q) => {
    setQueryInput("")
    const query = q || queryInput.trim()
    if (!query) return
    // Show as pending live query
    setLiveQueries(prev => [...prev.filter(x => x.query !== query), { query, type: "manual", status: "fetching" }])
    // Analyze with query appended
    analyze(transcriptRef.current + `\n[User asked: ${query}]`)
    setTimeout(() => {
      setLiveQueries(prev => prev.map(x => x.query === query ? { ...x, status: "analyzed" } : x))
    }, 5000)
  }

  const tabs = [
    { id: "actions", label: "Action items" },
    { id: "decisions", label: "Decisions" },
    { id: "topics", label: "Topics" },
    { id: "people", label: "People" },
  ]

  return (
    <div className={s.shell}>
      {/* WELLNESS NUDGE */}
      {nudge && (
        <div className={s.nudge}>
          <span className={s.nudgeIcon}>○</span>
          {nudge}
          <button className={s.nudgeDismiss} onClick={() => setNudge(null)}>×</button>
        </div>
      )}

      {/* LEFT: Transcript */}
      <div className={s.left}>
        <div className={s.leftHead}>
          <div className={s.meetingTitle}>{title || "Meeting"}</div>
          {participants && <div className={s.meetingPax}>{participants}</div>}
          <div className={s.timer}>{fmtTime(elapsed)}</div>
        </div>

        <div className={s.transcriptWrap}>
          {!recording && !transcript && (
            <div className={s.transcriptEmpty}>
              <div className={s.teIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1.5"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div>Press record to start listening</div>
              <div className={s.teNote}>Uses your microphone — Chrome only</div>
            </div>
          )}
          {(transcript || interimText) && (
            <div className={s.transcript}>
              <span className={s.finalText}>{transcript}</span>
              <span className={s.interimText}>{interimText}</span>
            </div>
          )}
        </div>

        {/* Live query bar */}
        <div className={s.queryBar}>
          <input
            className={s.queryInput}
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleQuery()}
            placeholder="/ask anything mid-meeting — revenue, pipeline, status..."
          />
          <button className={s.queryBtn} onClick={() => handleQuery()} disabled={!queryInput.trim()}>Ask</button>
        </div>

        {liveQueries.length > 0 && (
          <div className={s.queriesList}>
            {liveQueries.slice(-3).map((q, i) => (
              <div key={i} className={s.queryItem}>
                <span className={s.queryQ}>{q.query}</span>
                <span className={s.queryStatus}>{q.status === "fetching" ? "fetching..." : "→ see dashboard"}</span>
              </div>
            ))}
          </div>
        )}

        <div className={s.controls}>
          {!recording ? (
            <button className={s.recBtn} onClick={startRecording}>
              <span className={s.recDot}/> Start recording
            </button>
          ) : (
            <button className={s.recBtnActive} onClick={stopRecording}>
              <span className={s.recDotActive}/> Recording — pause
            </button>
          )}
          <button className={s.analyzeBtn} onClick={() => analyze(transcript)} disabled={analyzing || !transcript}>
            {analyzing ? "Analysing..." : "Analyse now"}
          </button>
          <button className={s.endBtn} onClick={endMeeting}>End meeting</button>
        </div>
      </div>

      {/* RIGHT: Live Dashboard */}
      <div className={s.right}>
        <div className={s.rightHead}>
          <div className={s.dashTitle}>Live dashboard</div>
          {analyzing && <div className={s.analysingPill}>updating…</div>}
          {dashboard?.sentiment && (
            <div className={s[`sent_${dashboard.sentiment}`] || s.sent_neutral}>{dashboard.sentiment}</div>
          )}
        </div>

        {!dashboard && (
          <div className={s.dashEmpty}>
            Dashboard updates automatically as the meeting progresses.<br/>
            Hit "Analyse now" to process manually.
          </div>
        )}

        {dashboard && (
          <>
            {dashboard.summary && (
              <div className={s.summary}>{dashboard.summary}</div>
            )}

            <div className={s.tabsRow}>
              {tabs.map(t => (
                <div key={t.id} className={`${s.tab} ${activeTab === t.id ? s.tabOn : ""}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                  {t.id === "actions" && dashboard.actionItems?.length > 0 && (
                    <span className={s.tabCount}>{dashboard.actionItems.length}</span>
                  )}
                </div>
              ))}
            </div>

            {/* ACTION ITEMS */}
            {activeTab === "actions" && (
              <div className={s.tabContent}>
                {(dashboard.actionItems || []).length === 0 && <div className={s.empty}>No action items yet</div>}
                {(dashboard.actionItems || []).map((a, i) => (
                  <div key={i} className={s.actionCard}>
                    <div className={s.actionTop}>
                      <div className={s.actionText}>{a.text}</div>
                      <span className={`${s.priPill} ${s["pri_" + (a.priority || "medium")]}`}>{a.priority || "medium"}</span>
                    </div>
                    <div className={s.actionMeta}>
                      {a.owner && <span className={s.actionOwner}>{a.owner}</span>}
                      {a.tool && a.tool !== "none" && TOOL_LINKS[a.tool] && (
                        <a
                          href={TOOL_LINKS[a.tool].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={s.toolLink}
                          style={{ background: TOOL_LINKS[a.tool].color + "12", color: TOOL_LINKS[a.tool].color, borderColor: TOOL_LINKS[a.tool].color + "30" }}
                        >
                          → {a.toolAction || `Open in ${TOOL_LINKS[a.tool].label}`}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DECISIONS */}
            {activeTab === "decisions" && (
              <div className={s.tabContent}>
                {(dashboard.decisions || []).length === 0 && <div className={s.empty}>No decisions captured yet</div>}
                {(dashboard.decisions || []).map((d, i) => (
                  <div key={i} className={s.decisionCard}>
                    <div className={s.decisionMark}>✓</div>
                    <div>{d.text}</div>
                  </div>
                ))}
              </div>
            )}

            {/* TOPICS */}
            {activeTab === "topics" && (
              <div className={s.tabContent}>
                {(dashboard.topics || []).length === 0 && <div className={s.empty}>No topics detected yet</div>}
                {(dashboard.topics || []).map((t, i) => (
                  <div key={i} className={s.topicRow}>
                    <span className={s.topicLabel}>{t.label}</span>
                    <span className={`${s.topicStatus} ${s["ts_" + t.status]}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* PEOPLE */}
            {activeTab === "people" && (
              <div className={s.tabContent}>
                {(dashboard.participants || []).length === 0 && <div className={s.empty}>No participants detected yet</div>}
                <div className={s.peopleGrid}>
                  {(dashboard.participants || []).map((p, i) => (
                    <div key={i} className={s.personCard}>
                      <div className={s.personAv}>{(p.name || "?")[0].toUpperCase()}</div>
                      <div>
                        <div className={s.personName}>{p.name}</div>
                        {p.role && <div className={s.personRole}>{p.role}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {briefing && (
                  <div className={s.briefingRecap}>
                    <div className={s.brLabel}>Pre-meeting context</div>
                    {briefing.lastMeeting && <div className={s.brText}>{briefing.lastMeeting}</div>}
                    {briefing.relationshipNote && <div className={s.brNote}>{briefing.relationshipNote}</div>}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
