import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  Clock,
} from 'lucide-react';

export const OrganizationAuthPage = () => {
  // Tabs: 'login' | 'request-access'
  const [activeTab, setActiveTab] = useState('login');

  // Login inputs (NO prefill / NO Quick Fill)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Request Access inputs (NO prefill)
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('authorized_contractor');
  const [adminName, setAdminName] = useState('');
  const [officialWorkEmail, setOfficialWorkEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [verificationDetails, setVerificationDetails] = useState('');
  const [reasonForRequest, setReasonForRequest] = useState('');

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [regSuccess, setRegSuccess] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const clearMessages = () => {
    setError('');
    setRegSuccess(null);
  };

  // 1. Organization Admin Sign In
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setError('Official work email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.orgLogin(email.trim(), password);
      login(res.token, res.user);
      navigate('/organization/overview');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify administrative credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Request Organization Access
  const handleRequestAccess = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!orgName.trim()) {
      setError('Organization name is required.');
      return;
    }
    if (!adminName.trim()) {
      setError('Authorized contact name is required.');
      return;
    }
    if (!officialWorkEmail.trim() || !officialWorkEmail.includes('@')) {
      setError('A valid official work email address is required.');
      return;
    }
    if (!contactPhone.trim()) {
      setError('Contact phone number is required.');
      return;
    }
    if (!reasonForRequest.trim()) {
      setError('Please provide a reason for requesting municipal access.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.orgRegister({
        organizationName: orgName.trim(),
        organizationType: orgType,
        officialWorkEmail: officialWorkEmail.trim(),
        adminName: adminName.trim(),
        contactPhone: contactPhone.trim(),
        verificationDetails: verificationDetails.trim() || null,
        reasonForRequest: reasonForRequest.trim(),
      });

      setRegSuccess(res);
      // Reset form
      setOrgName('');
      setAdminName('');
      setOfficialWorkEmail('');
      setContactPhone('');
      setVerificationDetails('');
      setReasonForRequest('');
    } catch (err) {
      setError(err.message || 'Access request submission failed. An organization with this email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Return home link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to EcoNexus Home</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-500 p-0.5 shadow-xl shadow-teal-900/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Building2 className="w-8 h-8 text-teal-400" />
            </div>
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-white">
          Organization Administration
        </h1>
        <p className="mt-1 text-center text-xs text-slate-400">
          Nashik Municipal Corporation & Authorized Waste Authorities
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4 sm:px-0">
        <div className="bg-slate-800/85 backdrop-blur-xl border border-slate-700/60 shadow-2xl rounded-2xl p-6 sm:p-8">
          {/* Navigation tabs */}
          <div className="flex rounded-xl bg-slate-900/70 p-1 mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setActiveTab('login');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setActiveTab('request-access');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'request-access'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Request Access
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {regSuccess && (
            <div className="mb-6 p-4 bg-teal-950/60 border border-teal-500/40 rounded-xl text-xs text-teal-200">
              <div className="flex items-center gap-2 font-bold text-teal-300 text-sm mb-1">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Application Submitted Successfully</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {regSuccess.message}
              </p>
              <div className="mt-3 pt-3 border-t border-teal-900/60 flex items-center gap-2 text-[11px] text-teal-300 font-mono">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Request ID: {regSuccess.requestId || 'Pending Review'} • Status: PENDING</span>
              </div>
            </div>
          )}

          {/* 1. ADMIN SIGN IN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Official Work Email
                </label>
                <div className="mt-1 relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@nashikcorporation.in"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <div className="mt-1 relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
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
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? 'Authenticating...' : 'Sign In as Administrator'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700/60 text-center">
                <p className="text-xs text-slate-400">
                  New municipal department or authorized contractor?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setActiveTab('request-access');
                    }}
                    className="font-semibold text-teal-400 hover:text-teal-300 underline cursor-pointer"
                  >
                    Submit Access Request
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* 2. REQUEST ACCESS */}
          {activeTab === 'request-access' && (
            <div>
              <div className="mb-4 text-left">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-400" />
                  Request Municipal Organization Access
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Access is strictly provisioned for verified municipal departments and authorized waste management contractors. All requests remain pending until reviewed and approved by municipal directors.
                </p>
              </div>

              <form onSubmit={handleRequestAccess} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Organization Name</label>
                  <div className="mt-1 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Nashik Waste Operations Division"
                      className="block w-full pl-10 pr-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300">Authorized Contact Name</label>
                    <div className="mt-1 relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Officer Name"
                        className="block w-full pl-10 pr-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300">Organization Type</label>
                    <select
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="municipal_corporation">Municipal Corporation (NMC)</option>
                      <option value="authorized_contractor">Authorized Collection Contractor</option>
                      <option value="processing_facility">Waste Processing Facility</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300">Official Work Email</label>
                    <div className="mt-1 relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={officialWorkEmail}
                        onChange={(e) => setOfficialWorkEmail(e.target.value)}
                        placeholder="officer@organization.in"
                        className="block w-full pl-10 pr-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300">Contact Phone</label>
                    <div className="mt-1 relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 253 2575631"
                        className="block w-full pl-10 pr-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Registration or Municipal Authorization Details (Optional)
                  </label>
                  <div className="mt-1 relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <FileText className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={verificationDetails}
                      onChange={(e) => setVerificationDetails(e.target.value)}
                      placeholder="e.g. MPCB/Contract Ref No. 2026/A-41"
                      className="block w-full pl-10 pr-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">Reason for Requesting Access</label>
                  <textarea
                    required
                    rows={3}
                    value={reasonForRequest}
                    onChange={(e) => setReasonForRequest(e.target.value)}
                    placeholder="Explain your operational jurisdiction and why your division needs access to EcoNexus..."
                    className="mt-1 block w-full p-3 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? 'Submitting Application...' : 'Submit Access Request for Review'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-700/60 text-center">
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setActiveTab('login');
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Return to Admin Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
