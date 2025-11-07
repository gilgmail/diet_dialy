import { NextRequest, NextResponse } from 'next/server'
import { IBDWeeklyAnalysisAgent } from '@/lib/ai/weekly-ibd-analysis'

/**
 * GET /api/ai/default-prompt
 *
 * 返回當前使用的預設 AI 提示詞
 * 用於 Debug 模式下讓使用者查看和編輯預設提示詞
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const variant = searchParams.get('variant') || 'balanced'

    // 獲取所有可用的提示詞變體
    const templates = IBDWeeklyAnalysisAgent.getPromptTemplates()

    // 如果請求特定變體
    if (variant && variant !== 'balanced') {
      const selectedTemplate = templates.find(t => t.key === variant)
      if (selectedTemplate) {
        return NextResponse.json({
          success: true,
          variant: variant,
          prompt: selectedTemplate.prompt,
          label: selectedTemplate.label,
          description: selectedTemplate.description,
          availableVariants: templates.map(t => ({
            key: t.key,
            label: t.label,
            description: t.description,
          })),
        })
      }
    }

    // 預設返回 balanced 變體
    const defaultPrompt = IBDWeeklyAnalysisAgent.getDefaultPrompt()
    const defaultTemplate = templates.find(t => t.key === 'balanced')

    return NextResponse.json({
      success: true,
      variant: 'balanced',
      prompt: defaultPrompt,
      label: defaultTemplate?.label || '綜合分析營養師',
      description: defaultTemplate?.description || '平衡評估營養亮點、潛在風險與腸道修復策略的全面分析。',
      availableVariants: templates.map(t => ({
        key: t.key,
        label: t.label,
        description: t.description,
      })),
    })
  } catch (error) {
    console.error('[GET /api/ai/default-prompt] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch default prompt',
      },
      { status: 500 }
    )
  }
}
