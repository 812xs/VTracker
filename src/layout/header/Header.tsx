import { Icon } from "../../shared/icons/icons";
import { closeApp } from "../../shared/window/close";
import "./header.css";

interface HeaderProps {
  title: string;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function Header({ title, onRefresh, refreshing }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__drag" data-tauri-drag-region>
        {title}
      </div>
      <button
        type="button"
        className="header__refresh"
        aria-label="Yenile"
        title="Bu sayfayı yenile"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <Icon name="refresh" width={16} height={16} />
        <span>Yenile</span>
      </button>
      <button
        type="button"
        className="header__close"
        aria-label="Kapat"
        title="Kapat"
        onClick={() => void closeApp()}
      >
        <Icon name="close" width={18} height={18} />
      </button>
    </header>
  );
}
