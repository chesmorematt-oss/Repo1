import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  Table,
  X,
} from 'lucide-react';
import type { OrdinanceCategory, OrdinanceRule } from '../types';
import { CATEGORY_META } from '../lib/format';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';

const BULK_MATRIX = [
  {
    district: 'A-1',
    use: 'Agricultural / Single Family',
    minArea: '3 Acres (130,680 sf)',
    width: '200 ft',
    height: '35 ft / 3 st.',
    front: '58 ft',
    side: '35 ft',
    corner: '58 ft',
    rear: '58 ft',
  },
  {
    district: 'R-1',
    use: 'Single Family (Public Water/Sewer)',
    minArea: '10,000 sq ft',
    width: '80 ft',
    height: '35 ft / 3 st.',
    front: '25 ft',
    side: '8 ft',
    corner: '25 ft',
    rear: '30 ft',
  },
  {
    district: 'R-1',
    use: 'Single Family (Unsewered)',
    minArea: '30,000 sq ft',
    width: '80 ft',
    height: '35 ft / 3 st.',
    front: '25 ft',
    side: '8 ft',
    corner: '25 ft',
    rear: '30 ft',
  },
  {
    district: 'R-2',
    use: 'Single Family',
    minArea: '7,000 sq ft',
    width: '66 ft',
    height: '35 ft / 3 st.',
    front: '25 ft',
    side: '5 ft',
    corner: '25 ft',
    rear: '25 ft',
  },
  {
    district: 'R-2',
    use: 'Two-Family (Duplex)',
    minArea: '8,000 sq ft',
    width: '70 ft',
    height: '35 ft / 3 st.',
    front: '25 ft',
    side: '7 ft',
    corner: '25 ft',
    rear: '25 ft',
  },
  {
    district: 'R-3',
    use: 'Single / Two-Family',
    minArea: '6,000 / 7,200 sf',
    width: '60 ft',
    height: '35 ft / 3 st.',
    front: '20 ft',
    side: '5 ft',
    corner: '25 ft',
    rear: '30 ft',
  },
  {
    district: 'R-3',
    use: 'Multi-Family (3-Plex+)',
    minArea: '8,000 sq ft',
    width: '65 ft',
    height: '35 ft / 3 st.',
    front: '20 ft',
    side: '10 ft',
    corner: '25 ft',
    rear: '35 ft',
  },
  {
    district: 'R/C-1',
    use: 'Mixed Res / Commercial',
    minArea: 'R-2 or C-2 Rule',
    width: 'R-2 if Res/Adj R',
    height: '35 ft / 3 st.',
    front: '25 ft',
    side: 'R-2 / C-2',
    corner: '25 ft',
    rear: 'R-2 / C-2',
  },
  {
    district: 'C-1',
    use: 'Central Commercial (Downtown)',
    minArea: 'None',
    width: 'None',
    height: '35 ft / 3 st.',
    front: '0 ft',
    side: '0 ft (15\' adj R)',
    corner: '0 ft',
    rear: '0 ft (15\' adj R)',
  },
  {
    district: 'C-2',
    use: 'General Commercial',
    minArea: 'None',
    width: 'None',
    height: '35 ft / 3 st.',
    front: '25 ft',
    side: '0 ft (15\' adj R)',
    corner: '25 ft',
    rear: '0 ft (15\' adj R)',
  },
  {
    district: 'M-1 / M-2',
    use: 'Light & Heavy Industrial',
    minArea: 'None',
    width: 'None',
    height: 'Airport Overlay',
    front: '25 ft',
    side: '10 ft (15\' adj R)',
    corner: '25 ft',
    rear: '0 ft (15\' adj R)',
  },
  {
    district: 'Accessory',
    use: 'R-1, R-2, R-3 Garages/Sheds (Notes 4–6)',
    minArea: '<=30% Rear Yard',
    width: '—',
    height: '18 ft / 1 story',
    front: 'Same as Principal',
    side: '4 ft (in S/R yd)',
    corner: '25 ft',
    rear: '4 ft',
  },
];

