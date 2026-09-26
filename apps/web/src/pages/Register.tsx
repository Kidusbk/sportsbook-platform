import { useState } from 'react';
import { Link } from 'react-router-dom';
export function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState(''); const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const updateField = (field: string, value: string) => { setForm((p) => ({ ...p, [field]: value })); setFieldErrors((p) => { const n = { ...p }; delete n[field]; return n; }); };
  const getFieldError = (f: string) => fieldErrors[f]?.[0];
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setFieldErrors({});
    if (form.password !== form.confirmPassword) { setFieldErrors({ confirmPassword: ['Passwords do not match'] }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, username: form.username, password: form.password }) });
      const data = await res.json();
      if (!data.success) { if (data.error?.details) setFieldErrors(data.error.details); setError(data.error?.message ?? 'Registration failed'); }
      else { sessionStorage.setItem('accessToken', data.data.tokens.accessToken); sessionStorage.setItem('refreshToken', data.data.tokens.refreshToken); window.location.href = '/account'; }
    } catch { setError('Unable to connect to the server'); } finally { setLoading(false); }
  };
  return (
    <div className="auth-page animate-fade-in" id="register-page"><div className="card auth-card">
      <h1>Create Account</h1><p className="subtitle">Join the platform</p>
      {error && <div className="card" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>{error}</div>}
      <form className="auth-form" onSubmit={handleSubmit} id="register-form">
        <div className="input-group"><label htmlFor="reg-email" className="input-label">Email</label><input type="email" id="reg-email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => updateField('email', e.target.value)} required autoComplete="email" />{getFieldError('email') && <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{getFieldError('email')}</span>}</div>
        <div className="input-group"><label htmlFor="reg-username" className="input-label">Username</label><input type="text" id="reg-username" className="input" placeholder="Choose a username" value={form.username} onChange={(e) => updateField('username', e.target.value)} required autoComplete="username" minLength={3} maxLength={30} />{getFieldError('username') && <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{getFieldError('username')}</span>}</div>
        <div className="input-group"><label htmlFor="reg-password" className="input-label">Password</label><input type="password" id="reg-password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={(e) => updateField('password', e.target.value)} required autoComplete="new-password" minLength={8} />{getFieldError('password') && <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{getFieldError('password')}</span>}</div>
        <div className="input-group"><label htmlFor="reg-confirm" className="input-label">Confirm Password</label><input type="password" id="reg-confirm" className="input" placeholder="Repeat your password" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} required autoComplete="new-password" />{getFieldError('confirmPassword') && <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{getFieldError('confirmPassword')}</span>}</div>
        <button type="submit" className="btn btn-primary" disabled={loading} id="register-submit">{loading ? 'Creating account…' : 'Create Account'}</button>
      </form>
      <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
    </div></div>
  );
}
