// Food Database Operations for Diet Daily

import { FoodDatabase, DatabaseFoodItem, CreateFoodRequest, UpdateFoodRequest } from '@/types/food';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const DATABASE_PATH = path.join(process.cwd(), 'data', 'taiwan-hk-foods.json');
const ADDITIONAL_FOODS_PATH = path.join(process.cwd(), 'data', 'additional-foods.json');

export class FoodDatabaseManager {
  private static instance: FoodDatabaseManager;
  private database: FoodDatabase | null = null;

  private constructor() {}

  static getInstance(): FoodDatabaseManager {
    if (!FoodDatabaseManager.instance) {
      FoodDatabaseManager.instance = new FoodDatabaseManager();
    }
    return FoodDatabaseManager.instance;
  }

  // Load database from file and merge with additional foods
  async loadDatabase(): Promise<FoodDatabase> {
    if (this.database) {
      return this.database;
    }

    try {
      // Load main database
      const mainData = await fs.promises.readFile(DATABASE_PATH, 'utf-8');
      const mainDatabase = JSON.parse(mainData);

      // Load additional foods
      let additionalFoods: any[] = [];
      try {
        const additionalData = await fs.promises.readFile(ADDITIONAL_FOODS_PATH, 'utf-8');
        const additionalDatabase = JSON.parse(additionalData);
        additionalFoods = additionalDatabase.additional_foods || [];
      } catch (error) {
        console.log('Additional foods database not found, using main database only');
      }

      // Convert additional foods to DatabaseFoodItem format
      const convertedAdditionalFoods = additionalFoods.map(food => ({
        id: food.id,
        name_zh: food.name_zh,
        name_en: food.name_en,
        category: food.category,
        calories_per_100g: food.calories_per_100g,
        protein_per_100g: food.protein_per_100g,
        carbs_per_100g: food.carbs_per_100g,
        fat_per_100g: food.fat_per_100g,
        fiber_per_100g: food.fiber_per_100g,
        medical_scores: food.medical_scores,
        availability: {
          taiwan: true,
          hong_kong: true,
          seasonal: null
        },
        cooking_methods: ['煮', '蒸', '炒'],
        alternatives: [],
        created: new Date().toISOString(),
        medical_validated: true // Additional foods are pre-validated
      }));

      // Merge databases
      this.database = {
        ...mainDatabase,
        foods: [...mainDatabase.foods, ...convertedAdditionalFoods],
        metadata: {
          ...mainDatabase.metadata,
          total_items: mainDatabase.foods.length + convertedAdditionalFoods.length
        }
      };

      return this.database!;
    } catch (error) {
      console.error('Failed to load food database:', error);
      throw new Error('無法載入食物資料庫');
    }
  }

  // Force reload database from file (bypass cache)
  async reloadDatabase(): Promise<FoodDatabase> {
    try {
      const data = await fs.promises.readFile(DATABASE_PATH, 'utf-8');
      this.database = JSON.parse(data);
      return this.database!;
    } catch (error) {
      console.error('Failed to reload food database:', error);
      throw new Error('無法重新載入食物資料庫');
    }
  }

