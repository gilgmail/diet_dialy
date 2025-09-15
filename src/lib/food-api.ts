// Client-side API operations for food database

import { DatabaseFoodItem, CreateFoodRequest, UpdateFoodRequest } from '@/types/food';

interface DatabaseStats {
  totalFoods: number;
  categoryCounts: Record<string, number>;
  validatedCount: number;
  recentlyAdded: DatabaseFoodItem[];
}

export class FoodAPI {
  private static baseUrl = '/api/foods';

  // Get all foods or search
  static async getAllFoods(query?: string, category?: string): Promise<DatabaseFoodItem[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category) params.append('category', category);

    const url = `${this.baseUrl}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '獲取食物失敗');
    }

    const data = await response.json();
    return data.foods;
  }

  // Get food by ID
  static async getFoodById(id: string): Promise<DatabaseFoodItem> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '獲取食物失敗');
    }

    const data = await response.json();
    return data.food;
  }

  // Create new food
  static async createFood(request: CreateFoodRequest): Promise<DatabaseFoodItem> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '新增食物失敗');
    }

    const data = await response.json();
    return data.food;
  }

  // Update existing food
  static async updateFood(request: UpdateFoodRequest): Promise<DatabaseFoodItem> {
    const { id, ...updateData } = request;

    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '更新食物失敗');
    }

    const data = await response.json();
    return data.food;
  }

  // Delete food
  static async deleteFood(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '刪除食物失敗');
    }

    return true;
  }

  // Validate food medically
  static async validateFood(id: string): Promise<DatabaseFoodItem> {
    const response = await fetch(`${this.baseUrl}/${id}/validate`, {
      method: 'PATCH'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '驗證食物失敗');
    }

    const data = await response.json();
    return data.food;
  }

  // Get database statistics
  static async getDatabaseStats(): Promise<DatabaseStats> {
    const response = await fetch(`${this.baseUrl}/stats`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '獲取統計失敗');
    }

    const data = await response.json();
    return data.stats;
  }

  // Search foods
  static async searchFoods(query: string): Promise<DatabaseFoodItem[]> {
    return this.getAllFoods(query);
  }

  // Get foods by category
  static async getFoodsByCategory(category: string): Promise<DatabaseFoodItem[]> {
    return this.getAllFoods(undefined, category);
  }
}