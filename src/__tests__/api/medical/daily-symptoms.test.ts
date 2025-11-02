/**
 * API Tests for /api/medical/daily-symptoms
 * Verifies routing logic around DailySymptomService integration.
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/medical/daily-symptoms/route';
import { DailySymptomService } from '@/lib/supabase/daily-symptom-service';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => {
  const getUser = jest.fn().mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null
  });

  return {
    createClient: jest.fn(() => ({
      auth: {
        getUser
      }
    }))
  };
});

jest.mock('@/lib/supabase/daily-symptom-service', () => ({
  DailySymptomService: {
    getEntryByDate: jest.fn(),
    getEntriesByRange: jest.fn(),
    getRecentEntries: jest.fn(),
    getRecordedDates: jest.fn(),
    createEntry: jest.fn(),
    updateEntry: jest.fn(),
    updateEntryByDate: jest.fn(),
    deleteEntry: jest.fn(),
    deleteEntryByDate: jest.fn()
  }
}));

const mockEntry = {
  id: 'entry-123',
  user_id: 'user-123',
  recorded_date: '2024-01-15',
  recorded_at: new Date('2024-01-15T08:00:00Z'),
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
  medications_taken: [],
  medication_adherence: 5,
  notes: 'Feeling better',
  triggers_identified: [],
  improvement_factors: [],
  related_food_entries: [],
  entry_source: 'manual',
  data_completeness_score: 0.95,
  created_at: new Date('2024-01-15T08:00:00Z'),
  updated_at: new Date('2024-01-15T08:00:00Z')
};

const serviceMock = DailySymptomService as jest.Mocked<typeof DailySymptomService>;
const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

describe('/api/medical/daily-symptoms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default auth response
    const supabase = createClientMock();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
  });

  describe('GET handler', () => {
    it('returns 400 when userId is missing', async () => {
      const request = new NextRequest('http://localhost/api/medical/daily-symptoms');
      const response = await GET(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('用戶 ID');
      expect(serviceMock.getRecentEntries).not.toHaveBeenCalled();
    });

    it('returns entry for a specific date', async () => {
      serviceMock.getEntryByDate.mockResolvedValue(mockEntry);

      const request = new NextRequest(
        'http://localhost/api/medical/daily-symptoms?userId=user-123&date=2024-01-15'
      );
      const response = await GET(request);

      expect(serviceMock.getEntryByDate).toHaveBeenCalledWith('user-123', '2024-01-15');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: 'entry-123',
        recorded_date: '2024-01-15',
        overall_health: 4
      });
    });

    it('returns entries for a date range', async () => {
      serviceMock.getEntriesByRange.mockResolvedValue([mockEntry]);

      const request = new NextRequest(
        'http://localhost/api/medical/daily-symptoms?userId=user-123&startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);

      expect(serviceMock.getEntriesByRange).toHaveBeenCalledWith('user-123', '2024-01-01', '2024-01-31');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data[0]).toMatchObject({
        id: 'entry-123',
        recorded_date: '2024-01-15',
        overall_health: 4
      });
    });

    it('returns recorded dates when datesOnly is true', async () => {
      serviceMock.getRecordedDates.mockResolvedValue(['2024-01-15', '2024-01-16']);

      const request = new NextRequest(
        'http://localhost/api/medical/daily-symptoms?userId=user-123&datesOnly=true'
      );
      const response = await GET(request);

      expect(serviceMock.getRecordedDates).toHaveBeenCalledWith('user-123', undefined, undefined);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toEqual(['2024-01-15', '2024-01-16']);
    });

    it('returns recent entries by default', async () => {
      serviceMock.getRecentEntries.mockResolvedValue([mockEntry]);

      const request = new NextRequest(
        'http://localhost/api/medical/daily-symptoms?userId=user-123&limit=5'
      );
      const response = await GET(request);

      expect(serviceMock.getRecentEntries).toHaveBeenCalledWith('user-123', 5);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data[0]).toMatchObject({
        id: 'entry-123',
        recorded_date: '2024-01-15',
        overall_health: 4
      });
    });

    it('handles service failures gracefully', async () => {
      serviceMock.getRecentEntries.mockRejectedValue(new Error('Database down'));

      const request = new NextRequest(
        'http://localhost/api/medical/daily-symptoms?userId=user-123'
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('錯誤');
    });
  });

  describe('POST handler', () => {
    const basePayload = {
      userId: 'user-123',
      overall_health: 4,
      abdominal_pain: 1,
      diarrhea: 0,
      bloody_stool: 0,
      bloating: 2,
      recorded_date: '2024-01-15'
    };

    it('enforces required userId', async () => {
      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'POST',
        body: JSON.stringify({ ...basePayload, userId: undefined })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('用戶 ID');
      expect(serviceMock.createEntry).not.toHaveBeenCalled();
    });

    it('validates overall health score range', async () => {
      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'POST',
        body: JSON.stringify({ ...basePayload, overall_health: 0 })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('整體健康評分');
    });

    it('creates a new entry when payload is valid', async () => {
      serviceMock.createEntry.mockResolvedValue(mockEntry);

      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'POST',
        body: JSON.stringify(basePayload)
      });

      const response = await POST(request);
      expect(serviceMock.createEntry).toHaveBeenCalled();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: 'entry-123',
        recorded_date: '2024-01-15',
        overall_health: 4
      });
    });

    it('returns 500 when service throws', async () => {
      serviceMock.createEntry.mockRejectedValue(new Error('Insert failed'));

      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'POST',
        body: JSON.stringify(basePayload)
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('PUT handler', () => {
    const updatePayload = {
      userId: 'user-123',
      entryId: 'entry-123',
      overall_health: 5
    };

    it('requires userId', async () => {
      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'PUT',
        body: JSON.stringify({ ...updatePayload, userId: undefined })
      });

      const response = await PUT(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('用戶 ID');
    });

    it('requires entryId or date', async () => {
      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'PUT',
        body: JSON.stringify({ userId: 'user-123' })
      });

      const response = await PUT(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('entryId 或 date');
    });

    it('updates entry by id', async () => {
      serviceMock.updateEntry.mockResolvedValue({ ...mockEntry, overall_health: 5 });

      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      });

      const response = await PUT(request);
      expect(serviceMock.updateEntry).toHaveBeenCalledWith(
        'entry-123',
        'user-123',
        expect.objectContaining({ overall_health: 5 })
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data?.overall_health).toBe(5);
    });

    it('updates entry by date', async () => {
      serviceMock.updateEntryByDate.mockResolvedValue({ ...mockEntry, notes: 'Updated' });

      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'user-123',
          date: '2024-01-15',
          notes: 'Updated'
        })
      });

      const response = await PUT(request);
      expect(serviceMock.updateEntryByDate).toHaveBeenCalledWith(
        'user-123',
        '2024-01-15',
        expect.objectContaining({ notes: 'Updated' })
      );
      expect(response.status).toBe(200);
    });

    it('returns 404 when entry cannot be found', async () => {
      serviceMock.updateEntry.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      });

      const response = await PUT(request);
      expect(response.status).toBe(404);
    });

    it('returns 500 when service throws', async () => {
      serviceMock.updateEntry.mockRejectedValue(new Error('Update failed'));

      const request = new NextRequest('http://localhost/api/medical/daily-symptoms', {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      });

      const response = await PUT(request);
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE handler', () => {
    it('requires userId', async () => {
      const request = new NextRequest('http://localhost/api/medical/daily-symptoms');
      const response = await DELETE(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('用戶 ID');
    });

    it('requires entryId or date parameter', async () => {
      const request = new NextRequest('http://localhost/api/medical/daily-symptoms?userId=user-123');
      const response = await DELETE(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('entryId 或 date');
    });

    it('deletes entry by id', async () => {
      serviceMock.deleteEntry.mockResolvedValue(true);

      const request = new NextRequest(
        'http://localhost/api/medical/daily-symptoms?userId=user-123&entryId=entry-123'
      );
      const response = await DELETE(request);

      expect(serviceMock.deleteEntry).toHaveBeenCalledWith('entry-123', 'user-123');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('deletes entry by date', async () => {
      serviceMock.deleteEntryByDate.mockResolvedValue(true);

      const request = new NextRequest(
        'http://localhost/api/medical/daily-symptoms?userId=user-123&date=2024-01-15'
      );
      const response = await DELETE(request);

      expect(serviceMock.deleteEntryByDate).toHaveBeenCalledWith('user-123', '2024-01-15');
      expect(response.status).toBe(200);
    });

    it('returns 404 when delete target not found', async () => {
      serviceMock.deleteEntry.mockResolvedValue(false);

      const request = new NextRequest(
        'http://localhost/api/medical/daily-symptoms?userId=user-123&entryId=missing'
      );
      const response = await DELETE(request);
      expect(response.status).toBe(404);
    });

    it('returns 500 when service throws', async () => {
      serviceMock.deleteEntry.mockRejectedValue(new Error('Delete failed'));

      const request = new NextRequest(
        'http://localhost/api/medical/daily-symptoms?userId=user-123&entryId=entry-123'
      );
      const response = await DELETE(request);
      expect(response.status).toBe(500);
    });
  });
});
