import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  Database,
  ExternalLink,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export const DataSourcesPage: React.FC = () => {
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importType, setImportType] = useState<'bins' | 'observations'>('bins');
  const [csvContent, setCsvContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);

  const loadSources = async () => {
    setLoading(true);
    try {
      const data = await api.getDataSources();
      setDataSources(data);
    } catch (err: any) {
      console.error('Failed to load data sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('type', importType);
      formData.append('csv', csvContent);
      formData.append('sourceName', `Manual ${importType.toUpperCase()} Batch Ingestion`);

      const res = await api.importCsv(formData);
      setUploadResult(res);
      loadSources();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Download Sample Templates
  const downloadSampleTemplate = (type: string) => {
    let filename = '';
    let content = '';

    if (type === 'bins') {
      filename = 'bins_sample_template.csv';
      content = 'code,name,ward_code,latitude,longitude,capacity_liters,waste_type,area_category,status\nBIN-NSK-201,Panchavati Karanja East,WARD-01,20.0085,73.7948,1200,organic,market,active\nBIN-NSK-202,Ramkund River Front,WARD-01,20.0073,73.7930,1500,general,pilgrimage,active';
    } else if (type === 'observations') {
      filename = 'observations_sample_template.csv';
      content = 'bin_code,fill_percentage,observed_at,observer_type,notes\nBIN-NSK-001,86.5,2026-10-17T09:00:00Z,sensor,Morning vegetable market rush\nBIN-NSK-002,94.0,2026-10-17T09:30:00Z,manual_inspection,Pilgrim rush at Ramkund';
    } else if (type === 'complaints') {
      filename = 'complaints_sample_template.csv';
      content = 'ticket_no,category,description,ward_code,latitude,longitude,severity,reported_by\nTCK-2026-901,overflow,Overflowing market bin,WARD-01,20.0082,73.7945,critical,Kailas Shinde';
    }

    const encoded = encodeURI('data:text/csv;charset=utf-8,' + content);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', filename);
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
            Data Sources & Ingestion Centre
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Verified provenance tracking, Open Data licenses, and validated CSV/GeoJSON ingestion.
          </p>
        </div>
        <Button
          onClick={loadSources}
          variant="outline"
          size="sm"
          isLoading={loading}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Honest Provenance Policy Card */}
      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-white">Government & Open Data Provenance Guarantee</div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Eco Collect distinguishes between verified municipal observations, government open datasets (Census 2011, MPCB), OpenStreetMap road networks, and synthetic demonstration records.
            The system never fabricates coordinates or pretends synthetic data represents actual municipal performance.
          </p>
        </div>
      </div>

      {/* Data Sources Registry Table */}
      <Card
        title="Candidate Municipal Data Sources for Nashik"
        subtitle="Catalog of verified government feeds, open-source geospatial repositories, and synthetic generators"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Data Source Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Geographic Coverage</th>
                <th className="py-2.5 px-3">Date Range</th>
                <th className="py-2.5 px-3">Accepted / Rejected</th>
                <th className="py-2.5 px-3">License & Notes</th>
                <th className="py-2.5 px-3 text-right">URL Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataSources.map((ds) => (
                <tr key={ds.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{ds.name}</span>
                    <span className="text-[10px] text-slate-400">{ds.dataQualityWarnings}</span>
                  </td>
                  <td className="py-3 px-3">
                    <Badge
                      variant={
                        ds.sourceType === 'government'
                          ? 'success'
                          : ds.sourceType === 'open_source'
                          ? 'info'
                          : 'warning'
                      }
                      size="sm"
                      className="capitalize"
                    >
                      {ds.sourceType.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-slate-700">{ds.coverage || 'Nashik District'}</td>
                  <td className="py-3 px-3 text-slate-600 font-mono">{ds.dateRange || 'Current'}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-emerald-700">{ds.acceptedRowsCount}</span>
                    {ds.rejectedRowsCount > 0 && (
                      <span className="text-rose-600 font-semibold ml-1">({ds.rejectedRowsCount} err)</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-600 max-w-xs">
                    {ds.licenseNotes}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {ds.url && !ds.url.startsWith('local://') ? (
                      <a
                        href={ds.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-forest-700 hover:text-forest-900 font-semibold"
                      >
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">Local generator</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Import & Ingestion Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Ingestion Form */}
        <Card
          title="Validated Ingestion Dropzone"
          subtitle="Paste CSV batch data for automated coordinate & schema verification"
        >
          <form onSubmit={handleUpload} className="space-y-4 text-xs">
            <div className="flex items-center gap-4">
              <label className="font-semibold text-slate-700">Target Schema:</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    checked={importType === 'bins'}
                    onChange={() => setImportType('bins')}
                    className="accent-forest-600"
                  />
                  <span>Bins Registry</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    checked={importType === 'observations'}
                    onChange={() => setImportType('observations')}
                    className="accent-forest-600"
                  />
                  <span>Fill Observations</span>
                </label>
              </div>
            </div>

            <div>
              <textarea
                rows={7}
                placeholder="Paste CSV rows here..."
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500"
              />
            </div>

            {uploadResult && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">Validation Report:</div>
                <div className="text-emerald-700 font-semibold">Accepted: {uploadResult.acceptedRows} rows</div>
                {uploadResult.rejectedRows > 0 && (
                  <div className="text-rose-600 font-semibold">Rejected: {uploadResult.rejectedRows} rows</div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={uploading}
                icon={<Upload className="w-4 h-4" />}
              >
                Validate & Ingest Batch
              </Button>
            </div>
          </form>
        </Card>

        {/* Downloadable Standard Templates */}
        <Card
          title="Download Official Sample Templates"
          subtitle="Pre-formatted CSV and GeoJSON schemas ready for municipal data entry"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-forest-600" />
                  Bins Registry Schema Template (.csv)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Includes code, coordinates, capacity, ward, and waste type.
                </div>
              </div>
              <Button
                onClick={() => downloadSampleTemplate('bins')}
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download
              </Button>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-forest-600" />
                  Fill Observations Schema Template (.csv)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Includes bin_code, fill_percentage, observer_type, and timestamp.
                </div>
              </div>
              <Button
                onClick={() => downloadSampleTemplate('observations')}
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download
              </Button>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-forest-600" />
                  Citizen Complaints Schema Template (.csv)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Includes ticket_no, category, description, coordinates, and severity.
                </div>
              </div>
              <Button
                onClick={() => downloadSampleTemplate('complaints')}
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
