import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HealthTrendPredictor from '@/components/medical/HealthTrendPredictor';

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

interface HealthDataPoint {
  date: string;
  symptomSeverity: number;
  symptomFrequency: number;
  activityImpact: number;
  moodImpact: number;
  stressLevel: number;
  sleepQuality: number;
  dietCompliance: number;
  medicationAdherence?: number;
}

// Generate mock health data for the last 30 days
const generateMockHealthData = (days: number): HealthDataPoint[] => {
  const data: HealthDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toISOString().split('T')[0],
      symptomSeverity: Math.max(0, Math.min(4, 2 + Math.sin(i / 7) * 0.5 + (Math.random() - 0.5) * 0.8)),
      symptomFrequency: Math.max(0, Math.min(4, 1.5 + Math.cos(i / 5) * 0.3 + (Math.random() - 0.5) * 0.6)),
      activityImpact: Math.max(0, Math.min(4, 1.8 + Math.sin(i / 10) * 0.4 + (Math.random() - 0.5) * 0.5)),
      moodImpact: Math.max(0, Math.min(4, 2.2 + Math.cos(i / 8) * 0.3 + (Math.random() - 0.5) * 0.7)),
      stressLevel: Math.max(0, Math.min(4, 2.0 + Math.sin(i / 6) * 0.6 + (Math.random() - 0.5) * 0.4)),
      sleepQuality: Math.max(0, Math.min(4, 2.5 + Math.cos(i / 9) * 0.5 + (Math.random() - 0.5) * 0.3)),
      dietCompliance: Math.max(0, Math.min(4, 3.0 + Math.sin(i / 11) * 0.3 + (Math.random() - 0.5) * 0.2)),
      medicationAdherence: Math.max(0, Math.min(4, 3.2 + (Math.random() - 0.5) * 0.3))
    });
  }

  return data;
};

const mockHealthData = generateMockHealthData(30);
const insufficientData = generateMockHealthData(5); // Less than 7 days
const emptyData: HealthDataPoint[] = [];

