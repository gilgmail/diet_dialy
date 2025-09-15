// Food History Database Manager for Diet Daily Week 2

import {
  FoodHistoryEntry,
  FoodHistoryDatabase,
  CreateHistoryEntryRequest,
  UpdateHistoryEntryRequest,
  FoodHistoryQuery,
  FoodHistoryStats,
  DailyFoodSummary,
  WeeklyFoodReport
} from '@/types/history';
import { DatabaseFoodItem } from '@/types/food';
import { ExtendedMedicalProfile } from '@/types/medical';
import { medicalScoringEngine } from '@/lib/medical/scoring-engine';
import { foodDatabase } from '@/lib/food-database';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const HISTORY_DATABASE_PATH = path.join(process.cwd(), 'data', 'user-food-history.json');

export class FoodHistoryDatabaseManager {
  private static instance: FoodHistoryDatabaseManager;
  private database: FoodHistoryDatabase | null = null;

  private constructor() {}

  static getInstance(): FoodHistoryDatabaseManager {
    if (!FoodHistoryDatabaseManager.instance) {
      FoodHistoryDatabaseManager.instance = new FoodHistoryDatabaseManager();
    }
    return FoodHistoryDatabaseManager.instance;
  }

  // Initialize or load database
  async loadDatabase(): Promise<FoodHistoryDatabase> {
    if (this.database) {
      return this.database;
    }

    try {
      if (fs.existsSync(HISTORY_DATABASE_PATH)) {
        const data = await fs.promises.readFile(HISTORY_DATABASE_PATH, 'utf-8');
        this.database = JSON.parse(data);
      } else {
        // Create new database if it doesn't exist
        this.database = {
          entries: [],
          metadata: {
            userId: 'demo-user', // For demo purposes
            totalEntries: 0,
            dateRange: {
              earliest: new Date().toISOString(),
              latest: new Date().toISOString()
            },
            lastUpdated: new Date().toISOString()
          }
        };
        await this.saveDatabase();
      }
      return this.database!;
    } catch (error) {
      console.error('Failed to load food history database:', error);
      throw new Error('無法載入食物歷史資料庫');
    }
  }

