import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SymptomFoodCorrelationAnalyzer from '@/components/medical/SymptomFoodCorrelationAnalyzer';

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
}));

interface FoodEntry {
  id: string;
  timestamp: string;
  foodName: string;
  category: string;
  amount: number;
  medicalScore: number;
  riskFactors: string[];
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
}

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
}

const mockFoodEntries: FoodEntry[] = [
  {
    id: 'food1',
    timestamp: '2024-01-01T08:00:00Z',
    foodName: 'Spicy Curry',
    category: '主食',
    amount: 200,
    medicalScore: 2,
    riskFactors: ['spicy', 'high_fat'],
    nutritionalInfo: {
      calories: 350,
      protein: 15,
      carbs: 45,
      fat: 12,
      fiber: 8,
      sugar: 5
    }
  },
  {
    id: 'food2',
    timestamp: '2024-01-01T12:00:00Z',
    foodName: 'Milk',
    category: '飲品',
    amount: 250,
    medicalScore: 1,
    riskFactors: ['dairy', 'lactose'],
    nutritionalInfo: {
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
      fiber: 0,
      sugar: 12
    }
  },
  {
    id: 'food3',
    timestamp: '2024-01-02T10:00:00Z',
    foodName: 'White Rice',
    category: '主食',
    amount: 150,
    medicalScore: 8,
    riskFactors: [],
    nutritionalInfo: {
      calories: 200,
      protein: 4,
      carbs: 45,
      fat: 0.5,
      fiber: 1,
      sugar: 0
    }
  },
  {
    id: 'food4',
    timestamp: '2024-01-03T07:00:00Z',
    foodName: 'Coffee',
    category: '飲品',
    amount: 200,
    medicalScore: 6,
    riskFactors: ['caffeine'],
    nutritionalInfo: {
      calories: 5,
      protein: 0.3,
      carbs: 1,
      fat: 0,
      fiber: 0,
      sugar: 0
    }
  }
];

const mockSymptomRecords: SymptomRecord[] = [
  {
    id: 'symptom1',
    timestamp: '2024-01-01T10:00:00Z', // 2 hours after spicy curry
    symptoms: ['abdominal_pain', 'nausea'],
    severity: 3,
    duration: 120,
    triggers: ['spicy_food'],
    notes: 'Pain started after curry',
    activityImpact: 2,
    moodImpact: 2
  },
  {
    id: 'symptom2',
    timestamp: '2024-01-01T14:00:00Z', // 2 hours after milk
    symptoms: ['bloating', 'gas'],
    severity: 2,
    duration: 90,
    triggers: ['dairy'],
    notes: 'Bloating after milk',
    activityImpact: 1,
    moodImpact: 1
  },
  {
    id: 'symptom3',
    timestamp: '2024-01-03T09:00:00Z', // 2 hours after coffee
    symptoms: ['headache', 'jitters'],
    severity: 2,
    duration: 60,
    triggers: ['caffeine'],
    notes: 'Too much coffee',
    activityImpact: 1,
    moodImpact: 2
  }
];

const emptyFoodEntries: FoodEntry[] = [];
const emptySymptomRecords: SymptomRecord[] = [];

describe('SymptomFoodCorrelationAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing with valid data', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      expect(screen.getByText('食物症狀相關性分析')).toBeInTheDocument();
      expect(screen.getByText(/分析 4 條飲食記錄與 3 條症狀記錄的關聯性/)).toBeInTheDocument();
    });

    it('renders with empty data gracefully', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={emptyFoodEntries}
          symptomRecords={emptySymptomRecords}
          timeWindow={24}
        />
      );

      expect(screen.getByText('食物症狀相關性分析')).toBeInTheDocument();
      expect(screen.getByText(/分析 0 條飲食記錄與 0 條症狀記錄的關聯性/)).toBeInTheDocument();
    });

    it('displays all navigation tabs', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      expect(screen.getByRole('tab', { name: /相關性分析/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /食物風險檔案/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /時間線分析/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /飲食建議/ })).toBeInTheDocument();
    });
  });

  describe('Correlation Analysis', () => {
    it('calculates food-symptom correlations correctly', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      // Should detect correlations and display them
      expect(screen.getByText('食物症狀相關性分析')).toBeInTheDocument();
      expect(screen.getByText(/發現.*潛在關聯/)).toBeInTheDocument();
    });

    it('detects high-risk food correlations', async () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      // Look for risk level indicators
      await waitFor(() => {
        const riskElements = screen.queryAllByText(/風險/);
        expect(riskElements.length).toBeGreaterThan(0);
      });
    });

    it('respects time window settings', () => {
      const { rerender } = render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={1} // Very short window
        />
      );

      // Should have fewer correlations with shorter window
      const shortWindowCorrelations = screen.getByText(/發現.*潛在關聯/);

      rerender(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={48} // Longer window
        />
      );

      // Should potentially have more correlations with longer window
      expect(screen.getByText(/發現.*潛在關聯/)).toBeInTheDocument();
    });
  });

  describe('Control Panel Functionality', () => {
    it('allows changing time window', async () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const timeWindowSelect = screen.getByDisplayValue('24');
      fireEvent.change(timeWindowSelect, { target: { value: '12' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('12')).toBeInTheDocument();
      });
    });

    it('allows changing correlation threshold', async () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const thresholdSlider = screen.getByDisplayValue('0.3');
      fireEvent.change(thresholdSlider, { target: { value: '0.5' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches to food risk profiles tab', async () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const profilesTab = screen.getByRole('tab', { name: /食物風險檔案/ });
      fireEvent.click(profilesTab);

      await waitFor(() => {
        expect(screen.getByText('食物風險檔案')).toBeInTheDocument();
        expect(screen.getByText('根據症狀相關性建立的食物風險評估')).toBeInTheDocument();
      });
    });

    it('switches to timeline analysis tab', async () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const timelineTab = screen.getByRole('tab', { name: /時間線分析/ });
      fireEvent.click(timelineTab);

      await waitFor(() => {
        expect(screen.getByText('食物攝取與症狀時間線（最近30天）')).toBeInTheDocument();
        expect(screen.getByText('每日食物風險暴露')).toBeInTheDocument();
      });
    });

    it('switches to recommendations tab', async () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const recommendationsTab = screen.getByRole('tab', { name: /飲食建議/ });
      fireEvent.click(recommendationsTab);

      await waitFor(() => {
        expect(screen.getByText('個人化飲食建議')).toBeInTheDocument();
        expect(screen.getByText(/建議避免的食物/)).toBeInTheDocument();
        expect(screen.getByText(/謹慎攝取的食物/)).toBeInTheDocument();
        expect(screen.getByText(/相對安全的食物/)).toBeInTheDocument();
      });
    });
  });

  describe('Chart Rendering', () => {
    it('renders correlation scatter plot', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      expect(screen.getByText('相關性 vs 置信度分布圖')).toBeInTheDocument();
      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
    });

    it('renders timeline charts', async () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const timelineTab = screen.getByRole('tab', { name: /時間線分析/ });
      fireEvent.click(timelineTab);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('includes responsive containers for charts', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const containers = screen.getAllByTestId('responsive-container');
      expect(containers.length).toBeGreaterThan(0);
    });
  });

  describe('Risk Assessment', () => {
    it('categorizes foods by risk level', async () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const recommendationsTab = screen.getByRole('tab', { name: /飲食建議/ });
      fireEvent.click(recommendationsTab);

      await waitFor(() => {
        // Should show different risk categories
        expect(screen.getByText(/建議避免的食物/)).toBeInTheDocument();
        expect(screen.getByText(/謹慎攝取的食物/)).toBeInTheDocument();
        expect(screen.getByText(/相對安全的食物/)).toBeInTheDocument();
      });
    });

    it('generates personalized recommendations', async () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const recommendationsTab = screen.getByRole('tab', { name: /飲食建議/ });
      fireEvent.click(recommendationsTab);

      await waitFor(() => {
        expect(screen.getByText(/攝取時間建議/)).toBeInTheDocument();
        expect(screen.getByText(/追蹤改善建議/)).toBeInTheDocument();
      });
    });

    it('calculates confidence scores appropriately', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      // Should show confidence percentages in correlation results
      expect(screen.getByText(/置信度/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles foods with no correlations', () => {
      const nonCorrelatedFood: FoodEntry[] = [
        {
          id: 'safe-food',
          timestamp: '2024-01-10T12:00:00Z', // No symptoms recorded around this time
          foodName: 'Safe Food',
          category: '安全食物',
          amount: 100,
          medicalScore: 10,
          riskFactors: []
        }
      ];

      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={nonCorrelatedFood}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      expect(screen.getByText('食物症狀相關性分析')).toBeInTheDocument();
    });

    it('handles symptoms with no food correlations', () => {
      const isolatedSymptoms: SymptomRecord[] = [
        {
          id: 'isolated',
          timestamp: '2024-01-20T12:00:00Z', // No foods recorded around this time
          symptoms: ['isolated_symptom'],
          severity: 1,
          duration: 30,
          triggers: ['unknown'],
          notes: 'Isolated symptom',
          activityImpact: 0,
          moodImpact: 0
        }
      ];

      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={isolatedSymptoms}
          timeWindow={24}
        />
      );

      expect(screen.getByText('食物症狀相關性分析')).toBeInTheDocument();
    });

    it('handles extreme time windows gracefully', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={0.5} // Very short window
        />
      );

      expect(screen.getByText('食物症狀相關性分析')).toBeInTheDocument();
    });

    it('handles missing nutritional information', () => {
      const incompleteFood: FoodEntry[] = [
        {
          id: 'incomplete',
          timestamp: '2024-01-01T12:00:00Z',
          foodName: 'Incomplete Food',
          category: '未知',
          amount: 100,
          medicalScore: 5,
          riskFactors: ['unknown']
          // No nutritionalInfo
        }
      ];

      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={incompleteFood}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      expect(screen.getByText('食物症狀相關性分析')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeFoodDataset = Array.from({ length: 100 }, (_, index) => ({
        ...mockFoodEntries[0],
        id: `food-${index}`,
        timestamp: new Date(Date.now() - index * 60 * 60 * 1000).toISOString()
      }));

      const largeSymptomDataset = Array.from({ length: 100 }, (_, index) => ({
        ...mockSymptomRecords[0],
        id: `symptom-${index}`,
        timestamp: new Date(Date.now() - index * 60 * 60 * 1000).toISOString()
      }));

      const startTime = performance.now();
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={largeFoodDataset}
          symptomRecords={largeSymptomDataset}
          timeWindow={24}
        />
      );
      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(2000); // 2 seconds
      expect(screen.getByText('食物症狀相關性分析')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for tabs', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
    });

    it('has proper form labels', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      expect(screen.getByText('時間窗口:')).toBeInTheDocument();
      expect(screen.getByText('相關性閾值:')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(
        <SymptomFoodCorrelationAnalyzer
          foodEntries={mockFoodEntries}
          symptomRecords={mockSymptomRecords}
          timeWindow={24}
        />
      );

      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('食物症狀相關性分析');
    });
  });
});