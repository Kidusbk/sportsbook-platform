import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

interface MobileNavProps { isOpen: boolean; onClose: () => void; }

const mobileLinks = [
  { to: '/', label: 'Home', icon: '🏠' }, { to: '/sports', label: 'Sports', icon: '⚽' },
  { to: '/live', label: 'Live', icon: '🔴' }, { to: '/promotions', label: 'Promotions', icon: '🎁' },
  { to: '/results', label: 'Results', icon: '📊' },
];
const accountLinks = [
  { to: '/account', label: 'My Account', icon: '👤' }, { to: '/bets', label: 'My Bets', icon: '🎟️' },
  { to: '/wallet', label: 'Wallet', icon: '💳' },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation();
  useEffect(() => { onClose(); }, [location.pathname]);
  useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="mobile-nav-overlay open" onClick={onClose} id="mobile-nav-overlay">
      <div className="mobile-nav-panel" onClick={(e) => e.stopPropagation()} id="mobile-nav-panel">
        <div className="mobile-nav-header">
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>Menu</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close navigation" id="mobile-nav-close">✕</button>
        </div>
        {mobileLinks.map((l) => (<Link key={l.to} to={l.to} className={`mobile-nav-link${location.pathname === l.to ? ' active' : ''}`}><span>{l.icon}</span>{l.label}</Link>))}
        <div className="mobile-nav-separator" />
        {accountLinks.map((l) => (<Link key={l.to} to={l.to} className={`mobile-nav-link${location.pathname === l.to ? ' active' : ''}`}><span>{l.icon}</span>{l.label}</Link>))}
        <div className="mobile-nav-separator" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: '0 var(--space-4)' }}>
          <Link to="/login" className="btn btn-secondary" id="mobile-login-btn">Log In</Link>
          <Link to="/register" className="btn btn-primary" id="mobile-register-btn">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
