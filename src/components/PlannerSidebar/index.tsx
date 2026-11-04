import { useEffect, useRef, useState } from 'react';
import Button from '../Button';
import {
  AngleDownIcon, InfoOutlineIcon, MinusIcon, NotesIcon, NotScheduledIcon, PlusIcon, TeethIcon,
} from '../Icon';
import { PROCEDURE_DRAG_TYPE, ungroupedPlanId } from '../TreatmentPlanView/mockData';
import styles from './index.module.css';

export type SidebarPhaseStatus = 'Proposed' | 'Accepted' | 'Completed';
export interface SidebarPlan {
  id: string;
  label: string;
  /** dd/mm/yyyy — plans are grouped under this heading. */
  createdAt: string;
  phases: { id: string; name: string; status: SidebarPhaseStatus }[];
}

export interface PlannerSidebarProps {
  plans: SidebarPlan[];
  activePlanId: string;
  /** Dates listed under Ungrouped Treatments; picking one shows a flat list of its codes. */
  ungroupedDates: string[];
  onSelectUngrouped: (date: string) => void;
  /** Set while the main pane shows a single phase. */
  focusedPhaseId: string | null;
  onSelectPlan: (planId: string) => void;
  onSelectPhase: (planId: string, phaseId: string) => void;
  onAddPlan: () => void;
  onAddPhase: (planId: string) => void;
  /** `index` counts the plan's current phase list (same contract as onMovePhase in the plan view). */
  onMovePhase: (planId: string, phaseId: string, index: number) => void;
  /** Move the plan to just before `beforePlanId` (end of the list when null). */
  onMovePlan: (planId: string, beforePlanId: string | null) => void;
  /** Codes dragged from the plan table were dropped on a phase. */
  onDropProcedures: (planId: string, phaseId: string, procedureIds: string[]) => void;
}

const isCodeDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(PROCEDURE_DRAG_TYPE);

type Drag = { kind: 'phase'; planId: string; id: string } | { kind: 'plan'; id: string };

const after = (e: React.DragEvent) => {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientY > r.top + r.height / 2;
};

