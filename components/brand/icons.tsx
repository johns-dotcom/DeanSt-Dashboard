type IconProps = { className?: string };

const base = "stroke-current";

export const GridIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="18" height="18" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="11" y="3" width="6" height="6" rx="1" />
    <rect x="3" y="11" width="6" height="6" rx="1" />
    <rect x="11" y="11" width="6" height="6" rx="1" />
  </svg>
);

export const DocIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="18" height="18" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <path d="M5 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V3a.5.5 0 0 1 .5-.5Z" />
    <path d="M11 2.5V6.5h4" />
    <path d="M7.5 10h5M7.5 13h5" />
  </svg>
);

export const BriefcaseIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="18" height="18" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <rect x="2.5" y="6" width="15" height="11" rx="1.2" />
    <path d="M7 6V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6" />
    <path d="M2.5 10.5h15" />
  </svg>
);

export const UsersIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="18" height="18" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <circle cx="8" cy="7.5" r="2.6" />
    <path d="M3 16.5c.6-2.6 2.7-4 5-4s4.4 1.4 5 4" />
    <path d="M13 4.5a2.5 2.5 0 0 1 0 5" />
    <path d="M14.6 12.7c1.6.5 2.8 1.7 3.4 3.8" />
  </svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="18" height="18" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <path d="m6.5 10.2 2.4 2.4 4.6-5" />
  </svg>
);

export const FolderIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="18" height="18" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <path d="M2.5 5.5a1 1 0 0 1 1-1h3.4a1 1 0 0 1 .8.4l1.1 1.4a1 1 0 0 0 .8.4h6.9a1 1 0 0 1 1 1v8.4a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5.5Z" />
  </svg>
);

export const ActivityIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="18" height="18" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <path d="M2.5 10h3.2l1.6-4.5 3.2 9 1.6-4.5h5.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GearIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="18" height="18" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <circle cx="10" cy="10" r="2.6" />
    <path d="M10 1.8v2M10 16.2v2M3.8 3.8l1.4 1.4M14.8 14.8l1.4 1.4M1.8 10h2M16.2 10h2M3.8 16.2l1.4-1.4M14.8 5.2l1.4-1.4" />
  </svg>
);

export const LogoIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="18" height="18" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <rect x="3" y="6" width="14" height="8" rx="1.5" />
    <rect x="5" y="8" width="10" height="4" rx="0.5" />
  </svg>
);

export const MoonIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="16" height="16" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <path d="M16 11.5A6 6 0 0 1 8.5 4a6 6 0 1 0 7.5 7.5Z" />
  </svg>
);

export const SunIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="16" height="16" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <circle cx="10" cy="10" r="3" />
    <path d="M10 1.8v2M10 16.2v2M3.8 3.8l1.4 1.4M14.8 14.8l1.4 1.4M1.8 10h2M16.2 10h2M3.8 16.2l1.4-1.4M14.8 5.2l1.4-1.4" />
  </svg>
);

export const ArrowIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="14" height="14" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
);

export const SendIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="16" height="16" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <path d="m3 10 14-6-5 14-2.5-5.5L3 10Z" />
  </svg>
);

export const TrashIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="16" height="16" viewBox="0 0 20 20" fill="none" strokeWidth="1.5">
    <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 5.5l.7 10a1 1 0 0 0 1 .9h6.6a1 1 0 0 0 1-.9L15 5.5" />
  </svg>
);

export const InboxEmptyIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.3">
    <path d="M5 4h11l3 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="M16 4v4h3M8 13h6M8 16h4" />
  </svg>
);

export const CheckEmptyIcon = ({ className }: IconProps) => (
  <svg className={`${base} ${className ?? ""}`} width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.3">
    <rect x="4" y="4" width="16" height="16" rx="2.4" />
    <path d="m8 12 3 3 5.5-6" />
  </svg>
);
