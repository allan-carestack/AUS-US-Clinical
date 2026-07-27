import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../Menu';
import logoCare from '../../assets/global-header/logo-care.svg';
import logoStack from '../../assets/global-header/logo-stack.svg';
import searchIcon from '../../assets/global-header/search.svg';
import patientSwitcherIcon from '../../assets/global-header/patient-switcher.svg';
import addIcon from '../../assets/global-header/add.svg';
import printIcon from '../../assets/global-header/print.svg';
import helpIcon from '../../assets/global-header/help.svg';
import notificationsIcon from '../../assets/global-header/notifications.svg';
import learningIcon from '../../assets/global-header/learning.svg';
import activityIcon from '../../assets/global-header/activity.svg';
import usersIcon from '../../assets/global-header/users.svg';
import messagesIcon from '../../assets/global-header/messages.svg';
import calendarIcon from '../../assets/global-header/calendar.svg';
import locationIcon from '../../assets/global-header/location.svg';
import menuIcon from '../../assets/global-header/menu.svg';
import styles from './index.module.css';

const quickActions = ['Patient', 'Alert', 'Form', 'Presc.', 'Memo', 'Recall', 'Message', 'Print'] as const;
const utilityActions = [
  { id: 'help', label: 'Help', icon: helpIcon },
  { id: 'notifications', label: 'Notifications', icon: notificationsIcon },
  { id: 'learning', label: 'Learning centre', icon: learningIcon },
  { id: 'activity', label: 'Recent activity', icon: activityIcon },
  { id: 'users', label: 'Users', icon: usersIcon },
  { id: 'messages', label: 'Messages', icon: messagesIcon },
  { id: 'calendar', label: 'Calendar', icon: calendarIcon },
] as const;

export type GlobalHeaderQuickAction = typeof quickActions[number];
export type GlobalHeaderUtilityAction = typeof utilityActions[number]['id'] | 'patient-switcher' | 'support' | 'location' | 'menu';

export interface GlobalHeaderProps {
  className?: string;
  searchValue?: string;
  locationLabel?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  onQuickAction?: (action: GlobalHeaderQuickAction) => void;
  onUtilityAction?: (action: GlobalHeaderUtilityAction) => void;
}

