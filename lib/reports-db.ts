import { supabase } from "./supabase"
import type { RoastAnalysis } from "./roasts"

export type StoredReportPayload = {
  url: string
  title: string
  headline: string
  analysis: RoastAnalysis
  roastUrl?: string
  competitors?: unknown
}

export async function saveReport(
  id: string,
  url: string,
  payload: StoredReportPayload,
): Promise<void> {
  if (!supabase) return

  try {
    await supabase.from("reports").insert({
      id,
      url,
      analysis_json: payload,
    })
  } catch {
    // Fail silently – sharing is best-effort only.
  }
}

export async function getReportById(
  id: string,
): Promise<StoredReportPayload | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("reports")
      .select("analysis_json")
      .eq("id", id)
      .maybeSingle()

    if (error || !data) return null

    return data.analysis_json as StoredReportPayload
  } catch {
    return null
  }
}

