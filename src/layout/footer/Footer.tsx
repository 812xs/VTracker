import "./footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <span>© 2026 Vietra Teknoloji, VTracker. Tüm Hakları Saklıdır.</span>
      <span>{__APP_VERSION__}</span>
    </footer>
  );
}
