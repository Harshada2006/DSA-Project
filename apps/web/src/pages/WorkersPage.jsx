import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import {
  Users,
  Plus,
  RefreshCw,
  KeyRound,
  Truck,
  CheckCircle2,
  Copy,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

export const WorkersPage = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);

  const [form, setForm] = useState({
    name: 'Ganesh Shinde',
    email: 'ganesh.s@econexus.gov.in',
    workerId: `WRK-NSK-${Math.floor(100 + Math.random() * 900)}`,
    vehicleNumber: 'MH-15-EG-5512',
    phone: '+91 98231 09876',
  });

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkers();
      setWorkers(data || []);
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const handleProvision = async (e) => {
    e.preventDefault();
    setProvisioning(true);
    try {
      const res = await api.provisionWorker(form);
      setGeneratedToken(res);
      setForm({
        name: '',
        email: '',
        workerId: `WRK-NSK-${Math.floor(100 + Math.random() * 900)}`,
        vehicleNumber: '',
        phone: '',
      });
      loadWorkers();
    } catch (err) {
      alert(`Provision error: ${err.message}`);
    } finally {
      setProvisioning(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Activation token copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Municipal Field Staff & Drivers</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              {workers.length} Personnel
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authorized collection crews operating compactor trucks across Nashik Municipal Corporation
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setGeneratedToken(null);
            setIsProvisionOpen(true);
          }}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Provision New Worker
        </Button>
      </div>

      {/* Workers Roster Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Worker Name</th>
                <th className="p-3.5">Worker ID</th>
                <th className="p-3.5">Assigned Vehicle</th>
                <th className="p-3.5">Account Status</th>
                <th className="p-3.5">Activation Status</th>
                <th className="p-3.5">Contact Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading field workforce...
                  </td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-500">
                    No field workers provisioned yet.
                  </td>
                </tr>
              ) : (
                workers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {w.user?.name || 'Staff Member'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-amber-700 bg-amber-50/50">
                      {w.workerId}
                    </td>
                    <td className="p-3.5 font-mono text-slate-800">
                      {w.vehicleNumber || 'Unassigned'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {w.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {w.isActivated ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Activated
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 font-semibold text-[11px]">
                          <KeyRound className="w-3.5 h-3.5" /> Pending Activation
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                      {w.user?.email || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Provision Worker Modal */}
      <Modal
        isOpen={isProvisionOpen}
        onClose={() => setIsProvisionOpen(false)}
        title="Provision Municipal Worker & Generate Activation Token"
      >
        {generatedToken ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-800 font-bold mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Worker Account Provisioned!
              </div>
              <p className="text-slate-700">
                Provide the following credentials to the driver or sanitary worker to activate their account in the Field Operations Portal:
              </p>
              <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200 font-mono text-slate-900 space-y-1">
                <div><strong>Worker ID:</strong> {generatedToken.workerId}</div>
                <div><strong>Org Code:</strong> {generatedToken.orgCode || 'NMC-SWM'}</div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div><strong>Activation Token:</strong> <span className="text-emerald-700 font-bold">{generatedToken.activationToken}</span></div>
                  <button
                    onClick={() => copyToClipboard(generatedToken.activationToken)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600"
                    title="Copy Token"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setIsProvisionOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleProvision} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Worker Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ramesh Kadam"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Official Municipal Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ramesh.k@econexus.gov.in"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Worker ID</label>
                <input
                  type="text"
                  required
                  value={form.workerId}
                  onChange={(e) => setForm({ ...form, workerId: e.target.value })}
                  placeholder="WRK-NSK-105"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vehicle License Plate</label>
                <input
                  type="text"
                  value={form.vehicleNumber}
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                  placeholder="MH-15-EG-4401"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsProvisionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={provisioning}>
                Generate Token & Provision
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
