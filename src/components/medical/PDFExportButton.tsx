'use client';

import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFExportButtonProps {
  data?: any;
  reportElement?: string;
  filename?: string;
  className?: string;
  mode?: 'html' | 'data';
}

export default function PDFExportButton({
  data,
  reportElement = '#report-content',
  filename = 'medical-report',
  className = '',
  mode = 'html'
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  // Auto-reset status after success
  useEffect(() => {
    if (exportStatus === 'success') {
      const timer = setTimeout(() => {
        setExportStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [exportStatus]);

  const exportHtmlToPDF = async () => {
    setIsExporting(true);
    setExportStatus('processing');
    setErrorMessage('');
    setProgress(20);

    try {
      const element = document.getElementById('report-content');
      if (!element) {
        throw new Error('找不到要匯出的內容');
      }

      setProgress(40);

      // 使用 html2canvas 截取元素
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      setProgress(70);

      // 創建 PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 計算圖片尺寸以適應 A4
      const imgWidth = 190;
      const pageHeight = 277;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 10;

      // 添加圖片到 PDF
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 如果內容超過一頁，添加更多頁面
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      setProgress(90);

      // 下載 PDF
      const timestamp = new Date().toISOString().slice(0, 10);
      pdf.save(`${filename}-${timestamp}.pdf`);

      setProgress(100);
      setExportStatus('success');
    } catch (error) {
      console.error('PDF 導出錯誤:', error);
      setExportStatus('error');
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('PDF 生成失敗');
      }
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const exportDataToPDF = async () => {
    if (!data) {
      setErrorMessage('沒有可用的報告資料');
      setExportStatus('error');
      return;
    }

    setIsExporting(true);
    setExportStatus('processing');
    setErrorMessage('');
    setProgress(20);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;
      const lineHeight = 7;

      setProgress(40);

      // 添加標題
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('Diet Daily', 10, yPosition);
      yPosition += 15;

      // 添加生成時間
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`生成時間: ${new Date().toLocaleString('zh-TW')}`, 10, yPosition);
      yPosition += 10;

      setProgress(60);

      // 添加報告數據
      if (data.summary) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('📊 報告摘要', 10, yPosition);
        yPosition += 10;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.text(`總食物記錄: ${data.summary.totalFoods || 0}`, 15, yPosition);
        yPosition += lineHeight;
        pdf.text(`平均醫療評分: ${data.summary.averageMedicalScore || 'N/A'}`, 15, yPosition);
        yPosition += lineHeight;
        pdf.text(`高風險食物: ${data.summary.highRiskFoods || 0}`, 15, yPosition);
        yPosition += 10;
      }

      setProgress(80);

      // 添加醫療洞察
      if (data.medicalInsights && data.medicalInsights.keyFindings) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('🏥 醫療洞察', 10, yPosition);
        yPosition += 10;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);

        data.medicalInsights.keyFindings.forEach((finding: string) => {
          pdf.text(`• ${finding}`, 15, yPosition);
          yPosition += lineHeight;
        });
      }

      setProgress(90);

      // 下載 PDF
      const timestamp = new Date().toISOString().slice(0, 10);
      pdf.save(`${filename}-${timestamp}.pdf`);

      setProgress(100);
      setExportStatus('success');
    } catch (error) {
      console.error('PDF 導出錯誤:', error);
      setExportStatus('error');
      setErrorMessage('PDF 生成失敗');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleExport = async () => {
    if (mode === 'data') {
      await exportDataToPDF();
    } else {
      await exportHtmlToPDF();
    }
  };

  const getButtonText = () => {
    if (exportStatus === 'processing') return '處理中';
    if (exportStatus === 'success') return '匯出完成';
    if (exportStatus === 'error') return errorMessage || 'PDF 生成失敗';
    return '導出 PDF';
  };

  const getButtonIcon = () => {
    if (exportStatus === 'processing') {
      return (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }

    return (
      <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`
          inline-flex items-center px-4 py-2
          border border-transparent rounded-md shadow-sm
          text-sm font-medium text-white
          bg-red-600 hover:bg-red-700
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          ${className}
        `}
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>

      {exportStatus === 'processing' && (
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}