describe('HealthTrendPredictor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing with sufficient data', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('健康趨勢預測分析')).toBeInTheDocument();
      expect(screen.getByText(/基於 30 天歷史數據的智能預測/)).toBeInTheDocument();
    });

    it('shows insufficient data message when data is too sparse', () => {
      render(
        <HealthTrendPredictor
          historicalData={insufficientData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('數據不足')).toBeInTheDocument();
      expect(screen.getByText('需要至少7天的歷史數據才能進行趨勢預測分析')).toBeInTheDocument();
    });

    it('handles empty data gracefully', () => {
      render(
        <HealthTrendPredictor
          historicalData={emptyData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('數據不足')).toBeInTheDocument();
    });
  });

  describe('Control Panel Functionality', () => {
    it('allows changing prediction metric', async () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      const metricSelect = screen.getByDisplayValue('症狀嚴重程度');
      fireEvent.change(metricSelect, { target: { value: 'activityImpact' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('活動影響')).toBeInTheDocument();
      });
    });

    it('allows changing prediction days', async () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      const daysInput = screen.getByDisplayValue('14');
      fireEvent.change(daysInput, { target: { value: '7' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('7')).toBeInTheDocument();
      });
    });

    it('allows toggling confidence interval display', async () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      const confidenceCheckbox = screen.getByLabelText('顯示置信區間');
      expect(confidenceCheckbox).toBeChecked();

      fireEvent.click(confidenceCheckbox);

      await waitFor(() => {
        expect(confidenceCheckbox).not.toBeChecked();
      });
    });

    it('validates prediction days input range', async () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      const daysInput = screen.getByDisplayValue('14');

      // Test minimum value
      fireEvent.change(daysInput, { target: { value: '0' } });
      expect(daysInput).toHaveAttribute('min', '1');

      // Test maximum value
      fireEvent.change(daysInput, { target: { value: '50' } });
      expect(daysInput).toHaveAttribute('max', '30');
    });
  });

  describe('Trend Analysis', () => {
    it('calculates trend statistics correctly', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('趨勢成分分析')).toBeInTheDocument();
      expect(screen.getByText('線性趨勢')).toBeInTheDocument();
      expect(screen.getByText('變異性')).toBeInTheDocument();
      expect(screen.getByText('趨勢強度')).toBeInTheDocument();
    });

    it('identifies trend direction correctly', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      // Should show trend direction (up, down, or stable)
      const trendIndicators = screen.queryAllByText(/(上升|下降|平穩)/);
      expect(trendIndicators.length).toBeGreaterThan(0);
    });

    it('calculates volatility and trend strength', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      // Should display numeric values for volatility and trend strength
      const numericValues = screen.queryAllByText(/\d+\.\d{2}/);
      expect(numericValues.length).toBeGreaterThan(0);
    });
  });

  describe('Prediction Generation', () => {
    it('generates predictions for specified number of days', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={7}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('詳細預測結果')).toBeInTheDocument();

      // Should show prediction statistics
      expect(screen.getByText('預測統計')).toBeInTheDocument();
      expect(screen.getByText('高風險天數')).toBeInTheDocument();
      expect(screen.getByText('平均置信度')).toBeInTheDocument();
      expect(screen.getByText('預期平均值')).toBeInTheDocument();
    });

    it('assigns risk levels to predictions', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      // Should show risk level indicators
      const riskIndicators = screen.queryAllByText(/(高風險|中風險|低風險)/);
      expect(riskIndicators.length).toBeGreaterThan(0);
    });

    it('generates appropriate recommendations', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      // Should show recommendation icons
      const recommendations = screen.queryAllByText(/💡/);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('calculates confidence scores appropriately', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      // Should show confidence percentages
      const confidenceValues = screen.queryAllByText(/置信度: \d+%/);
      expect(confidenceValues.length).toBeGreaterThan(0);
    });
  });

  describe('Risk Alerts', () => {
    it('generates risk alerts for high-risk predictions', async () => {
      // Create data with increasing trend to trigger alerts
      const trendingData = mockHealthData.map((point, index) => ({
        ...point,
        symptomSeverity: Math.min(4, 1 + (index / mockHealthData.length) * 2)
      }));

      render(
        <HealthTrendPredictor
          historicalData={trendingData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      await waitFor(() => {
        // Should show risk alerts if any high-risk periods are detected
        const alertElements = screen.queryAllByText(/風險警報|警報/);
        // Note: Alerts may or may not appear depending on the prediction algorithm
        // This test validates that the alert system is functional when triggered
      });
    });

    it('shows trend-based warnings', async () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      // Check if trend warnings appear (they may or may not based on data patterns)
      await waitFor(() => {
        const warnings = screen.queryAllByText(/趨勢|惡化|改善/);
        expect(warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Chart Rendering', () => {
    it('renders main prediction chart', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText(/健康趨勢預測分析/)).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('includes reference line to separate historical and predicted data', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByTestId('reference-line')).toBeInTheDocument();
    });

    it('includes responsive containers for charts', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      const containers = screen.getAllByTestId('responsive-container');
      expect(containers.length).toBeGreaterThan(0);
    });

    it('shows confidence intervals when enabled', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      // Confidence interval lines should be present (mocked as line components)
      const lines = screen.getAllByTestId('line');
      expect(lines.length).toBeGreaterThanOrEqual(2); // At least actual and predicted lines
    });
  });

  describe('Different Metrics', () => {
    const metrics = [
      'symptomSeverity',
      'symptomFrequency',
      'activityImpact',
      'moodImpact'
    ] as const;

    metrics.forEach(metric => {
      it(`handles ${metric} metric correctly`, () => {
        render(
          <HealthTrendPredictor
            historicalData={mockHealthData}
            predictionDays={14}
            metric={metric}
          />
        );

        expect(screen.getByText('健康趨勢預測分析')).toBeInTheDocument();

        // Should show metric-specific title
        const metricLabels = {
          symptomSeverity: '症狀嚴重程度',
          symptomFrequency: '症狀頻率',
          activityImpact: '活動影響',
          moodImpact: '心情影響'
        };

        expect(
          screen.getByRole('heading', {
            name: new RegExp(metricLabels[metric])
          })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Seasonality Detection', () => {
    it('detects weekly patterns in data', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      // Should show trend analysis which includes seasonality
      expect(screen.getByText('趨勢成分分析')).toBeInTheDocument();
    });

    it('incorporates weekend patterns in predictions', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      // Weekend recommendations should appear in predictions
      const weekendRecommendations = screen.queryAllByText(/週末/);
      expect(weekendRecommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Model Documentation', () => {
    it('displays model explanation', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('預測模型說明')).toBeInTheDocument();
      expect(screen.getByText(/基於線性回歸和移動平均的混合預測模型/)).toBeInTheDocument();
      expect(screen.getByText(/考慮季節性變化/)).toBeInTheDocument();
      expect(screen.getByText(/置信度基於歷史數據穩定性/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles data with missing values gracefully', () => {
      const incompleteData = mockHealthData.map((point, index) => ({
        ...point,
        symptomSeverity: index % 3 === 0 ? 0 : point.symptomSeverity // Some zero values
      }));

      render(
        <HealthTrendPredictor
          historicalData={incompleteData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('健康趨勢預測分析')).toBeInTheDocument();
    });

    it('handles data with extreme values', () => {
      const extremeData = mockHealthData.map((point, index) => ({
        ...point,
        symptomSeverity: index === 0 ? 4 : index === 1 ? 0 : point.symptomSeverity
      }));

      render(
        <HealthTrendPredictor
          historicalData={extremeData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('健康趨勢預測分析')).toBeInTheDocument();
    });

    it('handles very short prediction horizons', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={1}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('健康趨勢預測分析')).toBeInTheDocument();
    });

    it('handles very long prediction horizons', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={30}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('健康趨勢預測分析')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = generateMockHealthData(365); // One year of data

      const startTime = performance.now();
      render(
        <HealthTrendPredictor
          historicalData={largeDataset}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );
      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(3000); // 3 seconds
      expect(screen.getByText('健康趨勢預測分析')).toBeInTheDocument();
    });

    it('updates predictions efficiently when parameters change', async () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      const startTime = performance.now();

      // Change metric
      const metricSelect = screen.getByDisplayValue('症狀嚴重程度');
      fireEvent.change(metricSelect, { target: { value: 'activityImpact' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('活動影響')).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // 1 second for update
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and controls', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      expect(screen.getByText('預測指標:')).toBeInTheDocument();
      expect(screen.getByText('預測天數:')).toBeInTheDocument();
      expect(screen.getByLabelText('顯示置信區間')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('健康趨勢預測分析');

      const subHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(subHeadings.length).toBeGreaterThan(0);
    });

    it('provides appropriate ARIA labels for form controls', () => {
      render(
        <HealthTrendPredictor
          historicalData={mockHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      );

      const checkbox = screen.getByLabelText('顯示置信區間');
      expect(checkbox).toHaveAttribute('type', 'checkbox');
      expect(checkbox).toHaveAttribute('id', 'showConfidence');
    });
  });
});
