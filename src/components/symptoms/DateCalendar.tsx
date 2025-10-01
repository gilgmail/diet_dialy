'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DateCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  recordedDates: string[]; // Array of YYYY-MM-DD
  onDateSelect: (date: string) => void;
  maxDate?: string; // YYYY-MM-DD
}

export function DateCalendar({
  selectedDate,
  recordedDates,
  onDateSelect,
  maxDate
}: DateCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const maxDateObj = maxDate ? new Date(maxDate) : new Date();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDays = prevMonthLastDay.getDate();

    const days: Array<{
      date: string;
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasRecord: boolean;
      isFuture: boolean;
    }> = [];

    // Helper function to format date as YYYY-MM-DD in local timezone
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Add previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      const dateStr = formatLocalDate(date);

      days.push({
        date: dateStr,
        day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: dateStr === selectedDate,
        hasRecord: recordedDates.includes(dateStr),
        isFuture: date > maxDateObj
      });
    }

    // Add current month's days
    const today = formatLocalDate(new Date());
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatLocalDate(date);

      days.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday: dateStr === today,
        isSelected: dateStr === selectedDate,
        hasRecord: recordedDates.includes(dateStr),
        isFuture: date > maxDateObj
      });
    }

    // Add next month's leading days
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateStr = formatLocalDate(date);

      days.push({
        date: dateStr,
        day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: dateStr === selectedDate,
        hasRecord: recordedDates.includes(dateStr),
        isFuture: date > maxDateObj
      });
    }

    return days;
  }, [currentMonth, selectedDate, recordedDates, maxDateObj]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect(today.toISOString().split('T')[0]);
  };

  const monthName = currentMonth.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <Card className="p-2 max-w-xs mx-auto">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-6 w-6 p-0 text-xs"
        >
          ←
        </Button>

        <div className="flex items-center gap-1">
          <h3 className="text-xs font-semibold text-gray-900">{monthName}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-[10px] h-5 px-1.5"
          >
            今天
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          className="h-6 w-6 p-0 text-xs"
        >
          →
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mb-1.5 text-[10px] text-gray-600">
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          <span>已記錄</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
          <span>已選擇</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="text-center text-[10px] font-medium text-gray-500 py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((dayInfo, index) => {
          const baseClasses = "relative h-7 text-[11px] rounded transition-all";

          let dayClasses = baseClasses;

          // Future dates - disabled
          if (dayInfo.isFuture) {
            dayClasses += " text-gray-300 cursor-not-allowed";
          }
          // Selected date
          else if (dayInfo.isSelected) {
            dayClasses += " bg-medical-primary text-white font-semibold ring-1 ring-medical-primary";
          }
          // Has record
          else if (dayInfo.hasRecord) {
            dayClasses += " bg-green-50 text-green-700 font-medium border border-green-200 hover:bg-green-100 cursor-pointer";
          }
          // Today
          else if (dayInfo.isToday) {
            dayClasses += " bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 cursor-pointer";
          }
          // Current month
          else if (dayInfo.isCurrentMonth) {
            dayClasses += " text-gray-700 hover:bg-gray-100 cursor-pointer";
          }
          // Other month
          else {
            dayClasses += " text-gray-400 hover:bg-gray-50 cursor-pointer";
          }

          return (
            <button
              key={index}
              onClick={() => !dayInfo.isFuture && onDateSelect(dayInfo.date)}
              disabled={dayInfo.isFuture}
              className={dayClasses}
              title={dayInfo.hasRecord ? '已有記錄' : undefined}
            >
              {dayInfo.day}
              {dayInfo.hasRecord && !dayInfo.isSelected && (
                <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-green-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mt-2 pt-1.5 border-t border-gray-200 text-center">
        <p className="text-[10px] text-gray-500">
          本月已記錄 {calendarDays.filter(d => d.isCurrentMonth && d.hasRecord).length} 天
        </p>
      </div>
    </Card>
  );
}
