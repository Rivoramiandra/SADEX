export type Section =
  | 'dashboard'
  | 'cartographie'
  | 'descente'
  | 'fiche'
  | 'avis'
  | 'permis'
  | 'autorisation'
  | 'rapport';

export interface SidebarProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export interface MenuItem {
  id: Section;
  label: string;
  icon: string;
}
