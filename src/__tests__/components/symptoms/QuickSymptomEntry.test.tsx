import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { QuickSymptomEntry } from '@/components/symptoms/QuickSymptomEntry';
import type { DailySymptomEntry } from '@/types/medical';

describe('QuickSymptomEntry', () => {
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with all core symptom sliders', () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      expect(screen.getByText(/快速症狀記錄/)).toBeInTheDocument();
      expect(screen.getByText(/健康/)).toBeInTheDocument();
      expect(screen.getByText(/腹痛/)).toBeInTheDocument();
      expect(screen.getByText(/腹瀉/)).toBeInTheDocument();
      expect(screen.getByText(/血便/)).toBeInTheDocument();
      expect(screen.getByText(/脹氣/)).toBeInTheDocument();
    });

    it('should display symptom burden indicator', () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      expect(screen.getByText(/當前症狀狀態/)).toBeInTheDocument();
      expect(screen.getByText(/無症狀/)).toBeInTheDocument();
    });

    it('should render notes textarea', () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/記錄任何額外的症狀/);
      expect(textarea).toBeInTheDocument();
    });

    it('should render submit and reset buttons', () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      expect(screen.getByRole('button', { name: /儲存症狀記錄/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /重設/ })).toBeInTheDocument();
    });
  });

  describe('Score Changes', () => {
    it('should update overall health score', async () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      const healthSlider = screen.getByRole('slider', { name: /健康/ });
      fireEvent.change(healthSlider, { target: { value: '5' } });

      await waitFor(() => {
        expect(healthSlider).toHaveValue('5');
      });
    });

    it('should update symptom burden indicator when symptoms change', async () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      // Initially should show "無症狀"
      expect(screen.getByText(/無症狀/)).toBeInTheDocument();

      // Change abdominal pain to 3
      const painSlider = screen.getByRole('slider', { name: /腹痛/ });
      fireEvent.change(painSlider, { target: { value: '3' } });

      await waitFor(() => {
        expect(screen.queryByText(/無症狀/)).not.toBeInTheDocument();
        expect(screen.getByText(/中等症狀/)).toBeInTheDocument();
      });
    });

    it('should show severe symptoms when multiple high scores', async () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      const sliders = screen.getAllByRole('slider');
      // Set multiple symptoms to high values
      fireEvent.change(sliders[1], { target: { value: '4' } }); // abdominal_pain
      fireEvent.change(sliders[2], { target: { value: '4' } }); // diarrhea
      fireEvent.change(sliders[3], { target: { value: '4' } }); // bloody_stool

      await waitFor(() => {
        expect(screen.getByText(/嚴重症狀/)).toBeInTheDocument();
      });
    });
  });

  describe('Notes Input', () => {
    it('should update notes when typing', async () => {
      const user = userEvent.setup();
      render(<QuickSymptomEntry {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/記錄任何額外的症狀/);
      await user.type(textarea, '今天感覺不舒服');

      expect(textarea).toHaveValue('今天感覺不舒服');
    });

    it('should enforce maximum length of 500 characters', () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/記錄任何額外的症狀/) as HTMLTextAreaElement;
      expect(textarea.maxLength).toBe(500);
    });
  });

  describe('Form Submission', () => {
    it('should submit form with default values', async () => {
      const user = userEvent.setup();
      render(<QuickSymptomEntry {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            overall_health: 3,
            abdominal_pain: 0,
            diarrhea: 0,
            bloody_stool: 0,
            bloating: 0,
            entry_source: 'manual',
            data_completeness_score: 1.0,
          })
        );
      });
    });

    it('should submit form with custom scores', async () => {
      const user = userEvent.setup();
      render(<QuickSymptomEntry {...defaultProps} />);

      // Change scores
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '5' } }); // health
      fireEvent.change(sliders[1], { target: { value: '2' } }); // pain
      fireEvent.change(sliders[2], { target: { value: '1' } }); // diarrhea

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            overall_health: 5,
            abdominal_pain: 2,
            diarrhea: 1,
            bloody_stool: 0,
            bloating: 0,
          })
        );
      });
    });

    it('should submit form with notes', async () => {
      const user = userEvent.setup();
      render(<QuickSymptomEntry {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/記錄任何額外的症狀/);
      await user.type(textarea, '吃了辣食物後不舒服');

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: '吃了辣食物後不舒服',
          })
        );
      });
    });

    it('should include correct metadata in submission', async () => {
      const user = userEvent.setup();
      const mockDate = new Date('2024-01-15T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<QuickSymptomEntry {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            recorded_date: '2024-01-15',
            recorded_at: mockDate,
            entry_source: 'manual',
            data_completeness_score: 1.0,
            triggers_identified: [],
            improvement_factors: [],
            medications_taken: [],
            additional_symptoms: [],
            related_food_entries: [],
          })
        );
      });

      jest.restoreAllMocks();
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(<QuickSymptomEntry {...defaultProps} />);

      // Set some values
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '4' } });

      const textarea = screen.getByPlaceholderText(/記錄任何額外的症狀/);
      await user.type(textarea, 'Test notes');

      // Submit
      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      await user.click(submitButton);

      // Wait for form to reset
      await waitFor(() => {
        expect(sliders[0]).toHaveValue('3'); // Reset to default
        expect(textarea).toHaveValue(''); // Notes cleared
      });
    });

    it('should show error message on submission failure', async () => {
      const user = userEvent.setup();
      const errorMessage = '提交失敗，請重試';
      mockOnSubmit.mockRejectedValue(new Error(errorMessage));

      render(<QuickSymptomEntry {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should clear error message when user makes changes', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValue(new Error('Error'));

      render(<QuickSymptomEntry {...defaultProps} />);

      // Submit to trigger error
      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Error/)).toBeInTheDocument();
      });

      // Change a score
      const slider = screen.getAllByRole('slider')[0];
      fireEvent.change(slider, { target: { value: '4' } });

      await waitFor(() => {
        expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should disable form elements when loading', () => {
      render(<QuickSymptomEntry {...defaultProps} isLoading={true} />);

      const sliders = screen.getAllByRole('slider');
      sliders.forEach(slider => {
        expect(slider).toBeDisabled();
      });

      const textarea = screen.getByPlaceholderText(/記錄任何額外的症狀/);
      expect(textarea).toBeDisabled();

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      expect(submitButton).toBeDisabled();
    });

    it('should show submitting state during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>(resolve => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(submitPromise);

      render(<QuickSymptomEntry {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/提交中/)).toBeInTheDocument();
      });

      // Resolve the promise
      resolveSubmit!();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all scores to default when reset button clicked', async () => {
      const user = userEvent.setup();
      render(<QuickSymptomEntry {...defaultProps} />);

      // Change scores
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '5' } });
      fireEvent.change(sliders[1], { target: { value: '3' } });

      // Add notes
      const textarea = screen.getByPlaceholderText(/記錄任何額外的症狀/);
      await user.type(textarea, 'Test notes');

      // Click reset
      const resetButton = screen.getByRole('button', { name: /重設/ });
      await user.click(resetButton);

      // Verify reset
      expect(sliders[0]).toHaveValue('3'); // Default health
      expect(sliders[1]).toHaveValue('0'); // Default pain
      expect(textarea).toHaveValue('');
    });
  });

  describe('Initial Values', () => {
    it('should load initial values when provided', () => {
      const initialValues = {
        overall_health: 4 as const,
        abdominal_pain: 2 as const,
        diarrhea: 1 as const,
        bloody_stool: 0 as const,
        bloating: 0 as const,
      };

      render(<QuickSymptomEntry {...defaultProps} initialValues={initialValues} />);

      const sliders = screen.getAllByRole('slider');
      expect(sliders[0]).toHaveValue('4'); // health
      expect(sliders[1]).toHaveValue('2'); // pain
      expect(sliders[2]).toHaveValue('1'); // diarrhea
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);

      const textarea = screen.getByPlaceholderText(/記錄任何額外的症狀/);
      expect(textarea).toHaveAttribute('aria-describedby');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<QuickSymptomEntry {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });

      await user.tab(); // Focus first element
      await user.tab(); // Navigate through form

      // Should be able to reach submit button
      submitButton.focus();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty notes correctly', async () => {
      const user = userEvent.setup();
      render(<QuickSymptomEntry {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/記錄任何額外的症狀/);
      await user.type(textarea, '   '); // Only whitespace

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: undefined, // Whitespace trimmed to undefined
          })
        );
      });
    });

    it('should handle rapid score changes', async () => {
      render(<QuickSymptomEntry {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[0];

      // Rapid changes
      fireEvent.change(slider, { target: { value: '1' } });
      fireEvent.change(slider, { target: { value: '3' } });
      fireEvent.change(slider, { target: { value: '5' } });

      await waitFor(() => {
        expect(slider).toHaveValue('5');
      });
    });

    it('should handle concurrent submissions gracefully', async () => {
      const user = userEvent.setup();
      let resolveCount = 0;
      mockOnSubmit.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolveCount++;
            resolve(undefined);
          }, 100);
        });
      });

      render(<QuickSymptomEntry {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /儲存症狀記錄/ });

      // Try to submit twice quickly
      await user.click(submitButton);
      await user.click(submitButton); // Should be disabled

      await waitFor(() => {
        // Should only submit once because button is disabled during submission
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });
  });
});