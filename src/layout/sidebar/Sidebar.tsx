import { Icon } from "../../shared/icons/icons";
import { NAV_BOTTOM, NAV_TOP, type NavId, type NavItem } from "./nav";
import "./sidebar.css";

interface SidebarProps {
  active: NavId;
  onSelect: (id: NavId) => void;
}

export default function Sidebar({ active, onSelect }: SidebarProps) {
  const render = (item: NavItem) => (
    <button
      key={item.id}
      type="button"
      className={item.id === active ? "sidebar__btn sidebar__btn--active" : "sidebar__btn"}
      aria-label={item.label}
      title={item.label}
      aria-current={item.id === active ? "page" : undefined}
      onClick={() => onSelect(item.id)}
    >
      <Icon name={item.icon} width={20} height={20} />
    </button>
  );

  return (
    <nav className="sidebar" aria-label="Bölümler">
      <div className="sidebar__group">{NAV_TOP.map(render)}</div>
      <div className="sidebar__group">{NAV_BOTTOM.map(render)}</div>
    </nav>
  );
}
