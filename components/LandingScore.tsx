"use client"

import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"

type Props = {
  score: number
}

type Grade = {
  label: string
  color: string
}

function getGrade(score: number): Grade {
  if (score >= 80) return { label: "Excellent", color: "#22c55e" }
  if (score >= 65) return { label: "Good", color: "#84cc16" }
  if (score >= 50) return { label: "Fair", color: "#eab308" }
  if (score >= 35) return { label: "Needs Work", color: "#f97316" }
  return { label: "Poor", color: "#ef4444" }
}

export default function LandingScore({ score }: Props) {
  const { label, color } = getGrade(score)

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="h-36 w-36">
        <CircularProgressbar
          value={score}
          maxValue={100}
          text={`${score}`}
          styles={buildStyles({
            pathColor: color,
            trailColor: "#1e293b",
            textColor: "#f8fafc",
            textSize: "22px",
            pathTransitionDuration: 0.6,
          })}
        />
      </div>

      <div className="text-center">
        <p
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color }}
        >
          {label}
        </p>
        <p className="mt-1 text-xs text-slate-500">Conversion Score</p>
      </div>
    </div>
  )
}
