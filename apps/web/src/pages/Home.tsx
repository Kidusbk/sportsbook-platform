import { Link } from 'react-router-dom';
export function Home() {
  return (
    <div className="animate-fade-in" id="home-page">
      <section className="hero"><div className="hero-content">
        <h1>The Future of Sports Betting</h1>
        <p>A modern, secure platform built from the ground up. Currently in foundation phase — establishing the architecture for a production-grade experience.</p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-primary btn-lg" id="hero-signup-btn">Get Started</Link>
          <Link to="/sports" className="btn btn-secondary btn-lg" id="hero-sports-btn">Browse Sports</Link>
        </div>
      </div></section>
      <section className="feature-grid">
        <div className="card feature-card"><div className="feature-icon">🔒</div><h3>Secure by Design</h3><p>Built with production-grade security from day one. Encrypted credentials, role-based access, and comprehensive audit logging.</p></div>
        <div className="card feature-card"><div className="feature-icon">📒</div><h3>Immutable Ledger</h3><p>Financial transactions will use a proper double-entry ledger system. No shortcuts — every transaction is auditable.</p></div>
        <div className="card feature-card"><div className="feature-icon">⚡</div><h3>Real-Time Ready</h3><p>Architecture designed for live betting and real-time odds updates. Built to handle high-throughput event processing.</p></div>
        <div className="card feature-card"><div className="feature-icon">🎯</div><h3>Comprehensive Coverage</h3><p>Planned support for multiple sports, competitions, and market types. Pre-match and in-play betting.</p></div>
        <div className="card feature-card"><div className="feature-icon">🛡️</div><h3>Responsible Gambling</h3><p>Player protection controls, self-exclusion, deposit limits, and responsible gambling tools are core requirements.</p></div>
        <div className="card feature-card"><div className="feature-icon">📊</div><h3>Advanced Analytics</h3><p>Real-time reporting, risk management dashboards, and KPI tracking for operators.</p></div>
      </section>
      <section className="container" style={{ paddingBottom: 'var(--space-16)' }}>
        <div className="card-glass" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <span className="badge badge-accent" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}>Foundation Phase</span>
          <h3 style={{ marginBottom: 'var(--space-3)' }}>Building the Right Way</h3>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>This platform is being built incrementally with a focus on architecture, security, and correctness. No fake data or simulated functionality — each feature is implemented properly when it&apos;s ready.</p>
        </div>
      </section>
    </div>
  );
}
