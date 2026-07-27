import Button from '../Button';
import { Avatar } from '../Avatar';
import { Tag, type TagColor, type TagVariant } from '../Tag';
import { Tooltip } from '../Tooltip';
import { EditIcon, InsuranceIcon, InfoOutlineIcon, OpenPanelIcon } from '../Icon';
import styles from './index.module.css';

export interface PatientHeaderTag {
  label: string;
  color: TagColor;
  variant?: TagVariant;
}

export interface PatientHeaderCountLink {
  count: number;
  label: string;
  onClick?: () => void;
}

export interface PatientHeaderProps {
  avatarSrc?: string;
  name: string;
  patientId: string;
  dob: string;
  age: string;
  gender: string;
  relationshipTag?: PatientHeaderTag;
  statusTag?: PatientHeaderTag;
  chartFlags?: PatientHeaderTag[];
  linkedAccountMembers?: PatientHeaderCountLink;
  referralSources?: PatientHeaderCountLink;
  insuranceDescription?: string;
  totalBalance: string;
  unappliedCredits: string;
  balanceHidden?: boolean;
  onNameClick?: () => void;
  onEditDemographics?: () => void;
  onEditChartFlags?: () => void;
  onToggleBalanceVisibility?: () => void;
  onClinicalSummaryClick?: () => void;
  className?: string;
}

export function PatientHeader({
  avatarSrc,
  name,
  patientId,
  dob,
  age,
  gender,
  relationshipTag,
  statusTag,
  chartFlags = [],
  linkedAccountMembers,
  referralSources,
  insuranceDescription,
  totalBalance,
  unappliedCredits,
  balanceHidden = false,
  onNameClick,
  onEditDemographics,
  onEditChartFlags,
  onToggleBalanceVisibility,
  onClinicalSummaryClick,
  className,
}: PatientHeaderProps) {
  return (
    <div className={[styles.PatientHeader, className].filter(Boolean).join(' ')}>
      <div className={styles.Section}>
        <Avatar src={avatarSrc} name={name} size="md" className={styles.Avatar} />
        <div className={styles.PatientInfo}>
          <div className={styles.NameRow}>
            {onNameClick ? (
              <button type="button" className={styles.Name} onClick={onNameClick}>
                {name}
              </button>
            ) : (
              <span className={styles.Name}>{name}</span>
            )}
            {relationshipTag && (
              <Tag variant={relationshipTag.variant ?? 'fill'} color={relationshipTag.color}>
                {relationshipTag.label}
              </Tag>
            )}
            {statusTag && (
              <Tag variant={statusTag.variant ?? 'semi'} color={statusTag.color}>
                {statusTag.label}
              </Tag>
            )}
          </div>
          <div className={styles.DemographicsRow}>
            <span className={styles.DimText}>{patientId}</span>
            <span className={styles.Divider} aria-hidden="true" />
            <span className={styles.DimText}>{dob} ({age})</span>
            <span className={styles.Divider} aria-hidden="true" />
            <span className={styles.DimText}>{gender}</span>
            <Button variant="link" leftIcon={<EditIcon />} onClick={onEditDemographics}>
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.Section}>
        <div className={styles.TagsCol}>
          <div className={styles.TagsRow}>
            {chartFlags.map((flag, i) => (
              <Tag key={`${flag.label}-${i}`} variant={flag.variant ?? 'fill'} color={flag.color}>
                {flag.label}
              </Tag>
            ))}
            <Button
              variant="ghost"
              iconOnly
              leftIcon={<EditIcon />}
              aria-label="Edit chart flags"
              onClick={onEditChartFlags}
              className={styles.FlagsEditButton}
            />
          </div>
          <div className={styles.LinksRow}>
            {linkedAccountMembers && (
              <span className={styles.CountLink}>
                <span className={styles.CountBadge}>{linkedAccountMembers.count}</span>
                <Button variant="link" onClick={linkedAccountMembers.onClick}>{linkedAccountMembers.label}</Button>
              </span>
            )}
            {referralSources && (
              <span className={styles.CountLink}>
                <span className={styles.CountBadge}>{referralSources.count}</span>
                <Button variant="link" onClick={referralSources.onClick}>{referralSources.label}</Button>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.Section}>
        <span className={styles.InsuranceIcon}><InsuranceIcon /></span>
        <span className={styles.InsuranceText}>{insuranceDescription}</span>
      </div>

      <div className={[styles.Section, styles.BalanceSection].join(' ')}>
        <div className={styles.BalanceCol}>
          <div className={styles.BalanceRow}>
            <span className={styles.BalanceLabel}>
              Pat. Total Balance
              <Tooltip content="Total outstanding balance across all treatment for this patient." side="bottom" delay={400}>
                <Button variant="ghost" iconOnly leftIcon={<InfoOutlineIcon />} aria-label="About patient total balance" className={styles.InfoButton} />
              </Tooltip>
              :
            </span>
            <span className={styles.BalanceValue} data-tone="positive">{totalBalance}</span>
          </div>
          <div className={styles.BalanceRow}>
            <span className={styles.BalanceLabel}>Pat. Unapplied Credits :</span>
            <span className={styles.BalanceValue} data-tone="negative">{unappliedCredits}</span>
          </div>
        </div>
        <Button variant="link" onClick={onToggleBalanceVisibility}>
          {balanceHidden ? 'Show' : 'Hide'}
        </Button>
      </div>

      <div className={styles.Section}>
        <Button variant="link" leftIcon={<OpenPanelIcon />} onClick={onClinicalSummaryClick}>
          Clinical Summary
        </Button>
      </div>
    </div>
  );
}

export default PatientHeader;
