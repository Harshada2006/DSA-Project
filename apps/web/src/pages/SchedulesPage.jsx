import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Card } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import {
  Calendar,
  Clock,
  Sparkles,
  Plus,
  RefreshCw,
  MapPin,
  TrendingUp,
} from 'lucide-react';

export const SchedulesPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: 'Godavari Riverbank Cleanliness Drive',
    eventType: 'CIVIC_DRIVE',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    expectedWasteMultiplier: 1.45,
    description: 'Post-festival special river ghat desiltation and cleanup across Panchavati Ramkund.',
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedRes, eventsRes, wardsRes] = await Promise.all([
        api.getSchedules(),
        api.getEvents(),
        api.getWards(),
      ]);
      setSchedules(schedRes || []);
      setEvents(eventsRes || []);
      setWards(wardsRes || []);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setSubmittingEvent(true);
    try {
      await api.createEvent(eventForm);
      setIsEventOpen(false);
      loadData();
    } catch (err) {
      alert(`Create event failed: ${err.message}`);
    } finally {
      setSubmittingEvent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Collection Schedules & Contingency Drives</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              Timetables & Surges
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standard municipal collection shifts paired with religious festival and pilgrimage waste surge contingency models
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsEventOpen(true)} icon={<Plus className="w-3.5 h-3.5" />}>
            Plan Festival Contingency
          </Button>
        </div>
      </div>

      {/* Grid: Regular Timetables & Festival Contingencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ward Timetables */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Regular Ward Door-to-Door Rounds
              </h3>
              <p className="text-xs text-slate-500">Standard operating hours for NMC tipper trucks</p>
            </div>
            <span className="text-xs font-semibold text-slate-600">{schedules.length} Shifts</span>
          </div>

          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{s.ward?.name || 'Nashik Ward'}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Window: <strong>{s.timeWindow}</strong> • Shift: <span className="uppercase font-mono">{s.shift}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vehicle Type: {s.vehicleType || 'Hydraulic Compactor'}
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md uppercase">
                  {s.wasteType}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Festival & Event Surges */}
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Festival Surges & Cleanliness Operations
              </h3>
              <p className="text-xs text-slate-500">Special seasonal adjustments feeding C++ priority heap</p>
            </div>
            <span className="text-xs font-semibold text-purple-700">{events.length} Events</span>
          </div>

          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-xs text-purple-900">{ev.name}</h4>
                    <span className="text-[10px] uppercase font-mono font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                      {ev.eventType}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-700 bg-white border border-purple-200 px-2 py-1 rounded">
                    +{Math.round((ev.expectedWasteMultiplier - 1) * 100)}% Surge Multiplier
                  </span>
                </div>
                <p className="text-xs text-slate-600">{ev.description}</p>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-purple-100">
                  <span>Start: {new Date(ev.startDate).toLocaleDateString()}</span>
                  <span>End: {new Date(ev.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Plan Event Modal */}
      <Modal isOpen={isEventOpen} onClose={() => setIsEventOpen(false)} title="Configure Festival Contingency Operation">
        <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Event / Festival Name *</label>
            <input
              type="text"
              required
              value={eventForm.name}
              onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
              placeholder="e.g. Kumbh Mela Shahi Snan Cleanliness Drive"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Classification</label>
              <select
                value={eventForm.eventType}
                onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="FESTIVAL">Religious Festival (Pilgrimage)</option>
                <option value="CIVIC_DRIVE">Godavari Cleanliness Drive</option>
                <option value="MARKET_EVENT">Seasonal Agri Market Fair</option>
                <option value="DISASTER">Monsoon Waterway Contingency</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Surge Multiplier (e.g. 1.50 = +50%)</label>
              <input
                type="number"
                step="0.05"
                min="1.0"
                max="3.0"
                value={eventForm.expectedWasteMultiplier}
                onChange={(e) => setEventForm({ ...eventForm, expectedWasteMultiplier: parseFloat(e.target.value) || 1.2 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Start Date</label>
              <input
                type="date"
                required
                value={eventForm.startDate}
                onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">End Date</label>
              <input
                type="date"
                required
                value={eventForm.endDate}
                onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Operational Description</label>
            <textarea
              rows={2}
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="Outline deployment adjustments, temporary bin placements, and riverbank protection..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEventOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submittingEvent}>
              Save Contingency Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
