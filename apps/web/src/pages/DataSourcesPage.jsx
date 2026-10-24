import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import {
  Database,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const DataSourcesPage = () => {
  const [sources, setSources] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sourcesRes, logsRes] = await Promise.all([
        api.getDataSources().catch(() => []),
        api.getAuditLogs().catch(() => []),
      ]);
      setSources(sourcesRes || []);
      setAuditLogs(logsRes || []);
    } catch (err) {
      console.error('Failed to load data sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Provenance & Audit Transparency</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              Verified & Synthetic Attribution
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete academic transparency disclosing verified civic data sources versus simulated synthetic demo records
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Provenance
        </Button>
      </div>

      {/* Official Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 border-l-4 border-l-emerald-600 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Public & Government Sources
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
              Verified
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Real datasets ingested directly from official publications and open geospatial cartography:
          </p>
          <ul className="text-xs text-slate-700 space-y-2 divide-y divide-slate-100 pt-1">
            <li className="pt-2">
              <strong className="text-slate-900 block">1. Nashik Municipal Corporation (NMC) Sanitary Reports (2023-24):</strong>
              Ward boundaries (Panchavati, CIDCO, Nashik East, Nashik West, Satpur, Nashik Road), solid waste transfer stations, and Vilholi processing plant data.
            </li>
            <li className="pt-2">
              <strong className="text-slate-900 block">2. Maharashtra Pollution Control Board (MPCB):</strong>
              Authorized E-Waste Dismantler & Recycler Registry (Trimbak E-Waste Processors & Ambad Green Recyclers Ltd).
            </li>
            <li className="pt-2">
              <strong className="text-slate-900 block">3. Census of India (2011):</strong>
              Ward population benchmarks, household density, and geographic baseline extents.
            </li>
            <li className="pt-2">
              <strong className="text-slate-900 block">4. OpenStreetMap (OSM) Graph:</strong>
              Road network intersections (nodes) and drive times/distances (directed edges) for C++ shortest-path routing.
            </li>
          </ul>
        </Card>

        <Card className="p-5 border-l-4 border-l-purple-600 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Synthetic Demo Simulation Records
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
              Synthetic
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Explicitly tagged records generated for academic demonstration and algorithm stress-testing:
          </p>
          <ul className="text-xs text-slate-700 space-y-2 divide-y divide-slate-100 pt-1">
            <li className="pt-2">
              <strong className="text-slate-900 block">1. Simulated Bin Fullness Readings:</strong>
              Dynamic fill percentages and time-to-overflow simulations generated for evaluation testing.
            </li>
            <li className="pt-2">
              <strong className="text-slate-900 block">2. Demo Citizen Grievance Tickets:</strong>
              Sample citizen complaint tickets generated to showcase status tracking and sanitary resolution workflows.
            </li>
            <li className="pt-2">
              <strong className="text-slate-900 block">3. Demo E-Waste Doorstep Bookings:</strong>
              Sample appliance collection requests to verify end-to-end chain of custody handover to MPCB recyclers.
            </li>
          </ul>
        </Card>
      </div>

      {/* System Audit Logs */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            System Security & Action Audit Trail
          </span>
          <span className="text-xs text-slate-500">{auditLogs.length} Events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Action Event</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-slate-500">
                    No security audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {log.user?.email || 'System'}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                      {log.entityType ? `${log.entityType} #${(log.entityId || '').slice(0, 8)}` : '—'}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
