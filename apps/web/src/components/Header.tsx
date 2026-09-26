import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MobileNav } from './MobileNav';

const navLinks = [
  { to: '/sports', label: 'Sports' },
  { to: '/live', label: 'Live', isLive: true },
  { to: '/promotions', label: 'Promotions' },
  { to: '/results', label: 'Results' },
];

export function Header() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <>
      <header className="header" id="main-header">
        <div className="header-inner">
          <Link to="/" className="header-logo" id="logo-link"><div className="header-logo-icon">SB</div><span>Sportsbook</span></Link>
          <nav className="header-nav" id="main-nav">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className={`header-nav-link${location.pathname === l.to ? ' active' : ''}`} id={`nav-${l.label.toLowerCase()}`}>
                {l.label}{l.isLive && <span className="live-dot" />}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link to="/login" className="btn btn-ghost btn-sm" id="login-btn">Log In</Link>
            <Link to="/register" className="btn btn-primary btn-sm" id="register-btn">Sign Up</Link>
            <button className="mobile-nav-toggle" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation menu" id="mobile-menu-toggle">
              <span><span className="hamburger-line" /><span className="hamburger-line" /><span className="hamburger-line" /></span>
            </button>
          </div>
        </div>
      </header>
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
