import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { createAdminClient } from '@/lib/supabase/server'

const HISTORY_BUCKET = 'ai-weekly-reports'

function decodeKey(key: string) {
  return Buffer.from(key, 'base64url').toString('utf8')
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params

  if (!reportId) {
    return NextResponse.json({ success: false, error: '缺少報告 ID' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const storage = admin.storage
    const fileKey = decodeKey(reportId)

    const download = await storage.from(HISTORY_BUCKET).download(fileKey)
    if (download.error) {
      throw download.error
    }

    const payload = JSON.parse(await download.data.text())

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const fontPath = join(process.cwd(), 'public', 'fonts', 'NotoSansCJKtc-Regular.otf')
    const fontBytes = await readFile(fontPath)
    const font = await pdfDoc.embedFont(fontBytes, { subset: true })
    const page = pdfDoc.addPage([595.28, 841.89])
    const { width, height } = page.getSize()
    let y = height - 72

    const drawText = (text: string, options: { size?: number; lineGap?: number } = {}) => {
      const size = options.size ?? 12
      const lineGap = options.lineGap ?? 4
      const lines = text.split('\n')
      lines.forEach((line) => {
        page.drawText(line, { x: 50, y, size, font })
        y -= size + lineGap
      })
      y -= lineGap
    }

    const drawTitle = (text: string) => {
      y -= 6
      page.drawText(text, { x: 50, y, size: 16, font })
      y -= 24
    }

    drawText('Diet Daily - IBD 每週 AI 分析報告', { size: 20, lineGap: 8 })
    drawText(`報告標題：AI 每週分析 ${payload.timeframe.startDate} ~ ${payload.timeframe.endDate}`)
    drawText(`分析期間：${payload.timeframe.startDate} ~ ${payload.timeframe.endDate}`)
    const analysisVersion =
      typeof payload.analysisVersion === 'string' ? payload.analysisVersion : 'legacy'
    const analysisModeText =
      typeof payload.analysisMode === 'string'
        ? payload.analysisMode === 'chunked'
          ? 'Chunked（分段）'
          : 'Single Pass'
        : 'Single Pass'
    drawText(`產出時間：${new Date(payload.generatedAt).toLocaleString('zh-TW')}`)
    drawText(`分析版本：${analysisVersion}`)
    drawText(`分析方式：${analysisModeText}`)

    if (payload.analysis?.summary) {
      drawTitle('核心摘要')
      drawText(payload.analysis.summary)
    }

    const ensureSpace = (minHeight: number) => {
      if (y < 72 + minHeight) {
        page.drawText('…', { x: width - 60, y: 40, size: 12, font })
        y = height - 72
      }
    }

    if (Array.isArray(payload.analysis?.reasoning_trace) && payload.analysis.reasoning_trace.length) {
      drawTitle('判斷推論')
      payload.analysis.reasoning_trace.forEach((item: any, index: number) => {
        ensureSpace(40)
        drawText(`${index + 1}. ${String(item)}`)
      })
    }

    if (Array.isArray(payload.analysis?.daily_food_breakdown) && payload.analysis.daily_food_breakdown.length) {
      drawTitle('每日餐點解析')
      payload.analysis.daily_food_breakdown.forEach((day: any) => {
        ensureSpace(80)
        drawText(`📅 ${day.date ?? '未提供日期'}`)
        if (day.day_summary) {
          drawText(`摘要：${day.day_summary}`, { size: 10 })
        }
        if (Array.isArray(day.meals)) {
          day.meals.forEach((meal: any) => {
            ensureSpace(60)
            drawText(`  🍽️ ${meal.meal ?? '未標註餐別'}`, { size: 11 })
            if (Array.isArray(meal.foods)) {
              meal.foods.forEach((food: any) => {
                ensureSpace(60)
                drawText(`    • ${food.name ?? '未命名食物'}（${food.suitability ?? 'neutral'}）`, { size: 10 })
                if (Array.isArray(food.reasoning) && food.reasoning.length) {
                  drawText(`      理由：${food.reasoning.join('；')}`, { size: 9 })
                }
                if (Array.isArray(food.symptom_links) && food.symptom_links.length) {
                  drawText(`      症狀連結：${food.symptom_links.join('；')}`, { size: 9 })
                }
                if (Array.isArray(food.notes) && food.notes.length) {
                  drawText(`      備註：${food.notes.join('；')}`, { size: 9 })
                }
              })
            }
          })
        }
      })
    }

    if (Array.isArray(payload.analysis?.foods_to_monitor) && payload.analysis.foods_to_monitor.length) {
      drawTitle('需留意食物')
      payload.analysis.foods_to_monitor.forEach((item: any, index: number) => {
        ensureSpace(80)
        drawText(`${index + 1}. ${item.food} (${item.risk_level})`)
        if (Array.isArray(item.reasoning) && item.reasoning.length) {
          drawText(`原因：${item.reasoning.join('、')}`, { size: 10 })
        }
        if (Array.isArray(item.recommended_actions) && item.recommended_actions.length) {
          drawText(`建議：${item.recommended_actions.join('、')}`, { size: 10 })
        }
      })
    }

    if (Array.isArray(payload.analysis?.supportive_foods) && payload.analysis.supportive_foods.length) {
      drawTitle('建議加強食物')
      payload.analysis.supportive_foods.forEach((item: any, index: number) => {
        ensureSpace(60)
        drawText(`${index + 1}. ${item.food}`)
        if (Array.isArray(item.benefits) && item.benefits.length) {
          drawText(`優點：${item.benefits.join('、')}`, { size: 10 })
        }
        if (Array.isArray(item.suggestions) && item.suggestions.length) {
          drawText(`建議：${item.suggestions.join('、')}`, { size: 10 })
        }
      })
    }

    if (payload.analysis?.next_steps) {
      const { maintain, monitor, experiments } = payload.analysis.next_steps
      if (
        (Array.isArray(maintain) && maintain.length) ||
        (Array.isArray(monitor) && monitor.length) ||
        (Array.isArray(experiments) && experiments.length)
      ) {
        drawTitle('下週調整計畫')
        if (Array.isArray(maintain) && maintain.length) {
          ensureSpace(40)
          drawText('維持策略：')
          maintain.forEach((item: any, index: number) => {
            ensureSpace(30)
            drawText(`  ${index + 1}. ${String(item)}`, { size: 10 })
          })
        }
        if (Array.isArray(monitor) && monitor.length) {
          ensureSpace(40)
          drawText('監測提醒：')
          monitor.forEach((item: any, index: number) => {
            ensureSpace(30)
            drawText(`  ${index + 1}. ${String(item)}`, { size: 10 })
          })
        }
        if (Array.isArray(experiments) && experiments.length) {
          ensureSpace(40)
          drawText('實驗/調整：')
          experiments.forEach((item: any, index: number) => {
            ensureSpace(30)
            drawText(`  ${index + 1}. ${String(item)}`, { size: 10 })
          })
        }
      }
    }

    if (Array.isArray(payload.analysis?.follow_up_actions) && payload.analysis.follow_up_actions.length) {
      drawTitle('下週行動重點')
      payload.analysis.follow_up_actions.forEach((item: any, index: number) => {
        ensureSpace(40)
        drawText(`${index + 1}. ${item}`)
      })
    }

    if (Array.isArray(payload.analysis?.warning_signs) && payload.analysis.warning_signs.length) {
      drawTitle('注意事項')
      payload.analysis.warning_signs.forEach((item: any, index: number) => {
        ensureSpace(40)
        drawText(`${index + 1}. ${item}`)
      })
    }

    if (Array.isArray(payload.analysis?.evidence_notes) && payload.analysis.evidence_notes.length) {
      drawTitle('資料證據')
      payload.analysis.evidence_notes.forEach((item: any, index: number) => {
        ensureSpace(30)
        drawText(`${index + 1}. ${String(item)}`, { size: 10 })
      })
    }

    drawText('此報告由 AI 輔助生成，僅供參考。請與專業醫療人員討論後再採取行動。', {
      size: 10,
      lineGap: 6,
    })

    const pdfBytes = await pdfDoc.save()
    const buffer = Buffer.from(pdfBytes)
    const fileName = encodeURIComponent(`ai-weekly-report-${payload.timeframe.startDate}-${payload.timeframe.endDate}.pdf`)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[weekly-ibd-analysis] PDF export error:', error)
    return NextResponse.json(
      { success: false, error: 'PDF 生成失敗' },
      { status: 500 }
    )
  }
}
