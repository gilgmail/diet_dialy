import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SymptomTrendsChart from '@/components/medical/charts/SymptomTrendsChart';
import { SymptomAnalysis } from '@/lib/medical/symptom-tracker';

// Mock recharts to avoid SSR issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  RadialBarChart: ({ children }: any) => <div data-testid="radial-bar-chart">{children}</div>,
  RadialBar: () => <div data-testid="radial-bar" />
}));

const mockSymptomData: SymptomAnalysis = {
  totalSymptoms: 15,
  symptomsByType: {
    'abdominal_pain': 8,
    'nausea': 4,
    'fatigue': 3
  },
  averageSeverity: 6.2,
  mostCommonSymptom: 'abdominal_pain',
  correlationAnalysis: {
    strongCorrelations: [
      {
        foodId: 'food_001',
        foodName: 'Spicy Food',
        correlationScore: 0.85,
        occurrences: 5,
        averageOnsetTime: 30,
        averageSeverity: 7.5
      }
    ],
    moderateCorrelations: [
      {
        foodId: 'food_002',
        foodName: 'Dairy Products',
        correlationScore: 0.65,
        occurrences: 3,
        averageOnsetTime: 45,
        averageSeverity: 5.0
      }
    ],
    weakCorrelations: []
  },
  trendAnalysis: {
    isImproving: true,
    improvementPercentage: 15,
    trendDescription: 'Symptoms decreasing over past 30 days'
  }
};

describe('SymptomTrendsChart', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SymptomTrendsChart data={mockSymptomData} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('displays all chart tabs', () => {
    render(<SymptomTrendsChart data={mockSymptomData} />);

    expect(screen.getByRole('tab', { name: /頻率趨勢/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /嚴重度分析/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /食物關聯/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /改善趨勢/i })).toBeInTheDocument();
  });

  it('shows frequency trend chart by default', () => {
    render(<SymptomTrendsChart data={mockSymptomData} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByText(/症狀頻率趨勢/i)).toBeInTheDocument();
  });

  it('displays symptom statistics', () => {
    render(<SymptomTrendsChart data={mockSymptomData} />);

    expect(screen.getByText('15')).toBeInTheDocument(); // totalSymptoms
    expect(screen.getByText('6.2')).toBeInTheDocument(); // averageSeverity
    expect(screen.getByText(/腹痛/i)).toBeInTheDocument(); // mostCommonSymptom
  });

  it('shows improvement trend when symptoms are improving', () => {
    render(<SymptomTrendsChart data={mockSymptomData} />);

    expect(screen.getByText(/症狀正在改善/i)).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
  });

  it('displays strong food correlations', () => {
    render(<SymptomTrendsChart data={mockSymptomData} />);

    expect(screen.getByText('Spicy Food')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // correlation score
  });

  it('handles empty correlation data gracefully', () => {
    const emptyData: SymptomAnalysis = {
      ...mockSymptomData,
      correlationAnalysis: {
        strongCorrelations: [],
        moderateCorrelations: [],
        weakCorrelations: []
      }
    };

    render(<SymptomTrendsChart data={emptyData} />);

    expect(screen.getByText(/目前沒有發現明顯的食物關聯/i)).toBeInTheDocument();
  });

  it('shows declining trend when symptoms are worsening', () => {
    const worseningData: SymptomAnalysis = {
      ...mockSymptomData,
      trendAnalysis: {
        isImproving: false,
        improvementPercentage: -10,
        trendDescription: 'Symptoms increasing over past 30 days'
      }
    };

    render(<SymptomTrendsChart data={worseningData} />);

    expect(screen.getByText(/症狀有惡化趨勢/i)).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('renders responsive containers for charts', () => {
    render(<SymptomTrendsChart data={mockSymptomData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('includes accessibility features', () => {
    render(<SymptomTrendsChart data={mockSymptomData} />);

    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('aria-labelledby');
  });
});