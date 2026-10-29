'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ALL = '__all__';

export interface FilterDef {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

/** Debounced search + select filters. Filter state lives in the URL (see useListState). */
export function ListToolbar({ search, onSearch, placeholder = 'Search…', filters = [], onReset, dirty }: { search: string; onSearch: (v: string) => void; placeholder?: string; filters?: FilterDef[]; onReset?: () => void; dirty?: boolean }) {
  const [text, setText] = useState(search);
  const [seen, setSeen] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow external changes (e.g. "Clear"), without re-firing a stale debounced value.
  if (search !== seen) {
    setSeen(search);
    setText(search);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function change(v: string) {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(v), 350);
  }

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-72">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
        <Input value={text} onChange={(e) => change(e.target.value)} placeholder={placeholder} aria-label="Search" className="pl-8" />
      </div>
      {filters.map((f) => (
        <Select key={f.key} value={f.value || ALL} onValueChange={(v) => f.onChange(v === ALL ? '' : v)}>
          <SelectTrigger className="sm:w-52" aria-label={f.label}>
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{f.label}: all</SelectItem>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {dirty && onReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="size-4" /> Clear
        </Button>
      )}
    </div>
  );
}
