"use client"
import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Briefing from "../../components/meeting/Briefing"
import MeetingRoom from "../../components/meeting/MeetingRoom"

export default function MeetingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [phase, setPhase] = useState("briefing") // briefing | active | ended
  const [prefill, setPrefill] = useState(null)
  const [briefingData, setBriefingData] = useState(null)
  const [pastMeetings, setPastMeetings] = useState([])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
    // Load prefill from sessionStorage
    try {
      const pf = sessionStorage.getItem("mm_prefill")
      if (pf) { setPrefill(JSON.parse(pf)); sessionStorage.removeItem("mm_prefill") }
    } catch {}
    // Load past meetings
    try {
      const saved = JSON.parse(localStorage.getItem("meetingmind_meetings") || "[]")
      setPastMeetings(saved)
    } catch {}
  }, [status])

  const saveMeeting = (meetingData) => {
    try {
      const saved = JSON.parse(localStorage.getItem("meetingmind_meetings") || "[]")
      const updated = [meetingData, ...saved].slice(0, 20)
      localStorage.setItem("meetingmind_meetings", JSON.stringify(updated))
    } catch {}
  }

  if (status === "loading") return null

  if (phase === "briefing") return (
    <Briefing
      prefill={prefill}
      pastMeetings={pastMeetings}
      onStart={(title, participants, briefing) => {
        setBriefingData({ title, participants, briefing })
        setPhase("active")
      }}
      onSkip={(title, participants) => {
        setBriefingData({ title, participants, briefing: null })
        setPhase("active")
      }}
    />
  )

  if (phase === "active") return (
    <MeetingRoom
      title={briefingData?.title}
      participants={briefingData?.participants}
      briefing={briefingData?.briefing}
      pastMeetings={pastMeetings}
      onEnd={(meetingData) => {
        saveMeeting(meetingData)
        router.push("/")
      }}
    />
  )

  return null
}