export const OrdinancesView: React.FC = () => {
  const { showToast } = useToast();
  const [rules, setRules] = useState<OrdinanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'all' | OrdinanceCategory>('all');
  const [search, setSearch] = useState('');
  const [showBulkTable, setShowBulkTable] = useState(true);

  // Modal state for Create / Edit Ordinance Rule
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<OrdinanceRule | null>(null);
  const [formCat, setFormCat] = useState<OrdinanceCategory>('zoning');
  const [formSection, setFormSection] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formApplies, setFormApplies] = useState('All Districts');
  const [formSummary, setFormSummary] = useState('');
  const [formMetric, setFormMetric] = useState('');
  const [formText, setFormText] = useState('');
  const [formRemedy, setFormRemedy] = useState('');

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (search.trim()) params.set('search', search.trim());
      const res = await apiFetch<{ rules: OrdinanceRule[] }>(
        `/api/ordinances?${params.toString()}`
      );
      setRules(res.rules);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load ordinances.', 'error');
    } finally {
      setLoading(false);
    }
  }, [category, search, showToast]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const openAddModal = () => {
    setEditingRule(null);
    setFormCat(category === 'all' ? 'zoning' : category);
    setFormSection('');
    setFormTitle('');
    setFormApplies('All Districts');
    setFormSummary('');
    setFormMetric('');
    setFormText('');
    setFormRemedy('');
    setModalOpen(true);
  };

  const openEditModal = (r: OrdinanceRule) => {
    setEditingRule(r);
    setFormCat(r.category);
    setFormSection(r.code_section);
    setFormTitle(r.title);
    setFormApplies(r.applies_to);
    setFormSummary(r.requirement_summary);
    setFormMetric(r.threshold_metric);
    setFormText(r.ordinance_text);
    setFormRemedy(r.remedy_guidance);
    setModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      category: formCat,
      code_section: formSection,
      title: formTitle,
      applies_to: formApplies,
      requirement_summary: formSummary,
      threshold_metric: formMetric,
      ordinance_text: formText,
      remedy_guidance: formRemedy,
    };

    try {
      if (editingRule) {
        const res = await apiFetch<{ rule: OrdinanceRule }>(`/api/ordinances/${editingRule.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setRules((curr) => curr.map((item) => (item.id === editingRule.id ? res.rule : item)));
        showToast('Ordinance reference rule updated.');
      } else {
        const res = await apiFetch<{ rule: OrdinanceRule }>('/api/ordinances', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setRules((curr) => [res.rule, ...curr]);
        showToast('New ordinance reference rule added.');
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save rule.', 'error');
    }
  };

  const handleDeleteRule = async (rule: OrdinanceRule) => {
    const prev = [...rules];
    setRules((curr) => curr.filter((r) => r.id !== rule.id));
    try {
      await apiFetch(`/api/ordinances/${rule.id}`, { method: 'DELETE' });
      showToast('Ordinance rule deleted.');
    } catch (err) {
      setRules(prev);
      showToast(err instanceof Error ? err.message : 'Failed to delete rule.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Independence, IA Ordinance Rulebook &amp; Bulk Table
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Reference standards &amp; local amendments for Zoning (Ch. 170 / Nov 2025 Rev.),
            Floodplain (IMC Ch. 167 / Art. 4), and Fences (IMC Ch. 152).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowBulkTable((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
          >
            <Table className="w-4 h-4 text-civic-600" />
            {showBulkTable ? 'Hide Table 1 Matrix' : 'Show Table 1 Matrix'}
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Ordinance Rule
          </button>
        </div>
      </div>

      {/* Collapsible Independence Zoning Ordinance Article 5 Table 1 Matrix */}
      {showBulkTable && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Article 5, Section 5.00 — Table 1: Independence Bulk Requirements
              </h2>
              <p className="text-xs text-slate-500">
                Official dimensional minimums by Zoning District &amp; Use (City of Independence Zoning Ordinance)
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">District</th>
                  <th className="py-2.5 px-4">Permitted Use</th>
                  <th className="py-2.5 px-4">Min Lot Area</th>
                  <th className="py-2.5 px-4">Min Width</th>
                  <th className="py-2.5 px-4">Max Height</th>
                  <th className="py-2.5 px-4">Front</th>
                  <th className="py-2.5 px-4">Side</th>
                  <th className="py-2.5 px-4">Corner St.</th>
                  <th className="py-2.5 px-4">Rear</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {BULK_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-bold text-civic-800 whitespace-nowrap">
                      {row.district}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{row.use}</td>
                    <td className="py-2.5 px-4 text-slate-700">{row.minArea}</td>
                    <td className="py-2.5 px-4 text-slate-700">{row.width}</td>
                    <td className="py-2.5 px-4 text-slate-700">{row.height}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{row.front}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{row.side}</td>
                    <td className="py-2.5 px-4 text-slate-700">{row.corner}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{row.rear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All 3 Ordinances' },
              { id: 'zoning', label: 'Zoning (Ch. 170 / Art. 1–5)' },
              { id: 'floodplain', label: 'Floodplain (Ch. 167 / Art. 4)' },
              { id: 'fence', label: 'Fences (IMC Ch. 152)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                category === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search section (§ 152.02, BFE, barbed wire)..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500"
          />
        </div>
      </div>

      {/* Ordinance Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No Matching Ordinance Sections</h3>
          <p className="text-xs text-slate-500 mt-1">
            Clear your search or add a new municipal code reference rule.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((r) => {
            const cat = CATEGORY_META[r.category] || CATEGORY_META.zoning;
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border ${cat.pillClass}`}
                      >
                        {cat.shortLabel}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {r.code_section}
                      </span>
                      {r.is_custom && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Local Amendment
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-civic-700 hover:bg-slate-100"
                        title="Edit Rule"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
                  <div className="text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                    {r.requirement_summary}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{r.ordinance_text}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Applies to: {r.applies_to}</span>
                    {r.threshold_metric && (
                      <span className="font-mono font-semibold text-civic-800">
                        {r.threshold_metric}
                      </span>
                    )}
                  </div>
                  {r.remedy_guidance && (
                    <div className="text-slate-600">
                      <strong className="text-slate-800">Compliance Guidance:</strong>{' '}
                      {r.remedy_guidance}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Ordinance Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingRule ? 'Edit Ordinance Reference Rule' : 'Add Ordinance Rule / Local Amendment'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ordinance Category
                  </label>
                  <select
                    value={formCat}
                    onChange={(e) => setFormCat(e.target.value as OrdinanceCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="zoning">Planning &amp; Zoning (Ch. 170)</option>
                    <option value="floodplain">Floodplain (Ch. 167 / Art. 4)</option>
                    <option value="fence">Fences, Walls &amp; Hedges (Ch. 152)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Code Section *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    placeholder="e.g., IMC § 152.02 or Ord. 2026-04"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rule Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Rule heading"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applies To
                  </label>
                  <input
                    type="text"
                    value={formApplies}
                    onChange={(e) => setFormApplies(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Key Threshold Metric
                  </label>
                  <input
                    type="text"
                    value={formMetric}
                    onChange={(e) => setFormMetric(e.target.value)}
                    placeholder="e.g., <= 6' 6&quot; height"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requirement Summary *
                </label>
                <input
                  type="text"
                  required
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ordinance Text / Provision Details
                </label>
                <textarea
                  rows={3}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remedy / Staff Guidance
                </label>
                <input
                  type="text"
                  value={formRemedy}
                  onChange={(e) => setFormRemedy(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold"
                >
                  {editingRule ? 'Save Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
