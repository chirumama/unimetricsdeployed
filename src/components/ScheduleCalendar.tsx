import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

type ScheduleCalendarProps = {
  selectedDate: string;
  markedDates: string[];
  onSelectDate: (date: string) => void;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function ScheduleCalendar({
  selectedDate,
  markedDates,
  onSelectDate,
}: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => startOfMonth(parseLocalDate(selectedDate)));
  const marked = React.useMemo(() => new Set(markedDates), [markedDates]);

  React.useEffect(() => {
    setCurrentMonth(startOfMonth(parseLocalDate(selectedDate)));
  }, [selectedDate]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDay = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const cells = [];

  for (let index = 0; index < startDay; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold text-gray-900">
          {currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wide text-gray-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-14 rounded-lg bg-transparent" />;
          }

          const dateKey = formatLocalDate(date);
          const isSelected = dateKey === selectedDate;
          const hasEvents = marked.has(dateKey);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`flex h-14 flex-col items-center justify-center rounded-lg border text-sm transition-colors ${
                isSelected
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/60'
              }`}
            >
              <span>{date.getDate()}</span>
              {hasEvents && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
