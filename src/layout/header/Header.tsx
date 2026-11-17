import { Icon } from "../../shared/icons/icons";
import { closeApp } from "../../shared/window/close";
import "./header.css";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__drag" data-tauri-drag-region>
        {title}
      </div>
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
