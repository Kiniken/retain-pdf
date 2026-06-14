export function progressPercent(current?: number | null, total?: number | null) {
  if (!Number.isFinite(current) || !Number.isFinite(total) || !total || total <= 0) {
    return 0
  }

  return Math.max(0, Math.min(100, ((current as number) / (total as number)) * 100))
}
