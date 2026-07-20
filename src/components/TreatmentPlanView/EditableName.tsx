import { useEffect, useRef, useState, type Ref } from 'react';
import { Tooltip } from '../Tooltip';
import styles from './EditableName.module.css';

const DEFAULT_MAX_LENGTH = 125;

export interface EditableNameProps {
  value: string;
  onCommit: (value: string) => void;
  maxLength?: number;
  className?: string;
  'aria-label'?: string;
  /** Controlled editing state (e.g. pencil / menu rename). */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  as?: 'h2' | 'span';
}

function selectElementContents(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function EditableName({
  value,
  onCommit,
  maxLength = DEFAULT_MAX_LENGTH,
  className,
  'aria-label': ariaLabel,
  editing: editingProp,
  onEditingChange,
  as: Tag = 'span',
}: EditableNameProps) {
  const textRef = useRef<HTMLElement>(null);
  const skipBlurCommit = useRef(false);
  const [uncontrolledEditing, setUncontrolledEditing] = useState(false);
  const [truncated, setTruncated] = useState(false);

  const isControlled = editingProp !== undefined;
  const editing = isControlled ? editingProp : uncontrolledEditing;

  const setEditing = (next: boolean) => {
    onEditingChange?.(next);
    if (!isControlled) setUncontrolledEditing(next);
  };

  const measure = () => {
    const el = textRef.current;
    if (!el || editing) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  };

  useEffect(() => {
    if (editing) return;
    measure();
    const el = textRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [editing, value, className]);

  useEffect(() => {
    if (!editing) return;
    const el = textRef.current;
    if (!el) return;
    el.textContent = value;
    const frame = requestAnimationFrame(() => {
      el.focus();
      selectElementContents(el);
    });
    return () => cancelAnimationFrame(frame);
  }, [editing, value]);

  const cancel = () => {
    skipBlurCommit.current = true;
    if (textRef.current) textRef.current.textContent = value;
    setEditing(false);
  };

  const commit = () => {
    skipBlurCommit.current = true;
    const raw = (textRef.current?.textContent ?? '').replace(/\u00a0/g, ' ');
    const trimmed = raw.trim().slice(0, maxLength);
    if (!trimmed) {
      if (textRef.current) textRef.current.textContent = value;
      setEditing(false);
      return;
    }
    if (trimmed !== value) onCommit(trimmed);
    setEditing(false);
  };

  const label = (
    <Tag
      ref={textRef as Ref<HTMLHeadingElement & HTMLSpanElement>}
      className={[styles.Text, editing ? styles.TextEditing : ''].filter(Boolean).join(' ')}
      contentEditable={editing}
      suppressContentEditableWarning
      role={editing ? 'textbox' : undefined}
      aria-label={ariaLabel ?? 'Name'}
      aria-multiline={editing ? false : undefined}
      spellCheck={false}
      onDoubleClick={(event) => {
        if (editing) return;
        event.preventDefault();
        setEditing(true);
      }}
      onBeforeInput={(event) => {
        if (!editing) return;
        const inputEvent = event.nativeEvent as InputEvent;
        if (inputEvent.inputType === 'insertParagraph' || inputEvent.inputType === 'insertLineBreak') {
          event.preventDefault();
          commit();
          return;
        }
        if (inputEvent.inputType.startsWith('insert')) {
          const el = textRef.current;
          if (!el) return;
          const selection = window.getSelection();
          const selectedLength = selection?.toString().length ?? 0;
          const nextLength = (el.textContent?.length ?? 0) - selectedLength + (inputEvent.data?.length ?? 0);
          if (nextLength > maxLength) event.preventDefault();
        }
      }}
      onKeyDown={(event) => {
        if (!editing) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cancel();
        }
      }}
      onBlur={() => {
        if (!editing) return;
        if (skipBlurCommit.current) {
          skipBlurCommit.current = false;
          return;
        }
        commit();
      }}
      onPaste={(event) => {
        if (!editing) return;
        event.preventDefault();
        const pasted = event.clipboardData.getData('text/plain').replace(/\s+/g, ' ');
        const el = textRef.current;
        if (!el) return;
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        const before = el.textContent?.slice(0, range.startOffset) ?? '';
        const after = el.textContent?.slice(range.endOffset) ?? '';
        const room = Math.max(0, maxLength - before.length - after.length);
        const insert = pasted.slice(0, room);
        el.textContent = `${before}${insert}${after}`;
        const caret = before.length + insert.length;
        const next = document.createRange();
        const node = el.firstChild;
        if (node) {
          next.setStart(node, Math.min(caret, node.textContent?.length ?? 0));
          next.collapse(true);
          selection.removeAllRanges();
          selection.addRange(next);
        }
      }}
    >
      {!editing ? value : null}
    </Tag>
  );

  return (
    <div className={[styles.Root, className].filter(Boolean).join(' ')}>
      <Tooltip content={value} side="top" delay={400} disabled={editing || !truncated}>
        {label}
      </Tooltip>
    </div>
  );
}
