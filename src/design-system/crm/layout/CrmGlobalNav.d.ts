import * as React from 'react';
/** Navy left global navigation with the seven CRM sections. */
export interface CrmGlobalNavProps {
  items?: { id: string; label: string; icon: string; badge?: number }[];
  active?: string;
  onNavigate?: (id: string) => void;
  productName?: string;
  footer?: React.ReactNode;
}
export declare function CrmGlobalNav(props: CrmGlobalNavProps): React.JSX.Element;
export default CrmGlobalNav;