  // Save database to file
  async saveDatabase(): Promise<void> {
    if (!this.database) {
      throw new Error('無資料庫可儲存');
    }

    try {
      // Update metadata
      this.database.metadata.totalEntries = this.database.entries.length;
      if (this.database.entries.length > 0) {
        const dates = this.database.entries.map(e => e.consumedAt).sort();
        this.database.metadata.dateRange = {
          earliest: dates[0],
          latest: dates[dates.length - 1]
        };
      }
      this.database.metadata.lastUpdated = new Date().toISOString();

      const data = JSON.stringify(this.database, null, 2);
      await fs.promises.writeFile(HISTORY_DATABASE_PATH, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save food history database:', error);
      throw new Error('無法儲存食物歷史資料庫');
    }
  }

  // Create new food history entry
  async createHistoryEntry(
    request: CreateHistoryEntryRequest,
    medicalProfile: ExtendedMedicalProfile
  ): Promise<FoodHistoryEntry> {
    const db = await this.loadDatabase();

    // Get food data
    const foodData = await foodDatabase.getFoodById(request.foodId);
    if (!foodData) {
      throw new Error(`找不到食物: ${request.foodId}`);
    }

    // Calculate medical score
    const scoringResult = medicalScoringEngine.scoreFood(foodData, medicalProfile);

    const newEntry: FoodHistoryEntry = {
      id: uuidv4(),
      userId: medicalProfile.userId,
      foodId: request.foodId,
      foodData: { ...foodData }, // Snapshot
      consumedAt: new Date().toISOString(),
      portion: request.portion,
      medicalScore: scoringResult.medicalScore,
      notes: request.notes,
      photoUrl: request.photoUrl,
      recognitionConfidence: request.recognitionConfidence,
      location: request.location,
      tags: request.tags || [],
      symptoms: request.symptoms,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.entries.push(newEntry);
    this.database = db;
    await this.saveDatabase();

    return newEntry;
  }

  // Update existing entry
  async updateHistoryEntry(request: UpdateHistoryEntryRequest): Promise<FoodHistoryEntry> {
    const db = await this.loadDatabase();
    const entryIndex = db.entries.findIndex(entry => entry.id === request.id);

    if (entryIndex === -1) {
      throw new Error(`找不到歷史記錄: ${request.id}`);
    }

    const currentEntry = db.entries[entryIndex];
    const updatedEntry: FoodHistoryEntry = {
      ...currentEntry,
      ...request,
      updatedAt: new Date().toISOString()
    };

    db.entries[entryIndex] = updatedEntry;
    this.database = db;
    await this.saveDatabase();

    return updatedEntry;
  }

  // Delete entry
  async deleteHistoryEntry(id: string): Promise<boolean> {
    const db = await this.loadDatabase();
    const entryIndex = db.entries.findIndex(entry => entry.id === id);

    if (entryIndex === -1) {
      throw new Error(`找不到歷史記錄: ${id}`);
    }

    db.entries.splice(entryIndex, 1);
    this.database = db;
    await this.saveDatabase();

    return true;
  }

  // Query food history
  async queryHistory(query: FoodHistoryQuery): Promise<FoodHistoryEntry[]> {
    const db = await this.loadDatabase();
    let results = db.entries.filter(entry => entry.userId === query.userId);

    // Apply filters
    if (query.dateFrom) {
      results = results.filter(entry => entry.consumedAt >= query.dateFrom!);
    }
    if (query.dateTo) {
      results = results.filter(entry => entry.consumedAt <= query.dateTo!);
    }
    if (query.foodIds && query.foodIds.length > 0) {
      results = results.filter(entry => query.foodIds!.includes(entry.foodId));
    }
    if (query.tags && query.tags.length > 0) {
      results = results.filter(entry =>
        query.tags!.some(tag => entry.tags?.includes(tag))
      );
    }
    if (query.includeSymptoms === true) {
      results = results.filter(entry => entry.symptoms !== undefined);
    }

    // Sort results
    const sortBy = query.sortBy || 'consumedAt';
    const sortOrder = query.sortOrder || 'desc';
    results.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === 'medicalScore') {
        aVal = a.medicalScore.overall_score;
        bVal = b.medicalScore.overall_score;
      } else {
        aVal = a[sortBy];
        bVal = b[sortBy];
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    return results.slice(offset, offset + limit);
  }

  // Get daily summary
  async getDailySummary(userId: string, date: string): Promise<DailyFoodSummary> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const entries = await this.queryHistory({
      userId,
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
      sortBy: 'consumedAt',
      sortOrder: 'asc'
    });

    const riskFactors = [...new Set(
      entries.flatMap(entry => entry.foodData.medical_scores.ibd_risk_factors)
    )];

    const allergens = [...new Set(
      entries.flatMap(entry => entry.foodData.medical_scores.major_allergens)
    )];

    const symptoms = entries
      .filter(entry => entry.symptoms)
      .flatMap(entry => [
        ...(entry.symptoms?.before || []),
        ...(entry.symptoms?.after || [])
      ]);

    return {
      date,
      entries,
      totalEntries: entries.length,
      averageMedicalScore: entries.length > 0
        ? entries.reduce((sum, entry) => sum + entry.medicalScore.overall_score, 0) / entries.length
        : 0,
      riskFactors,
      allergens,
      symptoms: {
        count: symptoms.length,
        averageSeverity: entries.length > 0
          ? entries
              .filter(entry => entry.symptoms?.severity)
              .reduce((sum, entry) => sum + (entry.symptoms?.severity || 0), 0) /
            entries.filter(entry => entry.symptoms?.severity).length
          : 0,
        types: [...new Set(symptoms)]
      }
    };
  }

  // Get statistics
  async getStats(userId: string, days: number = 30): Promise<FoodHistoryStats> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await this.queryHistory({
      userId,
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString()
    });

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        dateRange: {
          earliest: new Date().toISOString(),
          latest: new Date().toISOString()
        },
        averageMedicalScore: { overall: 0, ibd: 0, chemo: 0, allergy: 0 },
        mostFrequentFoods: [],
        riskFactorTrends: [],
        symptomCorrelations: []
      };
    }

    // Calculate averages
    const avgOverall = entries.reduce((sum, e) => sum + e.medicalScore.overall_score, 0) / entries.length;
    const avgIbd = entries.reduce((sum, e) => sum + e.medicalScore.ibd_score, 0) / entries.length;
    const avgChemo = entries.reduce((sum, e) => sum + e.medicalScore.chemo_score, 0) / entries.length;
    const avgAllergy = entries.reduce((sum, e) => sum + e.medicalScore.allergy_score, 0) / entries.length;

    // Most frequent foods
    const foodCounts: Record<string, { count: number; scores: number[]; name: string }> = {};
    entries.forEach(entry => {
      if (!foodCounts[entry.foodId]) {
        foodCounts[entry.foodId] = {
          count: 0,
          scores: [],
          name: entry.foodData.name_zh
        };
      }
      foodCounts[entry.foodId].count++;
      foodCounts[entry.foodId].scores.push(entry.medicalScore.overall_score);
    });

    const mostFrequentFoods = Object.entries(foodCounts)
      .map(([foodId, data]) => ({
        foodId,
        foodName: data.name,
        count: data.count,
        averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntries: entries.length,
      dateRange: {
        earliest: entries[entries.length - 1]?.consumedAt || new Date().toISOString(),
        latest: entries[0]?.consumedAt || new Date().toISOString()
      },
      averageMedicalScore: {
        overall: avgOverall,
        ibd: avgIbd,
        chemo: avgChemo,
        allergy: avgAllergy
      },
      mostFrequentFoods,
      riskFactorTrends: [], // TODO: Implement trend analysis
      symptomCorrelations: [] // TODO: Implement correlation analysis
    };
  }
}

// Export singleton instance
export const foodHistoryDatabase = FoodHistoryDatabaseManager.getInstance();