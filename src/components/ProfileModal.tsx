import React, { useState } from 'react';
import { X, UserCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { UserRole } from '../types';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateProfile, demoLogin, logout } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'inspector');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, title, department, role });
      showToast('Profile settings saved.');
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchDemo = async (email: string, label: string) => {
    try {
      await demoLogin(email);
      showToast(`Switched active session to ${label}`);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to switch account', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Account &amp; Session Settings</h3>
            <p className="text-xs text-slate-500">Signed in as {user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
              >
                <option value="admin">Zoning Administrator</option>
                <option value="inspector">Building / Code Inspector</option>
                <option value="applicant">Resident / Contractor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department / Organization
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={async () => {
                await logout();
                onClose();
                showToast('Signed out of IndeeCheck.', 'info');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out to Login Screen
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-civic-700 hover:bg-civic-800 text-white shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </form>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-civic-600" />
            Quick-Switch Seeded Demo Role
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSwitchDemo('zoning@independenceia.gov', 'Matt Chesmore')}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white hover:border-civic-500 text-slate-700 font-medium truncate"
            >
              Zoning Admin
            </button>
            <button
              type="button"
              onClick={() => handleSwitchDemo('inspector@independenceia.gov', 'Dana Weber')}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white hover:border-civic-500 text-slate-700 font-medium truncate"
            >
              Code Inspector
            </button>
            <button
              type="button"
              onClick={() => handleSwitchDemo('hannah.miller@example.com', 'Hannah Miller')}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white hover:border-civic-500 text-slate-700 font-medium truncate"
            >
              Ward 2 Applicant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
