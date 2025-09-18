import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SymptomAnalysisEngine from '@/components/medical/SymptomAnalysisEngine';

// Mock recharts to avoid SSR issues in tests
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => <div data-testid="radar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

interface SymptomRecord {
  id: string;
  timestamp: string;
  symptoms: string[];
  severity: number;
  duration: number;
  triggers: string[];
  notes: string;
  activityImpact: number;
  moodImpact: number;
  sleepQuality: number;
  stressLevel: number;
}

const mockSymptomRecords: SymptomRecord[] = [
  {
    id: '1',
    timestamp: '2024-01-01T10:00:00Z',
    symptoms: ['abdominal_pain', 'nausea'],
    severity: 3,
    duration: 120,
    triggers: ['spicy_food', 'stress'],
    notes: 'After eating spicy curry',
    activityImpact: 2,
    moodImpact: 2,
    sleepQuality: 2,
    stressLevel: 3
  },
  {
    id: '2',
    timestamp: '2024-01-02T14:00:00Z',
    symptoms: ['fatigue', 'bloating'],
    severity: 2,
    duration: 180,
    triggers: ['lack_of_sleep'],
    notes: 'Poor sleep last night',
    activityImpact: 1,
    moodImpact: 3,
    sleepQuality: 1,
    stressLevel: 2
  },
  {
    id: '3',
    timestamp: '2024-01-03T09:00:00Z',
    symptoms: ['abdominal_pain'],
    severity: 4,
    duration: 240,
    triggers: ['dairy', 'stress'],
    notes: 'Severe pain after milk',
    activityImpact: 3,
    moodImpact: 4,
    sleepQuality: 2,
    stressLevel: 4
  },
  {
    id: '4',
    timestamp: '2024-01-04T16:00:00Z',
    symptoms: ['nausea', 'headache'],
    severity: 2,
    duration: 90,
    triggers: ['caffeine'],
    notes: 'Too much coffee',
    activityImpact: 1,
    moodImpact: 2,
    sleepQuality: 3,
    stressLevel: 2
  },
  {
    id: '5',
    timestamp: '2024-01-05T11:00:00Z',
    symptoms: ['bloating', 'abdominal_pain'],
    severity: 3,
    duration: 150,
    triggers: ['high_fiber', 'stress'],
    notes: 'After eating beans',
    activityImpact: 2,
    moodImpact: 2,
    sleepQuality: 3,
    stressLevel: 3
  }
];

const emptyRecords: SymptomRecord[] = [];

