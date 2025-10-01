/**
 * API Tests for Daily Symptom Tracking Endpoints
 * Tests /api/medical/daily-symptoms routes
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/medical/daily-symptoms/route';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn(),
          })),
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  })),
}));

describe('/api/medical/daily-symptoms', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSymptomEntry = {
    id: 'entry-123',
    user_id: 'user-123',
    recorded_date: '2024-01-15',
    recorded_at: new Date('2024-01-15T10:00:00Z'),
    overall_health: 4,
    abdominal_pain: 1,
    diarrhea: 0,
    bloody_stool: 0,
    bloating: 2,
    mood_score: 3,
    energy_level: 4,
    sleep_quality: 3,
    stress_level: 2,
    additional_symptoms: [],
    medications_taken: ['mesalamine'],
    medication_adherence: 5,
    notes: 'Feeling better today',
    triggers_identified: [],
    improvement_factors: ['good sleep'],
    related_food_entries: [],
    entry_source: 'manual',
    data_completeness_score: 0.95,
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/medical/daily-symptoms', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should retrieve entry for specific date', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSymptomEntry,
            error: null,
          }),
        }),
      });

      mockClient.from.mockReturnValue({
        select: mockSelect,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/medical/daily-symptoms?date=2024-01-15'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.entry).toEqual(mockSymptomEntry);
    });

    it('should retrieve entries for date range', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockEntries = [mockSymptomEntry];
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockEntries,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockClient.from.mockReturnValue({
        select: mockSelect,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/medical/daily-symptoms?start_date=2024-01-01&end_date=2024-01-31'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.entries).toEqual(mockEntries);
    });

    it('should retrieve recent entries when no params provided', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockEntries = [mockSymptomEntry];
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockEntries,
              error: null,
            }),
          }),
        }),
      });

      mockClient.from.mockReturnValue({
        select: mockSelect,
      });

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.entries).toEqual(mockEntries);
    });

    it('should handle database errors', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          }),
        }),
      });

      mockClient.from.mockReturnValue({
        select: mockSelect,
      });

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/medical/daily-symptoms', () => {
    const validEntryData = {
      overall_health: 4,
      abdominal_pain: 1,
      diarrhea: 0,
      bloody_stool: 0,
      bloating: 2,
      notes: 'Test entry',
    };

    it('should create new symptom entry', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSymptomEntry,
            error: null,
          }),
        }),
      });

      mockClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms', {
        method: 'POST',
        body: JSON.stringify(validEntryData),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.entry).toEqual(mockSymptomEntry);
    });

    it('should return 400 for invalid data', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidData = {
        overall_health: 10, // Invalid: should be 1-5
        abdominal_pain: -1, // Invalid: should be 0-5
      };

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should calculate data completeness score', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let capturedData: any;
      const mockInsert = jest.fn((data) => {
        capturedData = data;
        return {
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSymptomEntry,
              error: null,
            }),
          }),
        };
      });

      mockClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms', {
        method: 'POST',
        body: JSON.stringify(validEntryData),
      });

      await POST(request);

      expect(capturedData.data_completeness_score).toBeDefined();
      expect(capturedData.data_completeness_score).toBeGreaterThan(0);
      expect(capturedData.data_completeness_score).toBeLessThanOrEqual(1);
    });
  });

  describe('PUT /api/medical/daily-symptoms', () => {
    const updateData = {
      overall_health: 5,
      notes: 'Updated notes',
    };

    it('should update existing entry by ID', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const updatedEntry = { ...mockSymptomEntry, ...updateData };
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedEntry,
              error: null,
            }),
          }),
        }),
      });

      mockClient.from.mockReturnValue({
        update: mockUpdate,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/medical/daily-symptoms?id=entry-123',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.entry.overall_health).toBe(5);
    });

    it('should update entry by date', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const updatedEntry = { ...mockSymptomEntry, ...updateData };
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedEntry,
              error: null,
            }),
          }),
        }),
      });

      mockClient.from.mockReturnValue({
        update: mockUpdate,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/medical/daily-symptoms?date=2024-01-15',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request);

      expect(response.status).toBe(200);
    });

    it('should return 400 if neither ID nor date provided', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('ID or date');
    });
  });

  describe('DELETE /api/medical/daily-symptoms', () => {
    it('should delete entry by ID', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockClient.from.mockReturnValue({
        delete: mockDelete,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/medical/daily-symptoms?id=entry-123',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 400 if no ID provided', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms', {
        method: 'DELETE',
      });

      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('ID');
    });
  });

  describe('Data Validation', () => {
    it('should validate core symptom score ranges', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidData = {
        overall_health: 6, // Should be 1-5
        abdominal_pain: 0,
        diarrhea: 0,
        bloody_stool: 0,
        bloating: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should validate symptom score ranges (0-5)', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockClient = createClient();

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidData = {
        overall_health: 3,
        abdominal_pain: 10, // Should be 0-5
        diarrhea: 0,
        bloody_stool: 0,
        bloating: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/medical/daily-symptoms', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});