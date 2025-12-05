type PerformanceEvent =
  | 'dashboard_fetch'
  | 'dashboard_calculation'
  | 'dashboard_ai'
  | 'dashboard_total'

interface PerformancePayload extends Record<string, unknown> {
  durationMs?: number
  userId?: string
}

export function recordPerformanceMetric(event: PerformanceEvent, payload: PerformancePayload = {}) {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    try {
      performance.mark(`${event}-${Date.now()}`)
    } catch {
      // Ignore marking failures in environments without full Performance API support
    }
  }

  // Placeholder: replace with analytics SDK / logging pipeline as needed
  console.log(`[Performance] ${event}`, payload)
}