export function PlannerSidebar({
  plans, activePlanId, ungroupedDates, onSelectUngrouped, focusedPhaseId, onSelectPlan, onSelectPhase, onAddPlan, onAddPhase, onMovePhase, onMovePlan, onDropProcedures,
}: PlannerSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([activePlanId]));
  const seen = useRef(new Set(plans.map((p) => p.id)));
  const [drag, setDrag] = useState<Drag | null>(null);
  // Line shown while dragging: before/after the row with this id.
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);
  // Phase currently hovered by codes dragged from the table, and the timer that opens a collapsed plan.
  const [codeDropPhase, setCodeDropPhase] = useState<string | null>(null);
  const openTimer = useRef<number | null>(null);
  const clearOpenTimer = () => { if (openTimer.current !== null) window.clearTimeout(openTimer.current); openTimer.current = null; };

  // A plan created after mount opens so its phases are visible.
  useEffect(() => {
    const fresh = plans.filter((p) => !seen.current.has(p.id)).map((p) => p.id);
    if (!fresh.length) return;
    fresh.forEach((id) => seen.current.add(id));
    setExpanded((prev) => new Set([...prev, ...fresh]));
  }, [plans]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const endDrag = () => { setDrag(null); setDrop(null); setCodeDropPhase(null); clearOpenTimer(); };

  const dates = [...new Set(plans.map((p) => p.createdAt))];

  const renderPlan = (plan: SidebarPlan) => {
    const open = expanded.has(plan.id);
    const selected = plan.id === activePlanId;
    // Whole plan shown → all its phases are selected; one phase shown → just that one.
    const focus = selected && plan.phases.some((ph) => ph.id === focusedPhaseId) ? focusedPhaseId : null;
    const dragPlan = drag?.kind === 'plan';
    const dropMark = drop?.id === plan.id && dragPlan ? (drop.after ? 'after' : 'before') : undefined;
    return (
      <div
        key={plan.id}
        className={styles.Plan}
        data-drop={dropMark}
        data-dragging={(drag?.kind === 'plan' && drag.id === plan.id) || undefined}
        onDragOver={(e) => {
          if (drag?.kind !== 'plan' || drag.id === plan.id) return;
          e.preventDefault();
          setDrop({ id: plan.id, after: after(e) });
        }}
        onDrop={(e) => {
          if (drag?.kind !== 'plan' || drag.id === plan.id) return;
          e.preventDefault();
          const i = plans.findIndex((p) => p.id === plan.id);
          const before = after(e) ? plans[i + 1]?.id ?? null : plan.id;
          if (before !== drag.id) onMovePlan(drag.id, before);
          endDrag();
        }}
      >
        <div
          className={styles.PlanRow}
          // Hovering a collapsed plan with codes opens it so a phase can be picked.
          onDragOver={(e) => {
            if (open || !isCodeDrag(e) || openTimer.current !== null) return;
            openTimer.current = window.setTimeout(() => { openTimer.current = null; setExpanded((prev) => new Set(prev).add(plan.id)); }, 450);
          }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) clearOpenTimer(); }}
        >
          <Button
            variant={open ? 'primary' : 'outline'}
            iconOnly
            aria-label={`${open ? 'Minimise' : 'Expand'} ${plan.label}`}
            aria-expanded={open}
            leftIcon={open ? <MinusIcon /> : <PlusIcon />}
            onClick={() => toggle(plan.id)}
          />
          <button
            type="button"
            className={styles.PlanTitle}
            data-selected={selected || undefined}
            draggable
            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDrag({ kind: 'plan', id: plan.id }); }}
            onDragEnd={endDrag}
            onClick={() => onSelectPlan(plan.id)}
          >
            <span className={styles.Ellipsis}>{plan.label}</span>
            {selected && <NotesIcon />}
          </button>
        </div>
        <div className={styles.Meta}>
          <span className={styles.MetaIcons}><NotScheduledIcon /><TeethIcon /></span>
          <span className={styles.MetaActions}>
            <Button variant="ghost">Plan Hx</Button>
            <Button variant="ghost" leftIcon={<PlusIcon />}>Note</Button>
          </span>
        </div>
        {open && (
          <div className={styles.Phases}>
            {plan.phases.map((phase, index) => {
              // Phase ids repeat across plans, so every drag/drop mark is keyed by plan + phase.
              const key = `${plan.id}/${phase.id}`;
              const mark = drop?.id === key && drag?.kind === 'phase' ? (drop.after ? 'after' : 'before') : undefined;
              return (
                <div
                  key={phase.id}
                  className={styles.PhaseRow}
                  data-drop={mark}
                  onDragOver={(e) => {
                    if (!drag && isCodeDrag(e)) { e.preventDefault(); setCodeDropPhase(key); return; }
                    if (drag?.kind !== 'phase' || drag.planId !== plan.id || drag.id === phase.id) return;
                    e.preventDefault();
                    setDrop({ id: key, after: after(e) });
                  }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCodeDropPhase(null); }}
                  onDrop={(e) => {
                    if (!drag && isCodeDrag(e)) {
                      e.preventDefault();
                      try {
                        const { ids } = JSON.parse(e.dataTransfer.getData(PROCEDURE_DRAG_TYPE)) as { ids: string[] };
                        if (ids.length) onDropProcedures(plan.id, phase.id, ids);
                      } catch { /* not our payload */ }
                      endDrag();
                      return;
                    }
                    if (drag?.kind !== 'phase' || drag.planId !== plan.id || drag.id === phase.id) return;
                    e.preventDefault();
                    onMovePhase(plan.id, drag.id, after(e) ? index + 1 : index);
                    endDrag();
                  }}
                >
                  <button
                    type="button"
                    className={styles.PhaseBar}
                    data-status={phase.status}
                    data-selected={(selected && (!focus || phase.id === focus)) || undefined}
                    data-code-drop={codeDropPhase === key || undefined}
                    data-dragging={(drag?.kind === 'phase' && drag.planId === plan.id && drag.id === phase.id) || undefined}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = 'move';
                      setDrag({ kind: 'phase', planId: plan.id, id: phase.id });
                    }}
                    onDragEnd={endDrag}
                    onClick={() => onSelectPhase(plan.id, phase.id)}
                  >
                    <span className={styles.Ellipsis}>{phase.name}</span>
                  </button>
                </div>
              );
            })}
            <div className={[styles.PhaseRow, styles.NewPhaseRow].join(' ')}>
              <Button variant="ghost" leftIcon={<PlusIcon />} onClick={() => onAddPhase(plan.id)}>New Phase</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.Root}>
      <div className={styles.Header}>
        <Button variant="primary" leftIcon={<PlusIcon />} className={styles.NewPlan} onClick={onAddPlan}>New Tx Plan</Button>
        <Button variant="ghost" rightIcon={<AngleDownIcon />}>Hidden Items</Button>
      </div>
      <div className={styles.Content}>
        <section className={styles.Ungrouped}>
          <h3 className={styles.SectionTitle}>Ungrouped Treatments</h3>
          <ul className={styles.UngroupedList}>
            {ungroupedDates.map((d) => (
              <li key={d}>
                <button
                  type="button"
                  className={styles.UngroupedItem}
                  data-selected={ungroupedPlanId(d) === activePlanId || undefined}
                  onClick={() => onSelectUngrouped(d)}
                >
                  {d}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.Grouped}>
          <h3 className={styles.SectionTitle}>Grouped Treatments <InfoOutlineIcon /></h3>
          <div className={styles.Groups}>
            {dates.map((date) => (
              <div key={date} className={styles.Group}>
                <div className={styles.Date}>{date}</div>
                <div className={styles.GroupPlans}>
                  {plans.filter((p) => p.createdAt === date).map(renderPlan)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default PlannerSidebar;
