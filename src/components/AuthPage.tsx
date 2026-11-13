import React, { useState } from 'react';
import {
  Building2,
  Waves,
  Fence,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  Briefcase,
  Sparkles,
  MonitorDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDesktopInstall } from '../context/DesktopInstallContext';
import { IndependenceLogo } from './IndependenceLogo';

export const AuthPage: React.FC = () => {
  const { login, register, demoLogin } = useAuth();
  const { showToast } = useToast();
  const { openInstallModal } = useDesktopInstall();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('zoning@independenceia.gov');
  const [password, setPassword] = useState('Indee2026!');
  const [name, setName] = useState('');
  const [role, setRole] = useState('inspector');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        showToast('Signed in to IndeeCheck Municipal Portal.');
      } else {
        await register({ name, email, password, role, title });
        showToast('Account created. Welcome to IndeeCheck!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, label: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await demoLogin(demoEmail);
      showToast(`Signed in as ${label}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      {/* Left Civic Branding Panel */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-gradient-to-br from-slate-950 via-civic-950 to-slate-900 text-white border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          <div className="inline-flex flex-col items-start gap-2.5">
            <IndependenceLogo variant="card-on-dark" size="lg" />
            <div className="text-xs text-slate-300 font-medium pl-1">
              IndeeCheck Municipal Compliance Portal &middot; Buchanan County, IA (50644)
            </div>
          </div>

          <h1 className="mt-8 text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-white">
            Planning, Zoning, Floodplain &amp; Fence Compliance Workbench
          </h1>
          <p className="mt-4 text-slate-300 text-base leading-relaxed max-w-xl">
            Side-by-side municipal plan review and permit checklists calibrated directly to the
            City of Independence Code of Ordinances.
          </p>

          <div className="mt-8 space-y-4 max-w-xl">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <Building2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-white">
                  Planning &amp; Zoning Ordinance (IMC Ch. 170 / Art. 1–5)
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Automated Table 1 bulk setbacks across A-1, R-1–R-4, R/C-1 hybrid rules, C-1/C-2,
                  M-1/M-2 (15&apos; residential buffer), and 18&apos; accessory building rules.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <Waves className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-white">
                  Flood Plain Ordinance (IMC Ch. 167 &amp; Zoning Art. 4)
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Wapsipinicon River SFHA (Zones A, AE, Floodway), BFE + 1.0&apos; freeboard,
                  § 4.02.14(c) +3.0&apos; HVAC rule, 50% substantial improvement, &amp; 92 FEMA buyout lots.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <Fence className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-white">
                  Fences, Walls &amp; Hedges (IMC Ch. 152 &amp; §§ 1.04.44–45)
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  4&apos;0&quot; front / 6&apos;6&quot; side-rear height caps, 20&apos;&times;20&apos; corner sight triangle (&le;3&apos;0&quot;),
                  3&apos;0&quot; lot-line setback or signed Neighbor Fence Agreement, &amp; material checks.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div>City Hall Reference: 331 1st Street East, Independence, IA 50644</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Building &amp; Code Dept: (319) 334-4711</div>
          </div>
          <button
            type="button"
            onClick={openInstallModal}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition-colors"
          >
            <MonitorDown className="w-4 h-4 text-sky-400" />
            Install Desktop App
          </button>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="lg:w-1/2 bg-slate-50 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Instant Demo Role Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-civic-700 mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              Instant Demo Sign-In (Seeded Workspace)
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  handleQuickDemo('zoning@independenceia.gov', 'Matt Chesmore (Zoning Admin)')
                }
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-civic-500 hover:bg-civic-50/50 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Matt Chesmore &middot; Zoning Administrator
                  </div>
                  <div className="text-[11px] text-slate-500">zoning@independenceia.gov</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-civic-600 transition-colors" />
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  handleQuickDemo('inspector@independenceia.gov', 'Dana Weber (Building Official)')
                }
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-civic-500 hover:bg-civic-50/50 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Dana Weber &middot; Building &amp; Code Inspector
                  </div>
                  <div className="text-[11px] text-slate-500">inspector@independenceia.gov</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-civic-600 transition-colors" />
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  handleQuickDemo('hannah.miller@example.com', 'Hannah Miller (Resident Applicant)')
                }
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:border-civic-500 hover:bg-civic-50/50 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Hannah Miller &middot; Ward 2 Permit Applicant
                  </div>
                  <div className="text-[11px] text-slate-500">hannah.miller@example.com</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-civic-600 transition-colors" />
              </button>
            </div>
          </div>

          {/* Standard Sign In / Register Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setEmail('');
                  setPassword('');
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Carter"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 focus:border-civic-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Portal Role
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                      >
                        <option value="admin">Zoning Administrator</option>
                        <option value="inspector">Code Inspector</option>
                        <option value="applicant">Resident / Contractor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Title / Affiliation
                      </label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Staff Planner / Builder"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@independenceia.gov"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 focus:border-civic-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 focus:border-civic-500"
                  />
                </div>
                {mode === 'login' && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Demo password: <code className="font-mono text-slate-700">Indee2026!</code>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg bg-civic-700 hover:bg-civic-800 text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-60"
              >
                {submitting
                  ? 'Authenticating...'
                  : mode === 'login'
                    ? 'Sign In to Workspace'
                    : 'Create Account & Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
