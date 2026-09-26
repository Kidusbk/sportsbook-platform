import { useState } from 'react';
import { Link } from 'react-router-dom';
export function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!data.success) { setError(data.error?.message ?? 'Login failed'); }
      else { sessionStorage.setItem('accessToken', data.data.tokens.accessToken); sessionStorage.setItem('refreshToken', data.data.tokens.refreshToken); window.location.href = '/account'; }
    } catch { setError('Unable to connect to the server'); } finally { setLoading(false); }
  };
  return (
    <div className="auth-page animate-fade-in" id="login-page"><div className="card auth-card">
      <h1>Welcome Back</h1><p className="subtitle">Sign in to your account</p>
      {error && <div className="card" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>{error}</div>}
      <form className="auth-form" onSubmit={handleSubmit} id="login-form">
        <div className="input-group"><label htmlFor="login-email" className="input-label">Email</label><input type="email" id="login-email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div className="input-group"><label htmlFor="login-password" className="input-label">Password</label><input type="password" id="login-password" className="input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></div>
        <button type="submit" className="btn btn-primary" disabled={loading} id="login-submit">{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <div className="auth-footer">Don&apos;t have an account? <Link to="/register">Sign up</Link></div>
    </div></div>
  );
}