export function GlobalHeader({
  className,
  searchValue,
  locationLabel = 'STAMFORD',
  onSearchChange,
  onSearchSubmit,
  onQuickAction,
  onUtilityAction,
}: GlobalHeaderProps) {
  const [internalSearchValue, setInternalSearchValue] = useState('');
  const [visibleQuickActionCount, setVisibleQuickActionCount] = useState<number>(quickActions.length);
  const quickActionsRef = useRef<HTMLElement>(null);
  const quickActionButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const moreActionMeasureRef = useRef<HTMLButtonElement>(null);
  const quickActionWidthsRef = useRef<number[]>([]);
  const currentSearchValue = searchValue ?? internalSearchValue;

  useLayoutEffect(() => {
    const quickActionsElement = quickActionsRef.current;
    if (!quickActionsElement) return;

    const updateVisibleActions = () => {
      const measuredWidths = quickActionButtonRefs.current.map(button => button?.offsetWidth ?? 0);
      if (measuredWidths.every(width => width > 0)) {
        quickActionWidthsRef.current = measuredWidths;
      }

      const actionWidths = quickActionWidthsRef.current;
      if (actionWidths.length !== quickActions.length) return;

      const totalWidth = actionWidths.reduce((sum, width) => sum + width, 0);
      if (totalWidth <= quickActionsElement.clientWidth) {
        setVisibleQuickActionCount(quickActions.length);
        return;
      }

      const moreButtonWidth = moreActionMeasureRef.current?.offsetWidth ?? 0;
      if (moreButtonWidth === 0) return;
      const availableWidth = Math.max(0, quickActionsElement.clientWidth - moreButtonWidth);
      let usedWidth = 0;
      let visibleCount = 0;

      for (const actionWidth of actionWidths) {
        if (usedWidth + actionWidth > availableWidth) break;
        usedWidth += actionWidth;
        visibleCount += 1;
      }

      setVisibleQuickActionCount(visibleCount);
    };

    updateVisibleActions();
    const resizeObserver = new ResizeObserver(updateVisibleActions);
    resizeObserver.observe(quickActionsElement);
    return () => resizeObserver.disconnect();
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit?.(currentSearchValue);
  };

  return (
    <header
      className={[styles.GlobalHeader, className].filter(Boolean).join(' ')}
      aria-label="Global navigation"
    >
      <div className={styles.Left}>
        <a className={styles.Logo} href="/" aria-label="CareStack home">
          <img src={logoCare} alt="" aria-hidden="true" />
          <img src={logoStack} alt="" aria-hidden="true" />
        </a>

        <form className={styles.Search} role="search" onSubmit={handleSearchSubmit}>
          <img src={searchIcon} alt="" aria-hidden="true" />
          <input
            type="search"
            value={currentSearchValue}
            placeholder="Search Patient(s)"
            aria-label="Search patients"
            onChange={(event) => {
              const value = event.target.value;
              if (searchValue === undefined) setInternalSearchValue(value);
              onSearchChange?.(value);
            }}
          />
        </form>

        <button
          type="button"
          className={styles.PatientSwitcher}
          aria-label="Switch patient"
          onClick={() => onUtilityAction?.('patient-switcher')}
        >
          <img src={patientSwitcherIcon} alt="" aria-hidden="true" />
        </button>

        <nav ref={quickActionsRef} className={styles.QuickActions} aria-label="Patient quick actions">
          <button
            ref={moreActionMeasureRef}
            type="button"
            className={`${styles.MoreAction} ${styles.MoreActionMeasure}`}
            tabIndex={-1}
            aria-hidden="true"
          >
            More
          </button>
          {quickActions.map((action, index) => (
            <button
              key={action}
              ref={(button) => { quickActionButtonRefs.current[index] = button; }}
              type="button"
              className={action === 'Print' ? styles.PrintAction : undefined}
              hidden={index >= visibleQuickActionCount}
              onClick={() => onQuickAction?.(action)}
            >
              <img src={action === 'Print' ? printIcon : addIcon} alt="" aria-hidden="true" />
              <span>{action}</span>
            </button>
          ))}
          {visibleQuickActionCount < quickActions.length && (
            <Menu>
              <MenuTrigger>
                <button type="button" className={styles.MoreAction}>More</button>
              </MenuTrigger>
              <MenuContent side="bottom" align="end">
                {quickActions.slice(visibleQuickActionCount).map(action => (
                  <MenuItem
                    key={action}
                    icon={<img src={action === 'Print' ? printIcon : addIcon} alt="" aria-hidden="true" />}
                    onClick={() => onQuickAction?.(action)}
                  >
                    {action}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
          )}
        </nav>
      </div>

      <nav className={styles.UtilityActions} aria-label="Account and application actions">
        {utilityActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={styles.UtilityIconButton}
            aria-label={action.label}
            onClick={() => onUtilityAction?.(action.id)}
          >
            <img src={action.icon} alt="" aria-hidden="true" />
          </button>
        ))}

        <button
          type="button"
          className={styles.TextUtilityButton}
          onClick={() => onUtilityAction?.('support')}
        >
          Support
        </button>
        <button
          type="button"
          className={styles.LocationButton}
          onClick={() => onUtilityAction?.('location')}
        >
          <img src={locationIcon} alt="" aria-hidden="true" />
          <span>{locationLabel}</span>
        </button>
        <button
          type="button"
          className={styles.UtilityIconButton}
          aria-label="Open application menu"
          onClick={() => onUtilityAction?.('menu')}
        >
          <img src={menuIcon} alt="" aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}

export default GlobalHeader;
