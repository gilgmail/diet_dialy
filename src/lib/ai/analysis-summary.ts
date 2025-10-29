import type { ConditionAnalysis, MultiConditionResult } from '@/lib/ai/multi-condition-scorer'

export interface MultiConditionSummary {
  highlights: string[]
  risks: string[]
}

const CONDITION_LABELS: Record<string, string> = {
  IBD: '炎症性腸病',
  IBS: '腸躁症',
  CANCER_CHEMO: '癌症化療',
  ALLERGIES: '過敏原'
}

const sanitizeText = (text?: string | null): string | null => {
  if (!text) return null
  const trimmed = text.replace(/\s+/g, ' ').trim()
  return trimmed.length > 0 ? trimmed : null
}

const addWithLabel = (set: Set<string>, label: string | null, text?: string | null) => {
  const cleaned = sanitizeText(text)
  if (!cleaned) return
  if (label) {
    set.add(`${label}：${cleaned}`)
  } else {
    set.add(cleaned)
  }
}

const getConditionLabel = (condition: ConditionAnalysis): string => {
  const baseLabel = CONDITION_LABELS[condition.condition] || condition.condition
  return condition.emoji ? `${condition.emoji} ${baseLabel}` : baseLabel
}

export const summarizeMultiConditionAnalysis = (
  result?: MultiConditionResult | null
): MultiConditionSummary => {
  if (!result) {
    return { highlights: [], risks: [] }
  }

  const highlights = new Set<string>()
  const risks = new Set<string>()

  result.conditions?.forEach((condition) => {
    const label = getConditionLabel(condition)

    condition.nutritional_highlights?.forEach((highlight) => {
      addWithLabel(highlights, label, highlight)
    })

    condition.recommendations?.forEach((recommendation) => {
      addWithLabel(highlights, `${label} 建議`, recommendation)
    })

    condition.reasoning?.slice(0, 2).forEach((reason) => {
      addWithLabel(highlights, `${label} 解析`, reason)
    })

    condition.risk_factors?.forEach((riskFactor) => {
      addWithLabel(risks, label, riskFactor)
    })

    condition.warnings?.forEach((warning) => {
      addWithLabel(risks, `${label} 警示`, warning)
    })
  })

  if (result.allergen_analysis) {
    const { detected_allergens, warnings, risk_level } = result.allergen_analysis

    if (Array.isArray(detected_allergens) && detected_allergens.length > 0) {
      addWithLabel(risks, '過敏原', detected_allergens.join('、'))
    }

    warnings?.forEach((warning) => {
      addWithLabel(risks, '過敏提醒', warning)
    })

    if (risk_level) {
      const levelLabel = {
        low: '低',
        medium: '中',
        high: '高',
        critical: '極高'
      }[risk_level] || risk_level
      addWithLabel(risks, null, `過敏風險等級：${levelLabel}`)
    }
  }

  if (result.general_analysis) {
    result.general_analysis.reasoning?.slice(0, 3).forEach((reason) => {
      addWithLabel(highlights, '綜合分析', reason)
    })

    if (result.general_analysis.recommendations) {
      result.general_analysis.recommendations
        .split(/[\n;]+/)
        .map((rec) => rec.trim())
        .filter((rec) => rec.length > 0)
        .forEach((rec) => addWithLabel(highlights, '整體建議', rec))
    }
  }

  return {
    highlights: Array.from(highlights),
    risks: Array.from(risks)
  }
}
