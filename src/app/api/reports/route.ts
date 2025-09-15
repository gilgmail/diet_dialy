import { NextRequest, NextResponse } from 'next/server';
import { medicalReportGenerator } from '@/lib/medical-report-generator';
import { MedicalReportRequest } from '@/types/medical-report';

// POST /api/reports - Generate medical report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reportRequest: MedicalReportRequest = body;

    // Validate required fields
    if (!reportRequest.userId || !reportRequest.reportType || !reportRequest.startDate || !reportRequest.endDate) {
      return NextResponse.json(
        { error: '缺少必要參數: userId, reportType, startDate, endDate' },
        { status: 400 }
      );
    }

    // Validate date range
    const startDate = new Date(reportRequest.startDate);
    const endDate = new Date(reportRequest.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: '無效的日期格式' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: '開始日期必須早於結束日期' },
        { status: 400 }
      );
    }

    // Generate report
    const report = await medicalReportGenerator.generateReport(reportRequest);

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('POST /api/reports error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成報告時發生錯誤'
      },
      { status: 500 }
    );
  }
}

// GET /api/reports - Get existing reports for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reportType = searchParams.get('reportType') as 'weekly' | 'monthly' | 'custom' | null;
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少必要參數: userId' },
        { status: 400 }
      );
    }

    // Get reports from generator (this would typically be from a database)
    const reports = await medicalReportGenerator.getReportsForUser(userId, {
      reportType,
      limit
    });

    return NextResponse.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '獲取報告時發生錯誤'
      },
      { status: 500 }
    );
  }
}