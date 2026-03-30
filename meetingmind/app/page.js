"use client"
import { useSession, signIn } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import s from "./page.module.css"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [meetings, setMeetings] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])

  useEffect(() => {
    if (!session) return
    // Load past meetings from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("meetingmind_meetings") || "[]")
      setMeetings(saved)
    } catch {}
    // Load upcoming calendar events
    fetch("/api/google?type=calendar")
      .then(r => r.json())
      .then(d => setUpcomingEvents(d.events || []))
      .catch(() => {})
  }, [session])

  const startMeeting = (prefill) => {
    if (prefill) {
      sessionStorage.setItem("mm_prefill", JSON.stringify(prefill))
    }
    router.push("/meeting")
  }

  if (status === "loading") return <div className={s.center}><div className={s.spin}/></div>

  if (!session) return (
    <div className={s.center}>
      <div className={s.loginCard}>
        <div className={s.logo}>meeting<span>mind</span></div>
        <p className={s.tagline}>Your meeting intelligence layer.</p>
        <p className={s.desc}>Live transcription, action items, pre-meeting briefs, and wellness nudges — all in one dashboard.</p>
        <button className={s.signInBtn} onClick={() => signIn("google")}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
        <p className={s.note}>Connects Gmail, Calendar & Drive. Never stores your data externally.</p>
      </div>
    </div>
  )

  return (
    <div className={s.shell}>
      <div className={s.sidebar}>
        <div className={s.sbHead}>
          <div className={s.logo}>meeting<span>mind</span></div>
        </div>
        <div className={s.sbBody}>
          <div className={s.sbLabel}>Navigation</div>
          <div className={`${s.sbItem} ${s.sbItemOn}`}>Dashboard</div>
          <div className={s.sbItem} onClick={() => router.push("/meeting")}>New meeting</div>
        </div>
        <div className={s.sbFoot}>
          <div className={s.userRow}>
            <div className={s.av}>{session.user?.name?.[0]}</div>
            <span className={s.userName}>{session.user?.name?.split(" ")[0]}</span>
          </div>
        </div>
      </div>

      <div className={s.main}>
        <div className={s.topbar}>
          <div className={s.topbarTitle}>Dashboard</div>
          <button className={s.newMeetingBtn} onClick={() => startMeeting(null)}>
            + New meeting
          </button>
        </div>

        <div className={s.content}>
          {/* Upcoming meetings */}
          {upcomingEvents.length > 0 && (
            <div className={s.section}>
              <div className={s.sectionLabel}>Upcoming from calendar</div>
              <div className={s.upcomingGrid}>
                {upcomingEvents.slice(0, 4).map((ev, i) => (
                  <div key={i} className={s.upcomingCard} onClick={() => startMeeting({ title: ev.title, participants: ev.attendees?.join(", ") })}>
                    <div className={s.upcomingTitle}>{ev.title}</div>
                    <div className={s.upcomingMeta}>{new Date(ev.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    {ev.attendees?.length > 0 && <div className={s.upcomingAttendees}>{ev.attendees.slice(0, 3).join(", ")}</div>}
                    <div className={s.upcomingAction}>Start with briefing →</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past meetings */}
          <div className={s.section}>
            <div className={s.sectionLabel}>Past meetings</div>
            {meetings.length === 0 ? (
              <div className={s.emptyState}>
                <div className={s.emptyTitle}>No meetings yet</div>
                <div className={s.emptyDesc}>Start your first meeting to see transcripts, action items, and insights here.</div>
                <button className={s.emptyBtn} onClick={() => startMeeting(null)}>Start meeting</button>
              </div>
            ) : (
              <div className={s.meetingList}>
                {meetings.map((m, i) => (
                  <div key={i} className={s.meetingRow}>
                    <div className={s.meetingDot} style={{ background: ["#9DC5B1","#C9A96E","#8AAAD4","#C98989"][i%4] }}/>
                    <div className={s.meetingInfo}>
                      <div className={s.meetingTitle}>{m.title || "Untitled meeting"}</div>
                      <div className={s.meetingMeta}>{m.date} · {m.duration || "?"} · {m.actionItems?.length || 0} actions</div>
                    </div>
                    <div className={s.meetingActions}>
                      {(m.actionItems || []).filter(a => a.status !== "done").length > 0 && (
                        <span className={s.openBadge}>{(m.actionItems || []).filter(a => a.status !== "done").length} open</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
