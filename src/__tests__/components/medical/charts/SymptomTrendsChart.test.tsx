import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SymptomTrendsChart from '@/components/medical/charts/SymptomTrendsChart';
import type { SymptomTrend, FoodSymptomCorrelation, SeverityPattern } from '@/lib/medical/symptom-tracker';
import type { SymptomType } from '@/types/medical';

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

const mockWeeklyTrends: SymptomTrend[] = [
  {
    symptom_type: 'abdominal_pain',
    frequency: 5,
    average_severity: 6.2,
    common_triggers: ['spicy_food', 'dairy'],
    improvement_trend: 'improving'
  },
  {
    symptom_type: 'nausea',
    frequency: 3,
    average_severity: 4.5,
    common_triggers: ['fatty_foods'],
    improvement_trend: 'stable'
  }
];

const mockFoodCorrelations: FoodSymptomCorrelation[] = [
  {
    food_id: 'food_001',
    food_name: 'Spicy Food',
    symptom_types: ['abdominal_pain', 'nausea'],
    correlation_strength: 0.85,
    confidence_level: 'high',
    occurrences: 5,
    time_to_onset: 0.5
  }
];

const mockSeverityPatterns: SeverityPattern[] = [
  {
    symptom_type: 'abdominal_pain',
    time_of_day_pattern: {
      '06': 7.2,
      '12': 5.1,
      '18': 6.8,
      '22': 4.3
    },
    day_of_week_pattern: {
      'monday': 6.5,
      'tuesday': 5.8,
      'wednesday': 6.2,
      'thursday': 7.1,
      'friday': 5.9,
      'saturday': 4.2,
      'sunday': 4.8
    },
    severity_trend: 'improving'
  }
];

describe('SymptomTrendsChart', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <SymptomTrendsChart
        weeklyTrends={mockWeeklyTrends}
        foodCorrelations={mockFoodCorrelations}
        severityPatterns={mockSeverityPatterns}
      />
    );

    // Should render multiple chart containers (component has multiple charts)
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThan(0);
  });

  it('displays trend data correctly', () => {
    render(
      <SymptomTrendsChart
        weeklyTrends={mockWeeklyTrends}
        foodCorrelations={mockFoodCorrelations}
        severityPatterns={mockSeverityPatterns}
      />
    );

    // Should render chart components
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(
      <SymptomTrendsChart
        weeklyTrends={[]}
        foodCorrelations={[]}
        severityPatterns={[]}
      />
    );

    // Should still render containers without crashing
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThan(0);
  });

  it('renders food correlation data', () => {
    render(
      <SymptomTrendsChart
        weeklyTrends={mockWeeklyTrends}
        foodCorrelations={mockFoodCorrelations}
        severityPatterns={mockSeverityPatterns}
      />
    );

    // Chart should render without errors when correlation data is present
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThan(0);
  });

  it('renders severity pattern data', () => {
    render(
      <SymptomTrendsChart
        weeklyTrends={mockWeeklyTrends}
        foodCorrelations={mockFoodCorrelations}
        severityPatterns={mockSeverityPatterns}
      />
    );

    // Chart should render without errors when severity pattern data is present
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThan(0);
  });

  it('includes health trend summary', () => {
    render(
      <SymptomTrendsChart
        weeklyTrends={mockWeeklyTrends}
        foodCorrelations={mockFoodCorrelations}
        severityPatterns={mockSeverityPatterns}
      />
    );

    // Should show summary statistics
    expect(screen.getByText('健康趨勢摘要')).toBeInTheDocument();
    expect(screen.getByText('追蹤症狀類型')).toBeInTheDocument();
    expect(screen.getByText('改善中症狀')).toBeInTheDocument();
    expect(screen.getByText('食物關聯發現')).toBeInTheDocument();
  });

  it('renders with different improvement trends', () => {
    const worseningTrends: SymptomTrend[] = [
      {
        symptom_type: 'abdominal_pain',
        frequency: 7,
        average_severity: 8.2,
        common_triggers: ['spicy_food', 'dairy'],
        improvement_trend: 'worsening'
      }
    ];

    render(
      <SymptomTrendsChart
        weeklyTrends={worseningTrends}
        foodCorrelations={mockFoodCorrelations}
        severityPatterns={mockSeverityPatterns}
      />
    );

    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThan(0);
  });

  it('renders with multiple chart types', () => {
    render(
      <SymptomTrendsChart
        weeklyTrends={mockWeeklyTrends}
        foodCorrelations={mockFoodCorrelations}
        severityPatterns={mockSeverityPatterns}
      />
    );

    // Should include various chart components for different visualizations
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThan(0);

    // Should have line chart for trends
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    // Should have bar charts for other visualizations
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThan(0);
  });

  it('shows symptom statistics correctly', () => {
    render(
      <SymptomTrendsChart
        weeklyTrends={mockWeeklyTrends}
        foodCorrelations={mockFoodCorrelations}
        severityPatterns={mockSeverityPatterns}
      />
    );

    // Check for numeric statistics in the summary
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of symptom types
    expect(screen.getByText('1')).toBeInTheDocument(); // Number improving/correlations
  });
});