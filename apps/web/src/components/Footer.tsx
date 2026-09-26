import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer" id="main-footer">
      <div className="footer-inner">
        <div className="footer-section"><h4>Platform</h4><Link to="/sports" className="footer-link">Sports</Link><Link to="/live" className="footer-link">Live Betting</Link><Link to="/promotions" className="footer-link">Promotions</Link><Link to="/results" className="footer-link">Results</Link></div>
        <div className="footer-section"><h4>Account</h4><Link to="/register" className="footer-link">Sign Up</Link><Link to="/login" className="footer-link">Log In</Link><Link to="/account" className="footer-link">My Account</Link><Link to="/wallet" className="footer-link">Wallet</Link></div>
        <div className="footer-section"><h4>Support</h4><span className="footer-link">Help Center</span><span className="footer-link">Responsible Gambling</span><span className="footer-link">Terms &amp; Conditions</span><span className="footer-link">Privacy Policy</span></div>
        <div className="footer-section"><h4>About</h4><span className="footer-link">About Us</span><span className="footer-link">Contact</span><span className="footer-link">Careers</span><span className="footer-link">API Documentation</span></div>
      </div>
      <div className="footer-bottom">
        <p>Sportsbook Platform — Foundation Phase. This is a development environment. No real-money transactions are processed.</p>
        <p style={{ marginTop: 'var(--space-2)' }}>© {new Date().getFullYear()} Sportsbook Platform. All rights reserved.</p>
      </div>
    </footer>
  );
}
