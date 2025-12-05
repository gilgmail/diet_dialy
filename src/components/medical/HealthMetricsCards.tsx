'use client';

import React from 'react';
import { Activity, Heart, Droplet, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HealthMetricsOverview, HealthMetricStatistics } from '@/types/medical';

interface HealthMetricsCardsProps {
  overview: HealthMetricsOverview;
  dataQuality: string;
  qualityNotes: string[];
  className?: string;
}

interface MetricCardConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  unit: string;
  getColor: (avg: number) => { bg: string; border: string; text: string };
  formatValue: (val: number) => string;
}

const metricConfigs: Record<string, MetricCardConfig> = {
  steps: {
    icon: Activity,
    label: '每日步數',
    unit: '步',
    getColor: (avg) => {
      if (avg >= 8000) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' };
      if (avg >= 5000) return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
      if (avg >= 3000) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' };
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' };
    },
    formatValue: (val) => Math.round(val).toLocaleString()
  },
  heartRate: {
    icon: Heart,
    label: '平均心率',
    unit: 'bpm',
    getColor: (avg) => {
      if (avg >= 60 && avg <= 80) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' };
      if ((avg >= 50 && avg < 60) || (avg > 80 && avg <= 90)) return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
      if ((avg >= 40 && avg < 50) || (avg > 90 && avg <= 100)) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' };
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' };
    },
    formatValue: (val) => Math.round(val).toString()
  },
  activeCalories: {
    icon: Zap,
    label: '活動消耗',
    unit: 'kcal',
    getColor: (avg) => {
      if (avg >= 300) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' };
      if (avg >= 150) return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
      if (avg >= 50) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' };
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' };
    },
    formatValue: (val) => Math.round(val).toLocaleString()
  },
  waterIntake: {
    icon: Droplet,
    label: '飲水量',
    unit: 'ml',
    getColor: (avg) => {
      if (avg >= 2000) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' };
      if (avg >= 1500) return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
      if (avg >= 1000) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' };
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' };
    },
    formatValue: (val) => Math.round(val).toLocaleString()
  },
  stressScore: {
    icon: Zap,
    label: '壓力分數',
    unit: '/10',
    getColor: (avg) => {
      if (avg <= 3) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' };
      if (avg <= 5) return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
      if (avg <= 7) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' };
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' };
    },
    formatValue: (val) => val.toFixed(1)
  }
};

const getTrendIcon = (trend: string) => {
  if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-600" />;
  if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-600" />;
  if (trend === 'stable') return <Minus className="w-4 h-4 text-gray-600" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const getTrendLabel = (trend: string) => {
  if (trend === 'improving') return '改善中';
  if (trend === 'declining') return '下降中';
  if (trend === 'stable') return '穩定';
  return '資料不足';
};

const MetricCard = ({ stats, config }: { stats: HealthMetricStatistics; config: MetricCardConfig }) => {
  const Icon = config.icon;
  const colors = config.getColor(stats.average);

  return (
    <div className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${colors.text}`} />
          <span className={`text-sm font-medium ${colors.text}`}>{config.label}</span>
        </div>
        <div className="flex items-center gap-1">
          {getTrendIcon(stats.trend)}
          <span className="text-xs text-gray-600">{getTrendLabel(stats.trend)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${colors.text}`}>{config.formatValue(stats.average)}</span>
          <span className="text-sm text-gray-600">{config.unit}</span>
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>範圍：</span>
            <span className="font-medium">
              {config.formatValue(stats.min)} - {config.formatValue(stats.max)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>資料完整度：</span>
            <span className="font-medium">{Math.round(stats.coverage)}%</span>
          </div>
          <div className="flex justify-between">
            <span>資料天數：</span>
            <span className="font-medium">{stats.daysWithData}/{stats.totalDays} 天</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function HealthMetricsCards({
  overview,
  dataQuality,
  qualityNotes,
  className = ''
}: HealthMetricsCardsProps) {
  const metrics = [
    { key: 'steps', stats: overview.steps },
    { key: 'heartRate', stats: overview.heartRate },
    { key: 'activeCalories', stats: overview.activeCalories },
    { key: 'waterIntake', stats: overview.waterIntake },
    { key: 'stressScore', stats: overview.stressScore }
  ].filter(m => m.stats !== undefined && metricConfigs[m.key]);

  if (metrics.length === 0) {
    return null;
  }

  const qualityColorMap: Record<string, { bg: string; border: string; text: string }> = {
    excellent: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800' },
    good: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800' },
    fair: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800' },
    poor: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800' }
  };

  const qualityColors = (qualityColorMap[dataQuality] || qualityColorMap.fair) as { bg: string; border: string; text: string };

  return (
    <div className={className}>
      {/* Data Quality Banner */}
      <div className={`mb-4 p-3 rounded-lg border ${qualityColors.border} ${qualityColors.bg}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-sm font-medium ${qualityColors.text}`}>
            資料品質：{dataQuality === 'excellent' ? '優秀' : dataQuality === 'good' ? '良好' : dataQuality === 'fair' ? '尚可' : '不足'}
          </span>
        </div>
        {qualityNotes.length > 0 && (
          <ul className="text-xs text-gray-700 space-y-1 pl-4 list-disc">
            {qualityNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(({ key, stats }) => (
          <MetricCard key={key} stats={stats!} config={metricConfigs[key]!} />
        ))}
      </div>
    </div>
  );
}
