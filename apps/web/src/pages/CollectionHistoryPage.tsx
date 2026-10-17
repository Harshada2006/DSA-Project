import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CollectionEvent } from '@eco-collect/shared';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import {
  History,
  Download,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Truck,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const CollectionHistoryPage: React.FC = () => {
  const [collections, setCollections] = useState<CollectionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getCollections(100);
      setCollections(data);
    } catch (err: any) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const exportCsv = () => {
    if (collections.length === 0) return;
    const headers = ['id', 'bin_code', 'driver_name', 'collected_at', 'fill_before', 'fill_after', 'status', 'provenance'];
    const rows = collections.map((c) => [
      c.id,
      c.binCode || 'BIN',
      `"${c.driverName.replace(/"/g, '""')}"`,
      c.collectedAt,
      c.fillBefore,
      c.fillAfter,
      c.status,
      c.provenance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nashik_collection_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Collection History & Audit Log
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Verified records of completed bin collections and post-collection fullness levels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportCsv}
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Log CSV
          </Button>
          <Button
            onClick={loadHistory}
            variant="outline"
            size="sm"
            isLoading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Audit Transparency Card */}
      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-white">Immutable Event Ledger Policy</div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Only explicit collection events recorded by authorized drivers or municipal weighbridge telemetry count as completed collections.
            The system never fabricates collection events or assumes a bin has been emptied without an explicit recorded event.
          </p>
        </div>
      </div>

      {/* History Table */}
      <Card
        title={`Recorded Collection Events (${collections.length})`}
        subtitle="Chronological audit records used for model retraining and operational verification"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Container</th>
                <th className="py-2.5 px-3">Vehicle & Driver</th>
                <th className="py-2.5 px-3">Fill Before</th>
                <th className="py-2.5 px-3">Fill After</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Provenance</th>
                <th className="py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collections.length > 0 ? (
                collections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {new Date(c.collectedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-900 block">{c.binCode || 'BIN'}</span>
                      <span className="text-[11px] text-slate-500">{c.binName}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{c.driverName}</div>
                      <div className="text-[10px] text-slate-400">{c.vehicleReg || 'Compactor'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-rose-600">{c.fillBefore}%</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-emerald-600">{c.fillAfter}%</span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={c.status === 'completed' ? 'success' : 'default'} size="sm">
                        {c.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <ProvenanceBadge provenance={c.provenance} showIcon={false} />
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                      {c.notes || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No collection events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
