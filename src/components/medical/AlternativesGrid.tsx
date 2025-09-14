'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Star,
  Clock,
  DollarSign,
  MapPin,
  ChefHat,
  Filter,
  X,
  CheckCircle,
  AlertTriangle,
  Heart
} from 'lucide-react';
import type { MedicalCondition } from '@/types/medical';

interface FoodAlternative {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  medicalScore: number;
  medicalLevel: '差' | '普通' | '好' | '完美';
  emoji: '😞' | '😐' | '😊' | '😍';
  replacesFood: string[];
  availability: 'common' | 'specialty' | 'seasonal';
  costLevel: 'budget' | 'moderate' | 'expensive';
  prepTime: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  medicalBenefits: string[];
  nutritionHighlights: string[];
  whereToFind: string[];
  medicalConditions: MedicalCondition[];
  tags: string[];
  rating: number; // 0-5
  reviewCount: number;
}

interface AlternativesGridProps {
  medicalConditions: MedicalCondition[];
  avoidFoods?: string[];
  className?: string;
}

const TAIWAN_HK_ALTERNATIVES: FoodAlternative[] = [
  {
    id: 'steamed-chicken',
    name: '清蒸雞胸肉',
    nameEn: 'Steamed Chicken Breast',
    category: '蛋白質',
    medicalScore: 4,
    medicalLevel: '完美',
    emoji: '😍',
    replacesFood: ['炸雞', '燒烤肉類', '加工肉品'],
    availability: 'common',
    costLevel: 'moderate',
    prepTime: 20,
    difficulty: 'easy',
    medicalBenefits: [
      'IBD友善 - 低纖維好消化',
      '化療期間安全 - 充分加熱',
      '低過敏風險'
    ],
    nutritionHighlights: ['高蛋白質', '低脂肪', '易消化'],
    whereToFind: ['超市冷凍櫃', '傳統市場', '便利商店'],
    medicalConditions: ['ibd', 'chemotherapy', 'ibs'],
    tags: ['高蛋白', '易消化', '低脂'],
    rating: 4.5,
    reviewCount: 128
  },
  {
    id: 'white-rice-porridge',
    name: '白米粥',
    nameEn: 'White Rice Congee',
    category: '主食',
    medicalScore: 4,
    medicalLevel: '完美',
    emoji: '😍',
    replacesFood: ['糙米', '全穀類', '油炸麵食'],
    availability: 'common',
    costLevel: 'budget',
    prepTime: 45,
    difficulty: 'easy',
    medicalBenefits: [
      'IBD急性期首選',
      '化療期間溫和營養',
      'IBS友善 - 低FODMAP'
    ],
    nutritionHighlights: ['易消化', '溫和', '補充水分'],
    whereToFind: ['家中自製', '粥品店', '醫院餐廳'],
    medicalConditions: ['ibd', 'chemotherapy', 'ibs'],
    tags: ['低FODMAP', '溫和', '易消化'],
    rating: 4.8,
    reviewCount: 256
  },
  {
    id: 'steamed-pumpkin',
    name: '蒸南瓜',
    nameEn: 'Steamed Pumpkin',
    category: '蔬菜',
    medicalScore: 4,
    medicalLevel: '完美',
    emoji: '😍',
    replacesFood: ['生菜沙拉', '高纖蔬菜', '十字花科蔬菜'],
    availability: 'seasonal',
    costLevel: 'budget',
    prepTime: 15,
    difficulty: 'easy',
    medicalBenefits: [
      'IBD友善 - 軟嫩易消化',
      '豐富β-胡蘿蔔素',
      '低過敏風險'
    ],
    nutritionHighlights: ['維生素A', '抗氧化', '溫和甜味'],
    whereToFind: ['傳統市場', '超市蔬果區', '有機商店'],
    medicalConditions: ['ibd', 'chemotherapy'],
    tags: ['抗氧化', '維生素A', '軟質'],
    rating: 4.3,
    reviewCount: 89
  },
  {
    id: 'banana',
    name: '香蕉',
    nameEn: 'Banana',
    category: '水果',
    medicalScore: 4,
    medicalLevel: '完美',
    emoji: '😍',
    replacesFood: ['柑橘類', '高酸水果', '堅果'],
    availability: 'common',
    costLevel: 'budget',
    prepTime: 0,
    difficulty: 'easy',
    medicalBenefits: [
      'IBS友善 - 低FODMAP',
      '溫和不刺激',
      '補充鉀離子'
    ],
    nutritionHighlights: ['鉀離子', '易消化', '天然甜味'],
    whereToFind: ['任何水果攤', '超市', '便利商店'],
    medicalConditions: ['ibs', 'ibd', 'chemotherapy'],
    tags: ['低FODMAP', '便攜', '能量'],
    rating: 4.7,
    reviewCount: 203
  },
  {
    id: 'plain-tofu',
    name: '板豆腐',
    nameEn: 'Plain Tofu',
    category: '蛋白質',
    medicalScore: 3,
    medicalLevel: '好',
    emoji: '😊',
    replacesFood: ['肉類', '蛋類過敏替代', '乳製品'],
    availability: 'common',
    costLevel: 'budget',
    prepTime: 10,
    difficulty: 'easy',
    medicalBenefits: [
      '植物蛋白質',
      '低過敏風險',
      '易消化'
    ],
    nutritionHighlights: ['植物蛋白', '低脂肪', '含鈣'],
    whereToFind: ['傳統市場', '超市豆製品區', '素食店'],
    medicalConditions: ['allergy', 'ibs', 'ibd'],
    tags: ['植物蛋白', '素食', '低過敏'],
    rating: 4.1,
    reviewCount: 167
  },
  {
    id: 'rice-noodles',
    name: '米線',
    nameEn: 'Rice Vermicelli',
    category: '主食',
    medicalScore: 3,
    medicalLevel: '好',
    emoji: '😊',
    replacesFood: ['小麥麵條', '拉麵', '意大利麵'],
    availability: 'common',
    costLevel: 'budget',
    prepTime: 5,
    difficulty: 'easy',
    medicalBenefits: [
      '無麩質',
      '乳糜瀉友善',
      '易消化'
    ],
    nutritionHighlights: ['無麩質', '快速烹調', '輕盈口感'],
    whereToFind: ['亞洲超市', '米粉專賣店', '傳統市場'],
    medicalConditions: ['celiac', 'allergy'],
    tags: ['無麩質', '快煮', '亞洲料理'],
    rating: 4.2,
    reviewCount: 134
  }
];