  // Save database to file
  async saveDatabase(): Promise<void> {
    if (!this.database) {
      throw new Error('無資料庫可儲存');
    }

    try {
      // Update metadata
      this.database.metadata.total_items = this.database.foods.length;

      // Update categories count
      const categoryCounts: Record<string, number> = {};
      this.database.foods.forEach(food => {
        categoryCounts[food.category] = (categoryCounts[food.category] || 0) + 1;
      });
      this.database.categories = categoryCounts;

      const data = JSON.stringify(this.database, null, 2);
      await fs.promises.writeFile(DATABASE_PATH, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save food database:', error);
      throw new Error('無法儲存食物資料庫');
    }
  }

  // Get all foods
  async getAllFoods(): Promise<DatabaseFoodItem[]> {
    const db = await this.loadDatabase();
    return db.foods;
  }

  // Get food by ID
  async getFoodById(id: string): Promise<DatabaseFoodItem | null> {
    const db = await this.loadDatabase();
    return db.foods.find(food => food.id === id) || null;
  }

  // Search foods
  async searchFoods(query: string): Promise<DatabaseFoodItem[]> {
    const db = await this.loadDatabase();
    const lowercaseQuery = query.toLowerCase();

    return db.foods.filter(food =>
      food.name_zh.toLowerCase().includes(lowercaseQuery) ||
      food.name_en.toLowerCase().includes(lowercaseQuery) ||
      food.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get foods by category
  async getFoodsByCategory(category: string): Promise<DatabaseFoodItem[]> {
    const db = await this.loadDatabase();
    return db.foods.filter(food => food.category === category);
  }

  // Create new food
  async createFood(request: CreateFoodRequest): Promise<DatabaseFoodItem> {
    const db = await this.loadDatabase();

    // Check for duplicate names
    const existingFood = db.foods.find(food =>
      food.name_zh === request.name_zh || food.name_en === request.name_en
    );

    if (existingFood) {
      throw new Error(`食物已存在: ${request.name_zh} (${request.name_en})`);
    }

    const newFood: DatabaseFoodItem = {
      id: uuidv4(),
      name_zh: request.name_zh,
      name_en: request.name_en,
      category: request.category,
      medical_scores: request.medical_scores,
      availability: {
        taiwan: request.availability.taiwan,
        hong_kong: request.availability.hong_kong,
        seasonal: request.availability.seasonal || null
      },
      cooking_methods: request.cooking_methods || [],
      alternatives: request.alternatives || [],
      created: new Date().toISOString(),
      medical_validated: false // 新增食物需要醫療驗證
    };

    db.foods.push(newFood);
    this.database = db;
    await this.saveDatabase();

    return newFood;
  }

  // Update existing food
  async updateFood(request: UpdateFoodRequest): Promise<DatabaseFoodItem> {
    const db = await this.loadDatabase();
    const foodIndex = db.foods.findIndex(food => food.id === request.id);

    if (foodIndex === -1) {
      throw new Error(`找不到食物: ${request.id}`);
    }

    // Check for name conflicts (exclude current food)
    if (request.name_zh || request.name_en) {
      const conflictFood = db.foods.find(food =>
        food.id !== request.id && (
          (request.name_zh && food.name_zh === request.name_zh) ||
          (request.name_en && food.name_en === request.name_en)
        )
      );

      if (conflictFood) {
        throw new Error(`食物名稱已存在: ${request.name_zh || request.name_en}`);
      }
    }

    const currentFood = db.foods[foodIndex];
    const updatedFood: DatabaseFoodItem = {
      ...currentFood,
      ...request,
      medical_scores: request.medical_scores ? {
        ...currentFood.medical_scores,
        ...request.medical_scores
      } : currentFood.medical_scores,
      availability: request.availability ? {
        ...currentFood.availability,
        ...request.availability
      } : currentFood.availability,
      cooking_methods: request.cooking_methods !== undefined ? request.cooking_methods : currentFood.cooking_methods,
      alternatives: request.alternatives !== undefined ? request.alternatives : currentFood.alternatives,
      medical_validated: false // 更新後需重新驗證
    };

    db.foods[foodIndex] = updatedFood;
    this.database = db;
    await this.saveDatabase();

    return updatedFood;
  }

  // Delete food
  async deleteFood(id: string): Promise<boolean> {
    const db = await this.loadDatabase();
    const foodIndex = db.foods.findIndex(food => food.id === id);

    if (foodIndex === -1) {
      throw new Error(`找不到食物: ${id}`);
    }

    db.foods.splice(foodIndex, 1);
    this.database = db;
    await this.saveDatabase();

    return true;
  }

  // Validate food medically
  async validateFood(id: string): Promise<DatabaseFoodItem> {
    const db = await this.loadDatabase();
    const foodIndex = db.foods.findIndex(food => food.id === id);

    if (foodIndex === -1) {
      throw new Error(`找不到食物: ${id}`);
    }

    db.foods[foodIndex].medical_validated = true;
    this.database = db;
    await this.saveDatabase();

    return db.foods[foodIndex];
  }

  // Get database statistics
  async getDatabaseStats(): Promise<{
    totalFoods: number;
    categoryCounts: Record<string, number>;
    validatedCount: number;
    recentlyAdded: DatabaseFoodItem[];
  }> {
    const db = await this.loadDatabase();

    const categoryCounts: Record<string, number> = {};
    let validatedCount = 0;

    db.foods.forEach(food => {
      categoryCounts[food.category] = (categoryCounts[food.category] || 0) + 1;
      if (food.medical_validated) validatedCount++;
    });

    // Get 5 most recently added foods
    const recentlyAdded = [...db.foods]
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, 5);

    return {
      totalFoods: db.foods.length,
      categoryCounts,
      validatedCount,
      recentlyAdded
    };
  }
}

// Export singleton instance
export const foodDatabase = FoodDatabaseManager.getInstance();