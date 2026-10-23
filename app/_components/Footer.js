export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <nav aria-label="Site links">
          <a href="/guide">How to use</a>
          <a href="/pricing">Pricing</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refunds">Refunds</a>
          <a href="/contact">Contact</a>
        </nav>
        <span>© {new Date().getFullYear()} Masiha Job Agent</span>
      </div>
    </footer>
  );
}
