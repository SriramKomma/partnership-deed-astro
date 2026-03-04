'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

type Mode = 'signin' | 'signup';

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (signUpError) throw signUpError;
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
        setPassword('');
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // Store tokens in cookies and redirect
        if (data.session) {
          document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; SameSite=Lax`;
          document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=2592000; SameSite=Lax`;
          window.location.href = '/';
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#f8fafc]">
      {/* Ambient background */}
      <div className="ambient-bg" />

      {/* Decorative blobs */}
      <div
        style={{
          position: 'fixed', top: '-120px', right: '-80px', width: '400px', height: '400px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(1,51,76,0.08), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: '-100px', left: '-60px', width: '350px', height: '350px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(1,51,76,0.06), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div
            style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #01334c 0%, #01557a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(1,51,76,0.25)',
            }}
          >
            <span style={{ fontSize: '26px' }}>⚖</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', marginBottom: '4px' }}>
            Partnership Deed Generator
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            {mode === 'signin' ? 'Sign in to your account to continue' : 'Create a free account to get started'}
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 20px 40px -8px rgba(1,51,76,0.10)',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Tab Toggle */}
          <div
            style={{
              display: 'flex', background: '#f1f5f9', borderRadius: '10px',
              padding: '4px', marginBottom: '28px',
            }}
          >
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: mode === m ? '#01334c' : 'transparent',
                  color: mode === m ? '#ffffff' : '#64748b',
                  boxShadow: mode === m ? '0 2px 8px rgba(1,51,76,0.2)' : 'none',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Error / Success banners */}
          {error && (
            <div
              style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                padding: '10px 14px', marginBottom: '18px', display: 'flex', gap: '8px', alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠️</span>
              <p style={{ fontSize: '12.5px', color: '#dc2626', margin: 0, lineHeight: 1.5 }}>{error}</p>
            </div>
          )}
          {success && (
            <div
              style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
                padding: '10px 14px', marginBottom: '18px', display: 'flex', gap: '8px', alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '14px', flexShrink: 0 }}>✅</span>
              <p style={{ fontSize: '12.5px', color: '#16a34a', margin: 0, lineHeight: 1.5 }}>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name (sign up only) */}
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  required={mode === 'signup'}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', fontSize: '13.5px', color: '#0f172a',
                    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                    background: '#f8fafc',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#01334c')}
                  onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1.5px solid #e2e8f0', fontSize: '13.5px', color: '#0f172a',
                  outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                  background: '#f8fafc',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#01334c')}
                onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                  Password
                </label>
                {mode === 'signin' && (
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!email) { setError('Enter your email first to reset password.'); return; }
                      setLoading(true);
                      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email);
                      setLoading(false);
                      if (resetErr) setError(resetErr.message);
                      else setSuccess('Password reset link sent to your email!');
                    }}
                    style={{ fontSize: '11.5px', color: '#01334c', textDecoration: 'none', fontWeight: 500 }}
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                required
                minLength={mode === 'signup' ? 6 : undefined}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1.5px solid #e2e8f0', fontSize: '13.5px', color: '#0f172a',
                  outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                  background: '#f8fafc',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#01334c')}
                onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #01334c 0%, #01557a 100%)',
                color: '#ffffff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px', boxShadow: loading ? 'none' : '0 4px 14px rgba(1,51,76,0.3)',
                transition: 'all 0.2s ease', letterSpacing: '0.3px',
              }}
              onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.transform = 'translateY(0)'; }}
            >
              {loading
                ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (mode === 'signin' ? 'Sign In →' : 'Create Account →')}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Google OAuth */}
          <button
            onClick={async () => {
              setLoading(true);
              const { error: oauthErr } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/` },
              });
              if (oauthErr) { setError(oauthErr.message); setLoading(false); }
            }}
            style={{
              width: '100%', padding: '10px', borderRadius: '10px',
              border: '1.5px solid #e2e8f0', background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontSize: '13.5px', fontWeight: 600, color: '#374151', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget).style.borderColor = '#01334c'; (e.currentTarget).style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { (e.currentTarget).style.borderColor = '#e2e8f0'; (e.currentTarget).style.background = '#ffffff'; }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.34-8.16 2.34-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#94a3b8', marginTop: '20px' }}>
          By continuing, you agree to our{' '}
          <a href="#" style={{ color: '#01334c', textDecoration: 'none', fontWeight: 500 }}>Terms</a>
          {' '}and{' '}
          <a href="#" style={{ color: '#01334c', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
