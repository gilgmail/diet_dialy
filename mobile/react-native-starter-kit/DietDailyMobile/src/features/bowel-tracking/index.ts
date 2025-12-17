/**
 * Bowel Tracking Feature - Public API
 *
 * 排便追蹤功能的公開 API
 */

// Screens
export { BowelMovementDashboardScreen } from './screens/BowelMovementDashboardScreen';

// Components
export { BristolScaleChart } from './components/BristolScaleChart';
export { FrequencyTrendChart } from './components/FrequencyTrendChart';
export { BowelMovementCalendar } from './components/BowelMovementCalendar';
export { InsightCard } from './components/InsightCard';
export { StatCard } from './components/StatCard';

// Hooks
export { useBowelMovementStats } from './hooks/useBowelMovementStats';

// Types
export type {
  BristolData,
  BowelMovementInsight,
  DailyFrequency,
  BowelMovementStats,
} from './hooks/useBowelMovementStats';