describe('SymptomAnalysisEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing with valid data', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      expect(screen.getByText('症狀智能分析系統')).toBeInTheDocument();
      expect(screen.getByText(/基於 5 條記錄的深度分析報告/)).toBeInTheDocument();
    });

    it('renders with empty data gracefully', () => {
      render(<SymptomAnalysisEngine records={emptyRecords} timeRange="7d" />);

      expect(screen.getByText('症狀智能分析系統')).toBeInTheDocument();
      expect(screen.getByText(/基於 0 條記錄的深度分析報告/)).toBeInTheDocument();
    });

    it('displays all navigation tabs', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      expect(screen.getByRole('tab', { name: /總覽分析/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /模式識別/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /相關性/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /趨勢分析/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /預測建議/ })).toBeInTheDocument();
    });
  });

  describe('Overview Tab Functionality', () => {
    it('displays correct summary statistics', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      // Total records
      expect(screen.getByText('5')).toBeInTheDocument();

      // Unique symptoms count
      const uniqueSymptoms = new Set(mockSymptomRecords.flatMap(r => r.symptoms)).size;
      expect(screen.getByText(uniqueSymptoms.toString())).toBeInTheDocument();

      // Average severity
      const avgSeverity = mockSymptomRecords.reduce((sum, r) => sum + r.severity, 0) / mockSymptomRecords.length;
      expect(screen.getByText(avgSeverity.toFixed(1))).toBeInTheDocument();

      // Unique triggers count
      const uniqueTriggers = new Set(mockSymptomRecords.flatMap(r => r.triggers)).size;
      expect(screen.getByText(uniqueTriggers.toString())).toBeInTheDocument();
    });

    it('renders symptom frequency chart', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      expect(screen.getByText('症狀頻率分析')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('renders severity distribution pie chart', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      expect(screen.getByText('嚴重程度分佈')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to patterns tab when clicked', async () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      const patternsTab = screen.getByRole('tab', { name: /模式識別/ });
      fireEvent.click(patternsTab);

      await waitFor(() => {
        expect(screen.getByText('症狀影響雷達圖')).toBeInTheDocument();
        expect(screen.getByText('症狀發生時間模式')).toBeInTheDocument();
        expect(screen.getByText('症狀觸發因子分析')).toBeInTheDocument();
      });
    });

    it('switches to correlations tab when clicked', async () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      const correlationsTab = screen.getByRole('tab', { name: /相關性/ });
      fireEvent.click(correlationsTab);

      await waitFor(() => {
        expect(screen.getByText('症狀相關性分析')).toBeInTheDocument();
        expect(screen.getByText('症狀嚴重程度與影響關係')).toBeInTheDocument();
      });
    });

    it('switches to trends tab when clicked', async () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      const trendsTab = screen.getByRole('tab', { name: /趨勢分析/ });
      fireEvent.click(trendsTab);

      await waitFor(() => {
        expect(screen.getByText('症狀趨勢分析')).toBeInTheDocument();
        expect(screen.getByText('症狀複雜度趨勢')).toBeInTheDocument();
      });
    });

    it('switches to predictions tab when clicked', async () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      const predictionsTab = screen.getByRole('tab', { name: /預測建議/ });
      fireEvent.click(predictionsTab);

      await waitFor(() => {
        expect(screen.getByText('症狀預測分析')).toBeInTheDocument();
        expect(screen.getByText('基於模式的風險預測')).toBeInTheDocument();
        expect(screen.getByText('個人化改善建議')).toBeInTheDocument();
      });
    });
  });

  describe('Time Range Filtering', () => {
    it('filters data correctly for 7d range', () => {
      const recentRecords = mockSymptomRecords.map((record, index) => ({
        ...record,
        timestamp: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString()
      }));

      render(<SymptomAnalysisEngine records={recentRecords} timeRange="7d" />);

      // Should show filtered count in header
      expect(screen.getByText(/基於 \d+ 條記錄的深度分析報告 \(7d\)/)).toBeInTheDocument();
    });

    it('shows all data for "all" time range', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="all" />);

      expect(screen.getByText(/基於 5 條記錄的深度分析報告 \(all\)/)).toBeInTheDocument();
    });
  });

  describe('Data Analysis Logic', () => {
    it('calculates symptom patterns correctly', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      // Switch to patterns tab to trigger pattern calculation
      const patternsTab = screen.getByRole('tab', { name: /模式識別/ });
      fireEvent.click(patternsTab);

      // Should render pattern components
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    it('generates predictions based on data patterns', async () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      const predictionsTab = screen.getByRole('tab', { name: /預測建議/ });
      fireEvent.click(predictionsTab);

      await waitFor(() => {
        // Should show risk predictions
        expect(screen.getByText(/基於過去/)).toBeInTheDocument();
        expect(screen.getByText(/風險/)).toBeInTheDocument();
      });
    });

    it('handles trend analysis with sufficient data', async () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      const trendsTab = screen.getByRole('tab', { name: /趨勢分析/ });
      fireEvent.click(trendsTab);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Components', () => {
    it('renders all chart types correctly', async () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      // Overview charts
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

      // Patterns tab charts
      const patternsTab = screen.getByRole('tab', { name: /模式識別/ });
      fireEvent.click(patternsTab);

      await waitFor(() => {
        expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });

      // Correlations tab charts
      const correlationsTab = screen.getByRole('tab', { name: /相關性/ });
      fireEvent.click(correlationsTab);

      await waitFor(() => {
        expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
      });

      // Trends tab charts
      const trendsTab = screen.getByRole('tab', { name: /趨勢分析/ });
      fireEvent.click(trendsTab);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getAllByTestId('area-chart')).toHaveLength(1);
      });
    });

    it('includes responsive containers for all charts', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      const containers = screen.getAllByTestId('responsive-container');
      expect(containers.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for tabs', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(5);

      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('has proper heading structure', () => {
      render(<SymptomAnalysisEngine records={mockSymptomRecords} timeRange="30d" />);

      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('症狀智能分析系統');
    });
  });

  describe('Edge Cases', () => {
    it('handles records with missing symptoms gracefully', () => {
      const incompleteRecords = [
        {
          ...mockSymptomRecords[0],
          symptoms: []
        }
      ];

      render(<SymptomAnalysisEngine records={incompleteRecords} timeRange="30d" />);

      expect(screen.getByText('症狀智能分析系統')).toBeInTheDocument();
    });

    it('handles records with missing triggers gracefully', () => {
      const incompleteRecords = [
        {
          ...mockSymptomRecords[0],
          triggers: []
        }
      ];

      render(<SymptomAnalysisEngine records={incompleteRecords} timeRange="30d" />);

      expect(screen.getByText('症狀智能分析系統')).toBeInTheDocument();
    });

    it('handles extreme severity values', () => {
      const extremeRecords = [
        {
          ...mockSymptomRecords[0],
          severity: 0
        },
        {
          ...mockSymptomRecords[1],
          severity: 4
        }
      ];

      render(<SymptomAnalysisEngine records={extremeRecords} timeRange="30d" />);

      expect(screen.getByText('2')).toBeInTheDocument(); // Average severity
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 100 }, (_, index) => ({
        ...mockSymptomRecords[0],
        id: `large-${index}`,
        timestamp: new Date(Date.now() - index * 60 * 60 * 1000).toISOString()
      }));

      const startTime = performance.now();
      render(<SymptomAnalysisEngine records={largeDataset} timeRange="30d" />);
      const endTime = performance.now();

      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByText('症狀智能分析系統')).toBeInTheDocument();
    });
  });
});