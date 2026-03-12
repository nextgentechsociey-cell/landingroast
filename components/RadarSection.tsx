"use client"

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from "recharts"

type Score = {
  score: number
}

type Analysis = {
  scores: {
    clarity: Score
    value_proposition: Score
    cta_strength: Score
    trust: Score
    visual_hierarchy: Score
    friction: Score
  }
}

export default function RadarSection({ analysis }: { analysis: Analysis }) {
  
  if (!analysis || !analysis.scores) {
  return null
  }
  
  const data = [
  { category: "Clarity", value: analysis?.scores?.clarity?.score ?? 0 },
  { category: "Value", value: analysis?.scores?.value_proposition?.score ?? 0 },
  { category: "CTA", value: analysis?.scores?.cta_strength?.score ?? 0 },
  { category: "Trust", value: analysis?.scores?.trust?.score ?? 0 },
  { category: "Hierarchy", value: analysis?.scores?.visual_hierarchy?.score ?? 0 },
  { category: "Friction", value: analysis?.scores?.friction?.score ?? 0 }
]

  return (
    <div className="w-full h-[320px] mt-6">
      <h2 className="text-lg font-semibold mb-4">
        Conversion Breakdown
      </h2>

      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="category" />
          <PolarRadiusAxis domain={[0, 10]} />

          <Radar
            name="Score"
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}