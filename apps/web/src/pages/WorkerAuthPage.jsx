import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { api } from '../api/client.js';
import { LanguageSelector } from '../components/common/LanguageSelector.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import {
  Truck,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Mail,
  Zap,
} from 'lucide-react';

export const WorkerAuthPage = () => {
  const { t } = useLanguage();
  // Modes: 'login' | 'activate' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');

  // Login inputs
  const [identifier, setIdentifier] = useState(''); // Worker ID or email
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password reset inputs
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const clearMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  /* ============================================================
   * MODULE 1: Worker Authentication & Direct 1-Click Sign In
   * Authenticates field staff via Worker ID or registered municipal email
   * ============================================================ */
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    clearMessages();

    if (!identifier.trim() || !password) {
      setError('Please provide your Worker ID or registered work email, and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.workerLogin(identifier.trim(), password);
      login(res.token, res.user);
      navigate('/worker/dashboard');
    } catch (err) {
      setError(err.message || 'Worker login failed. Please verify your credentials or activate your account.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Worker Forgot Password Request
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!resetEmail || !resetEmail.includes('@')) {
      setError('Please provide your registered work email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestPasswordReset(resetEmail.trim());
      setSuccessMsg(res.message || 'Password reset instructions have been generated.');
      setMode('reset');
    } catch (err) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Worker Confirm Reset
  const handleResetConfirm = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!resetEmail || !resetCode) {
      setError('Email and reset code are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        email: resetEmail.trim(),
        code: resetCode.trim(),
        newPassword,
        confirmPassword: confirmNewPassword,
      });

      setSuccessMsg(res.message || 'Password successfully updated! Please sign in with your new password.');
      setIdentifier(resetEmail);
      setMode('login');
    } catch (err) {
      setError(err.message || 'Password reset failed. Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      {/* Background glow effects */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Return home link and Controls */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('back_to_home', 'Back to EcoNexus Home')}</span>
        </Link>
      </div>

      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <LanguageSelector />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 p-0.5 shadow-xl shadow-amber-900/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Truck className="w-8 h-8 text-amber-400" />
            </div>
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('portal_worker_title', 'Field Worker Portal')}
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('portal_worker_desc', 'View daily collection schedules, suggested optimized routes, scan bin assets, and report field issues.')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 transition-colors">
          {mode === 'login' && (
            <div className="mb-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Worker Sign In</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sign in with your assigned Worker ID or municipal email.
              </p>
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. WORKER SIGN IN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">


              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Worker ID or Work Email
                </label>
                <div className="mt-1 relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. WRK-NSK-101 or 101 or worker1"
                    className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setResetEmail(identifier.includes('@') ? identifier : '');
                      setMode('forgot');
                    }}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="mt-1 relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter worker password"
                    className="block w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? 'Authenticating...' : 'Sign In as Field Worker'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          )}

          {/* ============================================================
           * MODULE 3: Worker Password Recovery & Reset
           * Handles municipal worker password resets via verified email code
           * ============================================================ */}
          {mode === 'forgot' && (
            <div>
              <div className="mb-4 text-left">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Reset Worker Password</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your registered work email to receive a password reset token.
                </p>
              </div>

              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Registered Work Email</label>
                  <div className="mt-1 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="worker@econexus.gov.in"
                      className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? 'Sending Code...' : 'Send Reset Code'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('login');
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Return to Worker Sign In
                </button>
              </div>
            </div>
          )}

          {/* 4. WORKER RESET CONFIRM */}
          {mode === 'reset' && (
            <div>
              <div className="mb-4 text-left">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Enter New Worker Password</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter the reset code sent to <strong className="text-slate-900 dark:text-white font-mono">{resetEmail}</strong> and your new password.
                </p>
              </div>

              <form onSubmit={handleResetConfirm} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Reset Code</label>
                  <div className="mt-1 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.trim())}
                      placeholder="6-digit reset code"
                      className="block w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">New Password (min 8 chars)</label>
                  <div className="mt-1 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="block w-full pl-10 pr-10 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                  <div className="mt-1 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="block w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? 'Updating Password...' : 'Save New Password'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('login');
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel and Return to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
