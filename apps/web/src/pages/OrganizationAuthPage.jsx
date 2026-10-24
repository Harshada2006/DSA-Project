import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { Building2, Mail, KeyRound, User, ArrowRight, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

export const OrganizationAuthPage = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login state
  const [email, setEmail] = useState('admin@econexus.gov.in');
  const [password, setPassword] = useState('AdminPassword123!');

  // Registration state
  const [regData, setRegData] = useState({
    orgName: 'Nashik Municipal Corporation - East Zone',
    orgCode: 'NMC-EAST',
    adminName: 'Sanjay Deshmukh',
    adminEmail: 'sanjay.d@nashikcorporation.in',
    password: 'AdminPassword123!',
    jurisdiction: 'Panchavati & CIDCO East Wards',
    justification: 'Official municipal waste collection division onboarding for Nashik civic monitoring.',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [regSuccess, setRegSuccess] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.orgLogin(email, password);
      login(res.token, res.user);
      navigate('/organization/overview');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.orgRegister(regData);
      setRegSuccess(res);
    } catch (err) {
      setError(err.message || 'Registration request failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@econexus.gov.in');
    setPassword('AdminPassword123!');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-500 p-0.5 shadow-xl shadow-teal-900/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Building2 className="w-8 h-8 text-teal-400" />
            </div>
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">
          Organization Administration
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Nashik Municipal Corporation & Authorized Waste Authorities
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 shadow-2xl rounded-2xl p-6 sm:p-8">
          {/* Visual Header Image */}
          <div className="h-32 w-full rounded-xl overflow-hidden mb-6 relative shadow-md border border-slate-700/50">
            <img
              src="/assets/command_center.jpg"
              alt="Municipal Command Center Nashik"
              className="w-full h-full object-cover brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent flex items-end p-3.5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-950/70 px-2 py-0.5 rounded border border-teal-500/30">
                  Operations Control
                </span>
                <p className="text-xs text-slate-200 font-medium mt-1">Nashik Smart Waste Command Center</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-900/70 p-1 mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError('');
                setRegSuccess(null);
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError('');
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Request Access
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-sm text-rose-300 font-medium">
              {error}
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200">Admin Email</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@econexus.gov.in"
                    className="block w-full pl-11 pr-3.5 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200">Password</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-11 pr-3.5 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Demo Helper Button */}
              <div className="p-3.5 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between">
                <div className="text-xs text-teal-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-400" /> Pre-Seeded Admin:
                  </span>
                  <span className="font-mono text-xs text-teal-200 mt-0.5 block">admin@econexus.gov.in</span>
                </div>
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="text-xs bg-teal-600/50 hover:bg-teal-600/70 text-teal-100 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Quick Fill
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? 'Signing In...' : 'Sign In as Administrator'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : regSuccess ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">Registration Request Submitted</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Your request has been logged under status: <span className="font-mono font-bold text-amber-300 uppercase">{regSuccess.request?.status || 'PENDING'}</span>.
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Municipal super-administrators review authorization requests to prevent unauthorized access to civic municipal controls.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRegSuccess(null);
                  setActiveTab('login');
                }}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-white transition-all"
              >
                Return to Admin Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300">Organization Name</label>
                <input
                  type="text"
                  required
                  value={regData.orgName}
                  onChange={(e) => setRegData({ ...regData, orgName: e.target.value })}
                  placeholder="e.g. Nashik Municipal Corporation - East Zone"
                  className="mt-1 block w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Org Code</label>
                  <input
                    type="text"
                    required
                    value={regData.orgCode}
                    onChange={(e) => setRegData({ ...regData, orgCode: e.target.value })}
                    placeholder="NMC-EAST"
                    className="mt-1 block w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Admin Name</label>
                  <input
                    type="text"
                    required
                    value={regData.adminName}
                    onChange={(e) => setRegData({ ...regData, adminName: e.target.value })}
                    placeholder="Officer Name"
                    className="mt-1 block w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Official Email</label>
                <input
                  type="email"
                  required
                  value={regData.adminEmail}
                  onChange={(e) => setRegData({ ...regData, adminEmail: e.target.value })}
                  placeholder="admin@nashikcorporation.in"
                  className="mt-1 block w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  placeholder="Strong password"
                  className="mt-1 block w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Jurisdiction & Wards</label>
                <input
                  type="text"
                  required
                  value={regData.jurisdiction}
                  onChange={(e) => setRegData({ ...regData, jurisdiction: e.target.value })}
                  placeholder="Wards covered"
                  className="mt-1 block w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Official Justification</label>
                <textarea
                  rows={2}
                  required
                  value={regData.justification}
                  onChange={(e) => setRegData({ ...regData, justification: e.target.value })}
                  placeholder="State operational role and department"
                  className="mt-1 block w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? 'Submitting Request...' : 'Submit Authorization Request'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-700/60">
            <div className="text-center text-xs text-slate-400 space-y-2">
              <p>
                Are you a Citizen reporting waste?{' '}
                <Link to="/citizen/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline">
                  Citizen Portal
                </Link>
              </p>
              <p>
                Municipal Worker or Driver?{' '}
                <Link to="/worker/login" className="text-amber-400 hover:text-amber-300 font-semibold underline">
                  Worker Field Portal
                </Link>
              </p>
              <p className="pt-2">
                <Link to="/" className="text-slate-500 hover:text-slate-300">
                  ← Back to Home
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
