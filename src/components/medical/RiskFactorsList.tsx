'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Heart,
  Brain
} from 'lucide-react';
import type { MedicalCondition } from '@/types/medical';

interface RiskFactor {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'food' | 'timing' | 'portion' | 'preparation' | 'interaction';
  medicalConditions: MedicalCondition[];
  recommendations: string[];
  timeframe: string;
  evidence: string;
}

interface RiskFactorsListProps {
  medicalConditions: MedicalCondition[];
  className?: string;
}

const SAMPLE_RISK_FACTORS: RiskFactor[] = [
  {
    id: 'high-fiber-ibd',
    name: '高纖維食物',
    description: 'IBD急性期食用高纖維食物可能引發腸道發炎加劇',
    severity: 'high',
    category: 'food',
    medicalConditions: ['ibd', 'crohns', 'uc'],
    recommendations: [
      '急性期避免生菜、全穀類、堅果',
      '選擇去皮水果和蒸煮蔬菜',
      '緩解期可逐步增加纖維攝取'
    ],
    timeframe: '症狀出現後 2-6 小時',
    evidence: '基於 AGA 2025 指導原則'
  },
  {
    id: 'raw-foods-chemo',
    name: '生食感染風險',
    description: '化療期間免疫系統較弱，生食可能導致嚴重感染',
    severity: 'critical',
    category: 'preparation',
    medicalConditions: ['chemotherapy'],
    recommendations: [
      '避免生魚片、生蛋、未洗淨蔬果',
      '所有食物充分加熱至安全溫度',
      '選擇密封包裝的殺菌產品'
    ],
    timeframe: '食用後 24-72 小時',
    evidence: '基於 Johns Hopkins 化療營養指南'
  },
  {
    id: 'cross-contamination-allergy',
    name: '交叉污染',
    description: '即使微量過敏原也可能引發嚴重過敏反應',
    severity: 'critical',
    category: 'preparation',
    medicalConditions: ['allergy'],
    recommendations: [
      '檢查所有食品標示',
      '使用專用餐具和砧板',
      '選擇有過敏原標示的產品'
    ],
    timeframe: '食用後 5-30 分鐘',
    evidence: '基於 Stanford 過敏指導原則'
  },
  {
    id: 'high-fodmap-ibs',
    name: '高 FODMAP 食物',
    description: 'IBS 患者食用高 FODMAP 食物可能引發腹瀉、脹氣',
    severity: 'medium',
    category: 'food',
    medicalConditions: ['ibs'],
    recommendations: [
      '限制洋蔥、大蒜、豆類',
      '選擇低 FODMAP 替代品',
      '記錄個人觸發食物'
    ],
    timeframe: '食用後 30 分鐘-4 小時',
    evidence: '基於 Monash 大學 FODMAP 研究'
  },
  {
    id: 'meal-timing-ibd',
    name: '進食時間不當',
    description: '不規律進食或過大份量可能加重 IBD 症狀',
    severity: 'medium',
    category: 'timing',
    medicalConditions: ['ibd', 'crohns', 'uc'],
    recommendations: [
      '少量多餐，每日 5-6 次',
      '避免睡前 3 小時進食',
      '保持固定用餐時間'
    ],
    timeframe: '影響持續數天',
    evidence: '基於 IBD 患者管理指南'
  }
];

const SEVERITY_CONFIGS = {
  critical: {
    color: 'text-red-700 bg-red-100 border-red-300',
    icon: AlertTriangle,
    badge: 'destructive' as const,
    label: '緊急'
  },
  high: {
    color: 'text-orange-700 bg-orange-100 border-orange-300',
    icon: AlertTriangle,
    badge: 'secondary' as const,
    label: '高風險'
  },
  medium: {
    color: 'text-amber-700 bg-amber-100 border-amber-300',
    icon: Info,
    badge: 'secondary' as const,
    label: '中風險'
  },
  low: {
    color: 'text-blue-700 bg-blue-100 border-blue-300',
    icon: Info,
    badge: 'secondary' as const,
    label: '低風險'
  }
} as const;

const CATEGORY_CONFIGS = {
  food: { icon: Target, label: '食物選擇', color: 'text-green-600' },
  timing: { icon: Clock, label: '進食時間', color: 'text-blue-600' },
  portion: { icon: Heart, label: '份量控制', color: 'text-purple-600' },
  preparation: { icon: Shield, label: '製備方式', color: 'text-orange-600' },
  interaction: { icon: Brain, label: '藥物交互', color: 'text-red-600' }
} as const;

