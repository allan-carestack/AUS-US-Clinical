import {
  AppointmentIcon,
  BillingIcon,
  CautionIcon,
  DashboardIcon,
  DocumentIcon,
  GearIcon,
  InsuranceIcon,
  ListsIcon,
  MemoIcon,
  MenuIcon,
  PatientAlertIcon,
  ProfileIcon,
} from '../Icon';
import { NavBar, type NavItem } from '../NavBar';
import styles from './index.module.css';

const NAV_ITEMS: NavItem[] = [
  { id: 'menu', label: 'Menu', icon: <MenuIcon /> },
  { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
  { id: 'medical-alert', label: 'Med. Alert', icon: <CautionIcon /> },
  { id: 'clinical', label: 'Clinical', icon: <span className={styles.ClinicalIcon}>TX</span>, active: true },
  { id: 'cases', label: 'Cases', icon: <ListsIcon /> },
  { id: 'billing', label: 'Billing', icon: <BillingIcon /> },
  { id: 'appointments', label: 'Appts.', icon: <AppointmentIcon /> },
  { id: 'patient-alert', label: 'Pat. Alert', icon: <PatientAlertIcon /> },
  { id: 'memo', label: 'Memo', icon: <MemoIcon /> },
  { id: 'documents', label: 'Docs', icon: <DocumentIcon /> },
  { id: 'medical-history', label: 'Med. Hx.', icon: <InsuranceIcon /> },
  { id: 'sterilisation-log', label: 'Steri. Log', icon: <GearIcon /> },
  { id: 'inbox', label: 'Inbox', icon: <DashboardIcon /> },
];

export function ClinicalSidebar() {
  return <NavBar items={NAV_ITEMS} className={styles.Sidebar} />;
}

export default ClinicalSidebar;
