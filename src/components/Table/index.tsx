import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import styles from './index.module.css';
import Button from '../Button';
import Checkbox from '../Checkbox';
import { SortIcon, AngleLeftIcon, AngleRightIcon } from '../Icon';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../Select';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxItem, ComboboxEmpty } from '../Combobox';
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from '../ScrollArea';

const CHECKBOX_COL_WIDTH = 32;
const MIN_COL_WIDTH = 80;

export interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: string[];
  filterType?: 'text' | 'select' | 'combobox';
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  /** Fixed width in px. When set, the column is excluded from the initial
      fit-to-container distribution and cannot be dragged to resize. */
  width?: number;
  /** Minimum width in px for a resizable column — floors the initial fit and
      the drag-to-resize. Ignored when `width` is set. Defaults to MIN_COL_WIDTH. */
  minWidth?: number;
}

export interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  selectable?: boolean;
  pageSize?: number;
  onSelectionChange?: (selectedKeys: Set<string>) => void;
  rowClassName?: (row: T) => string | undefined;
}

function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  selectable = false,
  pageSize,
  onSelectionChange,
  rowClassName,
}: TableProps<T>) {
  const [sortCol, setSortCol] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  // Column widths live in state (px) rather than being derived from content,
  // so header content changes (sort icon, filter field) never shift layout.
  // Resizable columns get an initial width fitted to the container on mount;
  // columns with an explicit `width` stay fixed and non-resizable.
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const didFitRef = useRef(false);
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  useLayoutEffect(() => {
    if (didFitRef.current) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    didFitRef.current = true;

    const fixedTotal =
      (selectable ? CHECKBOX_COL_WIDTH : 0) +
      columns.reduce((sum, c) => sum + (c.width ?? 0), 0);
    const resizableCols = columns.filter(c => c.width === undefined);
    const available = Math.max(0, wrapper.clientWidth - fixedTotal);
    const totalWeight = resizableCols.reduce((sum, c) => sum + Math.max(c.header.length, 4), 0) || 1;

    const widths: Record<string, number> = {};
    resizableCols.forEach(c => {
      const weight = Math.max(c.header.length, 4);
      const min = c.minWidth ?? MIN_COL_WIDTH;
      widths[c.key as string] = Math.max(min, Math.round((weight / totalWeight) * available));
    });
    setColWidths(widths);
  }, [columns, selectable]);

  const handleResizeStart = (key: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = colWidths[key] ?? MIN_COL_WIDTH;
    const colMin = columns.find(c => c.key === key)?.minWidth ?? MIN_COL_WIDTH;
    resizingRef.current = { key, startX: e.clientX, startWidth };

    const onMove = (ev: PointerEvent) => {
      const r = resizingRef.current;
      if (!r) return;
      const next = Math.max(colMin, r.startWidth + (ev.clientX - r.startX));
      setColWidths(w => ({ ...w, [r.key]: next }));
    };
    const onUp = () => {
      resizingRef.current = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  const selectFilterKeys = useMemo(
    () => new Set(columns.filter(c => c.filterOptions).map(c => c.key as string)),
    [columns]
  );

  const comboboxItems = useMemo(() => {
    const result: Record<string, string[]> = {};
    columns.forEach(col => {
      if (col.filterType === 'combobox') {
        result[col.key as string] = [...new Set(data.map(row => String(row[col.key] ?? '')))].sort();
      }
    });
    return result;
  }, [columns, data]);

  const processed = useMemo(() => {
    let result = data.filter(row =>
      Object.entries(filters).every(([key, val]) => {
        if (!val) return true;
        const cell = String(row[key] ?? '');
        return selectFilterKeys.has(key)
          ? cell === val
          : cell.toLowerCase().includes(val.toLowerCase());
      })
    );
    if (sortCol !== null) {
      result = [...result].sort((a, b) => {
        const av = a[sortCol as string];
        const bv = b[sortCol as string];
        const cmp = (() => {
          if (av == null && bv == null) return 0;
          if (av == null) return -1;
          if (bv == null) return 1;
          if (typeof av === 'number' && typeof bv === 'number') return av - bv;
          return String(av).localeCompare(String(bv));
        })();
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, filters, sortCol, sortDir]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(processed.length / pageSize)) : 1;
  const clampedPage = Math.min(page, totalPages);
  const paginated = pageSize
    ? processed.slice((clampedPage - 1) * pageSize, clampedPage * pageSize)
    : processed;

  const handleSort = (col: keyof T) => {
    if (sortCol === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleFilter = (col: keyof T, val: string) => {
    setFilters(f => ({ ...f, [col as string]: val }));
    setPage(1);
  };

  const allPageKeys = paginated.map(row => String(row[rowKey]));
  const allSelected = allPageKeys.length > 0 && allPageKeys.every(k => selected.has(k));
  const someSelected = allPageKeys.some(k => selected.has(k)) && !allSelected;

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allPageKeys.forEach(k => next.delete(k));
      } else {
        allPageKeys.forEach(k => next.add(k));
      }
      onSelectionChange?.(next);
      return next;
    });
  };

  const toggleRow = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onSelectionChange?.(next);
      return next;
    });
  };

  const startIdx = pageSize ? (clampedPage - 1) * pageSize + 1 : 1;
  const endIdx = pageSize ? Math.min(clampedPage * pageSize, processed.length) : processed.length;
  const colSpan = (selectable ? 1 : 0) + columns.length;

  return (
    <div>
      <ScrollArea className={styles.Wrapper} ref={wrapperRef}>
      <ScrollAreaViewport>
      <ScrollAreaContent>
        <table className={styles.Table}>
          <colgroup>
            {selectable && <col style={{ width: CHECKBOX_COL_WIDTH }} />}
            {columns.map(col => (
              <col
                key={String(col.key)}
                style={{ width: col.width ?? Math.max(colWidths[col.key as string] ?? MIN_COL_WIDTH, col.minWidth ?? 0) }}
              />
            ))}
          </colgroup>
          <thead className={styles.Thead}>
            <tr>
              {selectable && (
                <th className={styles.ThCheckbox}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map(col => {
                const isSorted = sortCol === col.key;
                const resizable = col.width === undefined;
                return (
                  <th
                    key={String(col.key)}
                    className={col.sortable ? styles.ThSortable : styles.Th}
                    aria-sort={
                      col.sortable
                        ? isSorted
                          ? sortDir === 'asc' ? 'ascending' : 'descending'
                          : 'none'
                        : undefined
                    }
                    {...(col.sortable && isSorted && { 'data-sorted': sortDir })}
                  >
                    <div className={styles.ThContent}>
                      {col.sortable ? (
                        <button
                          type="button"
                          className={styles.SortButton}
                          onClick={() => handleSort(col.key)}
                        >
                          <span className={styles.ThLabel}>{col.header}</span>
                          <SortIcon className={styles.SortIcon} />
                        </button>
                      ) : (
                        <span className={styles.ThLabel}>{col.header}</span>
                      )}
                    </div>
                    {resizable && (
                      <span
                        className={styles.ResizeHandle}
                        onPointerDown={handleResizeStart(col.key as string)}
                      />
                    )}
                    {col.filterable && (
                      col.filterType === 'combobox' ? (
                        <div className={styles.FilterSelect}>
                          <Combobox
                            items={comboboxItems[col.key as string] ?? []}
                            inputValue={filters[col.key as string] ?? ''}
                            onInputValueChange={val => handleFilter(col.key, val)}
                          >
                            <ComboboxInput placeholder="Search…" aria-label={`Filter ${col.header}`} />
                            <ComboboxContent>
                              {(comboboxItems[col.key as string] ?? []).map(opt => (
                                <ComboboxItem key={opt} value={opt}>{opt}</ComboboxItem>
                              ))}
                              <ComboboxEmpty>No results</ComboboxEmpty>
                            </ComboboxContent>
                          </Combobox>
                        </div>
                      ) : col.filterOptions ? (
                        <div className={styles.FilterSelect}>
                          <Select
                            value={filters[col.key as string] ?? ''}
                            onValueChange={val => handleFilter(col.key, val as string)}
                          >
                            <SelectTrigger placeholder="All" aria-label={`Filter ${col.header}`} />
                            <SelectContent>
                              <SelectItem value="">All</SelectItem>
                              {col.filterOptions.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <input
                          className={styles.FilterInput}
                          placeholder="Filter…"
                          value={filters[col.key as string] ?? ''}
                          onChange={e => handleFilter(col.key, e.target.value)}
                          aria-label={`Filter ${col.header}`}
                        />
                      )
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td className={styles.Empty} colSpan={colSpan}>
                  No results found
                </td>
              </tr>
            ) : (
              paginated.map(row => {
                const rowId = String(row[rowKey]);
                const isSelected = selected.has(rowId);
                return (
                  <tr
                    key={rowId}
                    className={[styles.Tr, rowClassName?.(row)].filter(Boolean).join(' ')}
                    {...(isSelected && { 'data-selected': '' })}
                  >
                    {selectable && (
                      <td className={styles.TdCheckbox}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(rowId)}
                          aria-label={`Select row ${rowId}`}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={String(col.key)} className={styles.Td}>
                        {col.render
                          ? col.render(row[col.key], row)
                          : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="horizontal">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
      </ScrollArea>

      {pageSize !== undefined && processed.length > 0 && (
        <div className={styles.Pagination}>
          <Button
            variant="ghost"
            iconOnly
            leftIcon={<AngleLeftIcon />}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={clampedPage === 1}
            aria-label="Previous page"
          />
          <span className={styles.PaginationInfo}>
            {startIdx} to {endIdx} rows
          </span>
          <Button
            variant="ghost"
            iconOnly
            leftIcon={<AngleRightIcon />}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={clampedPage >= totalPages}
            aria-label="Next page"
          />
        </div>
      )}
    </div>
  );
}

export default Table;