const COST_LEVELS = {
  budget: { icon: DollarSign, label: '經濟實惠', color: 'text-green-600' },
  moderate: { icon: DollarSign, label: '中等價位', color: 'text-amber-600' },
  expensive: { icon: DollarSign, label: '較高價位', color: 'text-red-600' }
} as const;

const AVAILABILITY_LEVELS = {
  common: { icon: CheckCircle, label: '常見', color: 'text-green-600' },
  specialty: { icon: AlertTriangle, label: '專門店', color: 'text-amber-600' },
  seasonal: { icon: Clock, label: '季節性', color: 'text-blue-600' }
} as const;

const DIFFICULTY_LEVELS = {
  easy: { label: '簡單', color: 'text-green-600' },
  medium: { label: '中等', color: 'text-amber-600' },
  hard: { label: '困難', color: 'text-red-600' }
} as const;

export function AlternativesGrid({
  medicalConditions,
  avoidFoods = [],
  className = ''
}: AlternativesGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedScore, setSelectedScore] = useState<number[]>([3, 4]);
  const [sortBy, setSortBy] = useState<'rating' | 'score' | 'prepTime' | 'cost'>('score');
  const [showFilters, setShowFilters] = useState(false);

  // Filter alternatives based on medical conditions
  const relevantAlternatives = TAIWAN_HK_ALTERNATIVES.filter(alt =>
    alt.medicalConditions.some(condition => medicalConditions.includes(condition))
  );

  // Apply filters
  const filteredAlternatives = relevantAlternatives.filter(alt => {
    const matchesSearch = !searchQuery ||
      alt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alt.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alt.tags.some(tag => tag.includes(searchQuery));

    const matchesCategory = selectedCategory === 'all' || alt.category === selectedCategory;
    const matchesScore = selectedScore.includes(alt.medicalScore);

    return matchesSearch && matchesCategory && matchesScore;
  });

  // Sort alternatives
  const sortedAlternatives = [...filteredAlternatives].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'score':
        return b.medicalScore - a.medicalScore;
      case 'prepTime':
        return a.prepTime - b.prepTime;
      case 'cost':
        const costOrder = { budget: 0, moderate: 1, expensive: 2 };
        return costOrder[a.costLevel] - costOrder[b.costLevel];
      default:
        return 0;
    }
  });

  const categories = Array.from(new Set(relevantAlternatives.map(alt => alt.category)));

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-medical-primary" />
            <span>醫療安全替代食物</span>
          </CardTitle>
          <CardDescription>
            根據您的醫療狀況推薦的安全食物選項，在台灣和香港容易取得
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="space-y-3">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="搜尋食物名稱或標籤..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex-shrink-0"
              >
                <Filter className="w-4 h-4 mr-2" />
                篩選
              </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">食物類別</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full p-2 border rounded-md text-sm"
                    >
                      <option value="all">所有類別</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Score Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">醫療評分</label>
                    <div className="flex flex-wrap gap-1">
                      {[1, 2, 3, 4].map(score => (
                        <Button
                          key={score}
                          variant={selectedScore.includes(score) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            const newScores = selectedScore.includes(score)
                              ? selectedScore.filter(s => s !== score)
                              : [...selectedScore, score];
                            setSelectedScore(newScores);
                          }}
                          className="text-xs"
                        >
                          {score === 1 && '😞'} {score === 2 && '😐'}
                          {score === 3 && '😊'} {score === 4 && '😍'}
                          {score}分
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">排序方式</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full p-2 border rounded-md text-sm"
                    >
                      <option value="score">醫療評分</option>
                      <option value="rating">用戶評分</option>
                      <option value="prepTime">製備時間</option>
                      <option value="cost">價格</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedScore([3, 4]);
                      setSortBy('score');
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    清除篩選
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>顯示 {sortedAlternatives.length} 個替代選項</span>
            {avoidFoods.length > 0 && (
              <span>替代: {avoidFoods.join(', ')}</span>
            )}
          </div>

          {/* Alternatives Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedAlternatives.map((alternative) => {
              const costConfig = COST_LEVELS[alternative.costLevel];
              const availabilityConfig = AVAILABILITY_LEVELS[alternative.availability];
              const difficultyConfig = DIFFICULTY_LEVELS[alternative.difficulty];
              const CostIcon = costConfig.icon;
              const AvailabilityIcon = availabilityConfig.icon;

              return (
                <Card key={alternative.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm flex items-center space-x-2">
                          <span className="text-xl">{alternative.emoji}</span>
                          <span>{alternative.name}</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">{alternative.nameEn}</p>
                      </div>
                      <Badge
                        variant={alternative.medicalScore >= 3 ? 'default' : 'secondary'}
                        className="flex-shrink-0 ml-2"
                      >
                        {alternative.medicalScore}/4
                      </Badge>
                    </div>

                    {/* Category and Rating */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-1 bg-muted rounded text-muted-foreground">
                        {alternative.category}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{alternative.rating}</span>
                        <span className="text-muted-foreground">({alternative.reviewCount})</span>
                      </div>
                    </div>

                    {/* Quick Info */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className={`flex items-center space-x-1 ${costConfig.color}`}>
                        <CostIcon className="w-3 h-3" />
                        <span>{costConfig.label}</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${availabilityConfig.color}`}>
                        <AvailabilityIcon className="w-3 h-3" />
                        <span>{availabilityConfig.label}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{alternative.prepTime}分鐘</span>
                      </div>
                    </div>

                    {/* Medical Benefits */}
                    <div>
                      <h4 className="text-xs font-medium mb-1">醫療效益</h4>
                      <ul className="space-y-0.5">
                        {alternative.medicalBenefits.slice(0, 2).map((benefit, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start space-x-1">
                            <span className="w-1 h-1 rounded-full bg-medical-primary mt-1.5 flex-shrink-0"></span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Where to Find */}
                    <div>
                      <h4 className="text-xs font-medium mb-1 flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>取得地點</span>
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {alternative.whereToFind.slice(0, 2).map((place, index) => (
                          <span key={index} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {place}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {alternative.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Action Button */}
                    <Button size="sm" className="w-full text-xs">
                      <ChefHat className="w-3 h-3 mr-1" />
                      查看食譜建議
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {sortedAlternatives.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">找不到符合條件的替代食物</h3>
              <p className="text-sm text-muted-foreground mb-4">
                請嘗試調整搜尋條件或篩選器
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedScore([1, 2, 3, 4]);
                }}
              >
                顯示所有選項
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}