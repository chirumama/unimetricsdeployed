import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MultiSelectChipsProps = {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  error?: string;
};

export function MultiSelectChips({
  label,
  placeholder,
  options,
  selected,
  onChange,
  disabled,
  error,
}: MultiSelectChipsProps) {
  const availableOptions = options.filter((option) => !selected.includes(option));
  const [pending, setPending] = React.useState('');

  React.useEffect(() => {
    if (!availableOptions.includes(pending)) {
      setPending(availableOptions[0] ?? '');
    }
  }, [availableOptions, pending]);

  const handleAdd = () => {
    if (!pending) return;
    onChange([...selected, pending]);
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <select
          value={pending}
          onChange={(event) => setPending(event.target.value)}
          disabled={disabled || availableOptions.length === 0}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{availableOptions.length === 0 ? 'No more options' : placeholder}</option>
          {availableOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={handleAdd} disabled={disabled || !pending}>
          Add
        </Button>
      </div>
      <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-dashed border-gray-200 bg-gray-50 p-3">
        {selected.length === 0 && <span className="text-sm text-gray-400">No items selected</span>}
        {selected.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700"
          >
            {value}
            <button
              type="button"
              onClick={() => handleRemove(value)}
              disabled={disabled}
              className="rounded-full p-0.5 text-indigo-600 hover:bg-indigo-200 disabled:cursor-not-allowed"
              aria-label={`Remove ${value}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
