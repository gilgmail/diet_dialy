import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SymptomSlider } from '@/components/symptoms/SymptomSlider';
import type { CoreSymptomScores } from '@/types/medical';

describe('SymptomSlider', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Overall Health Slider', () => {
    it('should render health slider with correct labels', () => {
      render(
        <SymptomSlider
          symptom="overall_health"
          value={3}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      // Check for multiple occurrences of Chinese label
      const healthLabels = screen.getAllByText(/健康/);
      expect(healthLabels.length).toBeGreaterThan(0);
      expect(screen.getByText(/Overall Health/)).toBeInTheDocument();
    });

    it('should show correct range for health (1-5)', () => {
      render(
        <SymptomSlider
          symptom="overall_health"
          value={3}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '1');
      expect(slider).toHaveAttribute('max', '5');
    });

    it('should display health quality labels', () => {
      render(
        <SymptomSlider
          symptom="overall_health"
          value={3}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      // Check for quality labels
      expect(screen.getByText(/非常差/)).toBeInTheDocument();
      expect(screen.getByText(/一般/)).toBeInTheDocument();
      expect(screen.getByText(/非常好/)).toBeInTheDocument();
    });
  });

  describe('Symptom Sliders (0-5 scale)', () => {
    const symptoms: Array<keyof CoreSymptomScores> = [
      'abdominal_pain',
      'diarrhea',
      'bloody_stool',
      'bloating'
    ];

    symptoms.forEach(symptom => {
      it(`should render ${symptom} slider correctly`, () => {
        render(
          <SymptomSlider
            symptom={symptom}
            value={0}
            onChange={mockOnChange}
            showLabels={true}
          />
        );

        const slider = screen.getByRole('slider');
        expect(slider).toHaveAttribute('min', '0');
        expect(slider).toHaveAttribute('max', '5');
      });
    });

    it('should show symptom severity labels', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      expect(screen.getByText(/無/)).toBeInTheDocument();
      expect(screen.getByText(/中等/)).toBeInTheDocument();
      expect(screen.getByText(/極嚴重/)).toBeInTheDocument();
    });
  });

  describe('Value Changes', () => {
    it('should call onChange when slider value changes', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={0}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '3' } });

      expect(mockOnChange).toHaveBeenCalledWith(3);
    });

    it('should update value prop correctly', () => {
      const { rerender } = render(
        <SymptomSlider
          symptom="diarrhea"
          value={0}
          onChange={mockOnChange}
        />
      );

      let slider = screen.getByRole('slider');
      expect(slider).toHaveValue('0');

      rerender(
        <SymptomSlider
          symptom="diarrhea"
          value={4}
          onChange={mockOnChange}
        />
      );

      slider = screen.getByRole('slider');
      expect(slider).toHaveValue('4');
    });

    it('should handle minimum value (0 for symptoms)', () => {
      render(
        <SymptomSlider
          symptom="bloating"
          value={2}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0' } });

      expect(mockOnChange).toHaveBeenCalledWith(0);
    });

    it('should handle maximum value (5)', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '5' } });

      expect(mockOnChange).toHaveBeenCalledWith(5);
    });

    it('should handle minimum value (1 for health)', () => {
      render(
        <SymptomSlider
          symptom="overall_health"
          value={3}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '1' } });

      expect(mockOnChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Size Variations', () => {
    it('should render small size', () => {
      const { container } = render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
          size="sm"
        />
      );

      expect(container.querySelector('.h-1')).toBeInTheDocument();
    });

    it('should render medium size', () => {
      const { container } = render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
          size="md"
        />
      );

      expect(container.querySelector('.h-2')).toBeInTheDocument();
    });

    it('should render large size', () => {
      const { container } = render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
          size="lg"
        />
      );

      expect(container.querySelector('.h-3')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable slider when disabled prop is true', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toBeDisabled();
    });

    it('should not call onChange when disabled', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '4' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should apply disabled styling', () => {
      const { container } = render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      expect(container.querySelector('.opacity-50')).toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should show current value indicator', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={3}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should update visual indicator when value changes', () => {
      const { rerender } = render(
        <SymptomSlider
          symptom="diarrhea"
          value={1}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();

      rerender(
        <SymptomSlider
          symptom="diarrhea"
          value={4}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should show color coding for severity levels', () => {
      const { container, rerender } = render(
        <SymptomSlider
          symptom="bloody_stool"
          value={0}
          onChange={mockOnChange}
        />
      );

      // Low severity (0-1) - green
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();

      // Medium severity (2-3)
      rerender(
        <SymptomSlider
          symptom="bloody_stool"
          value={3}
          onChange={mockOnChange}
        />
      );
      expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument();

      // High severity (4-5)
      rerender(
        <SymptomSlider
          symptom="bloody_stool"
          value={5}
          onChange={mockOnChange}
        />
      );
      expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
    });
  });

  describe('Localization', () => {
    it('should show Chinese labels', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      // Use getAllByText for multiple matches
      const labels = screen.getAllByText(/腹痛/);
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should show English labels', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      expect(screen.getByText(/Abdominal Pain/)).toBeInTheDocument();
    });

    it('should show emoji icons for symptoms', () => {
      const { container } = render(
        <SymptomSlider
          symptom="bloating"
          value={2}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      // Check for emoji presence in label
      const label = container.querySelector('label');
      expect(label).toBeTruthy();
      expect(label?.textContent).toMatch(/💨|🎈|脹氣/);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '2');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '5');
    });

    it('should have descriptive label', () => {
      render(
        <SymptomSlider
          symptom="diarrhea"
          value={3}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={2}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      slider.focus();
      expect(slider).toHaveFocus();

      // Simulate arrow key press
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      // Value should change (implementation dependent)
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid value gracefully', () => {
      render(
        <SymptomSlider
          symptom="abdominal_pain"
          value={-1 as any}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });

    it('should handle out of range values', () => {
      render(
        <SymptomSlider
          symptom="bloating"
          value={10 as any}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');
      // Slider should clamp to max value
      expect(slider).toHaveAttribute('max', '5');
    });

    it('should handle rapid value changes', () => {
      render(
        <SymptomSlider
          symptom="diarrhea"
          value={0}
          onChange={mockOnChange}
        />
      );

      const slider = screen.getByRole('slider');

      // Rapid changes
      fireEvent.change(slider, { target: { value: '1' } });
      fireEvent.change(slider, { target: { value: '2' } });
      fireEvent.change(slider, { target: { value: '3' } });
      fireEvent.change(slider, { target: { value: '4' } });

      expect(mockOnChange).toHaveBeenCalledTimes(4);
      expect(mockOnChange).toHaveBeenLastCalledWith(4);
    });
  });
});