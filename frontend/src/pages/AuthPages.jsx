import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, Wrench, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Official Google 'G' SVG icon
const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const LoginPage = () => {
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const googleBtnRef = useRef(null);
  const { loginWithGoogle, quickDemoLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '1036332645497-ma44joi3mttqiaj8h8c0c79fujhdrkh8.apps.googleusercontent.com';

  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const initGoogle = () => {
      if (window.google?.accounts?.id && googleClientId && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              setError('');
              setLoading(true);
              try {
                await loginWithGoogle({ credential: response.credential });
                navigate('/');
              } catch (err) {
                setError(err.response?.data?.message || 'Google OAuth verification failed');
              } finally {
                setLoading(false);
              }
            },
          });
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'rectangular',
          });
          setIsGoogleLoaded(true);
        } catch (e) {
          console.warn('Google Identity init:', e);
        }
      }
    };

    initGoogle();
    // Poll briefly if script is loading async
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGoogle();
        clearInterval(timer);
      }
    }, 300);
    return () => clearInterval(timer);
  }, [googleClientId]);

  // Fallback demo Google OAuth login when clicking the direct button if GSI popup is not rendered
  const handleDirectGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const demoEmail = 'operator@weldmonitor.io';
      const user = await loginWithGoogle({
        name: 'Marcus Vance',
        email: demoEmail,
        googleId: 'google_oauth_default_user',
        role: 'OPERATOR',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      });
      setSuccessMessage(`Welcome, ${user.name}!`);
      setTimeout(() => navigate('/'), 400);
    } catch (err) {
      setError(err.response?.data?.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async (role) => {
    setError('');
    setLoading(true);
    try {
      await quickDemoLogin(role);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card-md p-6 sm:p-8">
          {/* Logo & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-3">
              <img
                src="/logo.png"
                alt="WeldMonitor Logo"
                className="h-14 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              WeldMonitor
            </h1>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              {successMessage}
            </div>
          )}

          {/* Single "Sign in with Google" Button */}
          <div className="flex justify-center">
            {/* Native GSI button container (hidden if not loaded yet) */}
            <div
              ref={googleBtnRef}
              id="googleBtnWrapper"
              className={`w-full flex justify-center [&>div]:!w-full ${isGoogleLoaded ? 'block' : 'hidden'}`}
            />

            {/* Fallback button shown only if Google GIS library is not loaded */}
            {!isGoogleLoaded && (
              <button
                onClick={handleDirectGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                <GoogleIcon />
                <span>{loading ? 'Signing in…' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>

          {/* Quick Demo Access - Exactly 4 buttons in 2x2 grid */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-600 text-center mb-3 uppercase tracking-wider">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleDemoAccess('ADMIN')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 hover:text-purple-700 transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin</span>
              </button>
              <button
                onClick={() => handleDemoAccess('OPERATOR')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Operator</span>
              </button>
              <button
                onClick={() => handleDemoAccess('MAINTENANCE_ENGINEER')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 hover:text-amber-700 transition-colors disabled:opacity-50"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span>Maintenance</span>
              </button>
              <button
                onClick={() => handleDemoAccess('PRODUCTION_MANAGER')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 hover:text-emerald-700 transition-colors disabled:opacity-50"
              >
                <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Production</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer text: Your data is safe with us */}
        <p className="text-center text-xs text-slate-500 mt-4 font-medium">
          Your data is safe with us.
        </p>
      </div>
    </div>
  );
};
