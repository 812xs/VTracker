import { StatusDot } from "../../shared/ui/StatusDot";
import { overallTone, type Connection } from "../../shared/session/connection";
import "./footer.css";

interface FooterProps {
  connections: Connection[];
}

export default function Footer({ connections }: FooterProps) {
  return (
    <footer className="footer">
      <span>© 2026 Vietra Teknoloji, VTracker. Tüm Hakları Saklıdır.</span>
      <div className="footer__right">
        <span>{__APP_VERSION__}</span>
        <div className="conn">
          <button type="button" className="conn__trigger">
            <StatusDot tone={overallTone(connections)} />
            <span>Bağlantı</span>
          </button>
          <div className="conn__pop">
            <ul className="conn__list" aria-label="Bağlantı durumu">
              {connections.map((c) => (
                <li className="conn__item" key={c.key}>
                  <StatusDot tone={c.tone} />
                  <span className="conn__label">{c.label}</span>
                  <span className="conn__text">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
