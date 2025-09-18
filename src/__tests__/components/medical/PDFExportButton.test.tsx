import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PDFExportButton from '@/components/medical/PDFExportButton';

// Mock jsPDF and html2canvas
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
    text: jest.fn(),
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    addPage: jest.fn(),
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297
      }
    }
  }));
});

jest.mock('html2canvas', () => {
  return jest.fn().mockResolvedValue({
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockImageData')
  });
});

const mockReportData = {
  reportType: 'weekly_summary',
  period: {
    startDate: '2024-01-01',
    endDate: '2024-01-07'
  },
  summary: {
    totalFoods: 25,
    uniqueFoods: 15,
    averageMedicalScore: 7.2,
    highRiskFoods: 3,
    totalSymptoms: 8
  },
  medicalInsights: {
    keyFindings: [
      'Spicy foods correlate with increased symptoms',
      'Dairy products show moderate correlation'
    ],
    recommendations: [
      'Avoid spicy foods during flare-ups',
      'Consider lactose-free alternatives',
      'Increase fiber intake gradually'
    ],
    warningSignals: ['Frequent abdominal pain', 'Recurring nausea']
  },
  metadata: {
    generatedAt: '2024-01-07T10:00:00Z',
    confidenceScore: 85,
    dataPoints: 150,
    primaryCondition: 'IBD',
    disclaimer: 'This report is for informational purposes only.'
  }
};

describe('PDFExportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getElementById for HTML-to-canvas export
    const mockElement = document.createElement('div');
    mockElement.id = 'report-content';
    mockElement.innerHTML = '<h1>Mock Report Content</h1>';

    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders export button', () => {
    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
      />
    );

    expect(screen.getByRole('button', { name: /導出 PDF/i })).toBeInTheDocument();
  });

  it('shows loading state during export', async () => {
    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
      />
    );

    const exportButton = screen.getByRole('button', { name: /導出 PDF/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/處理中/i)).toBeInTheDocument();
    });
  });

  it('disables button during export', async () => {
    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
      />
    );

    const exportButton = screen.getByRole('button', { name: /導出 PDF/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportButton).toBeDisabled();
    });
  });

  it('calls html2canvas for HTML export mode', async () => {
    const html2canvas = require('html2canvas');

    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
        mode="html"
      />
    );

    const exportButton = screen.getByRole('button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(html2canvas).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          scale: 2,
          useCORS: true,
          allowTaint: true
        })
      );
    });
  });

  it('generates structured PDF for data export mode', async () => {
    const jsPDF = require('jspdf');

    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
        mode="data"
      />
    );

    const exportButton = screen.getByRole('button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(jsPDF).toHaveBeenCalled();
    });
  });

  it('handles export errors gracefully', async () => {
    const html2canvas = require('html2canvas');
    html2canvas.mockRejectedValueOnce(new Error('Canvas error'));

    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
      />
    );

    const exportButton = screen.getByRole('button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/處理中|匯出失敗|PDF 生成失敗/i)).toBeInTheDocument();
    });
  });

  it('shows error message when element not found', async () => {
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
        mode="html"
      />
    );

    const exportButton = screen.getByRole('button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/找不到要匯出的內容/i)).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
        className="custom-class"
      />
    );

    const exportButton = screen.getByRole('button');
    expect(exportButton).toHaveClass('custom-class');
  });

  it('includes report metadata in structured export', async () => {
    const jsPDF = require('jspdf');
    const mockPDFInstance = {
      addImage: jest.fn(),
      save: jest.fn(),
      text: jest.fn(),
      setFontSize: jest.fn(),
      setFont: jest.fn(),
      addPage: jest.fn(),
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297
        }
      }
    };

    jsPDF.mockReturnValue(mockPDFInstance);

    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
        mode="data"
      />
    );

    const exportButton = screen.getByRole('button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        expect.stringContaining('Diet Daily'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  it('shows progress during export', async () => {
    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
      />
    );

    const exportButton = screen.getByRole('button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('resets state after successful export', async () => {
    render(
      <PDFExportButton
        data={mockReportData}
        filename="test-report"
      />
    );

    const exportButton = screen.getByRole('button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/匯出完成/i)).toBeInTheDocument();
    });

    // Wait for auto-reset
    await waitFor(() => {
      expect(screen.queryByText(/匯出完成/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});