export function RiskFactorsList({
  medicalConditions,
  className = ''
}: RiskFactorsListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>(['critical', 'high']);
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);

  // Filter risk factors based on user's medical conditions
  const relevantRiskFactors = SAMPLE_RISK_FACTORS.filter(factor =>
    factor.medicalConditions.some(condition => medicalConditions.includes(condition))
  );

  // Further filter by selected severity and category
  const filteredRiskFactors = relevantRiskFactors.filter(factor => {
    const severityMatch = selectedSeverity.length === 0 || selectedSeverity.includes(factor.severity);
    const categoryMatch = selectedCategory.length === 0 || selectedCategory.includes(factor.category);
    return severityMatch && categoryMatch;
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const toggleSeverityFilter = (severity: string) => {
    const newSelected = selectedSeverity.includes(severity)
      ? selectedSeverity.filter(s => s !== severity)
      : [...selectedSeverity, severity];
    setSelectedSeverity(newSelected);
  };

  const toggleCategoryFilter = (category: string) => {
    const newSelected = selectedCategory.includes(category)
      ? selectedCategory.filter(c => c !== category)
      : [...selectedCategory, category];
    setSelectedCategory(newSelected);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>醫療風險因子</span>
          </CardTitle>
          <CardDescription>
            根據您的醫療狀況識別的潛在風險因子和預防建議
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">風險等級篩選</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SEVERITY_CONFIGS).map(([severity, config]) => (
                  <Button
                    key={severity}
                    variant={selectedSeverity.includes(severity) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSeverityFilter(severity)}
                    className="text-xs"
                  >
                    <config.icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">類別篩選</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CATEGORY_CONFIGS).map(([category, config]) => (
                  <Button
                    key={category}
                    variant={selectedCategory.includes(category) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleCategoryFilter(category)}
                    className="text-xs"
                  >
                    <config.icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">
              顯示 {filteredRiskFactors.length} 個相關風險因子
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSeverity(['critical', 'high']);
                setSelectedCategory([]);
              }}
            >
              重置篩選
            </Button>
          </div>

          {/* Risk Factors List */}
          <div className="space-y-3">
            {filteredRiskFactors.map((factor) => {
              const severityConfig = SEVERITY_CONFIGS[factor.severity];
              const categoryConfig = CATEGORY_CONFIGS[factor.category];
              const isExpanded = expandedItems.has(factor.id);
              const SeverityIcon = severityConfig.icon;
              const CategoryIcon = categoryConfig.icon;

              return (
                <Card key={factor.id} className={`border ${severityConfig.color.split(' ')[2]}`}>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <button
                        className="w-full p-4 text-left hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-t-lg"
                        onClick={() => toggleExpanded(factor.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`risk-factor-${factor.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            <SeverityIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-current" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-sm">{factor.name}</h3>
                                <Badge variant={severityConfig.badge} className="text-xs">
                                  {severityConfig.label}
                                </Badge>
                                <div className={`flex items-center space-x-1 text-xs ${categoryConfig.color}`}>
                                  <CategoryIcon className="w-3 h-3" />
                                  <span>{categoryConfig.label}</span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {factor.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent id={`risk-factor-${factor.id}`}>
                      <div className="px-4 pb-4 space-y-3 border-t">
                        {/* Recommendations */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span>預防建議</span>
                          </h4>
                          <ul className="space-y-1">
                            {factor.recommendations.map((rec, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Medical Info */}
                        <div className="grid sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">症狀出現時間：</span>
                            <span className="ml-1">{factor.timeframe}</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">醫療依據：</span>
                            <span className="ml-1">{factor.evidence}</span>
                          </div>
                        </div>

                        {/* Applicable Conditions */}
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">適用狀況：</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {factor.medicalConditions.map(condition => (
                              <Badge key={condition} variant="outline" className="text-xs">
                                {condition.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}

            {filteredRiskFactors.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>沒有符合篩選條件的風險因子</p>
                <p className="text-xs mt-1">請調整篩選條件或檢查您的醫療狀況設定</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary Card */}
      {filteredRiskFactors.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-2">快速摘要</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {filteredRiskFactors.filter(f => f.severity === 'critical').length}
                </div>
                <div className="text-xs text-muted-foreground">緊急風險</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {filteredRiskFactors.filter(f => f.severity === 'high').length}
                </div>
                <div className="text-xs text-muted-foreground">高風險</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">
                  {filteredRiskFactors.filter(f => f.severity === 'medium').length}
                </div>
                <div className="text-xs text-muted-foreground">中風險</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {filteredRiskFactors.filter(f => f.severity === 'low').length}
                </div>
                <div className="text-xs text-muted-foreground">低風險</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Collapsible components if not available
function Collapsible({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function CollapsibleTrigger({
  children,
  asChild
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return <>{children}</>;
}

function CollapsibleContent({
  children,
  id
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return <div id={id}>{children}</div>;
}