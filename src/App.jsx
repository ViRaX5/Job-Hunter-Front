import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchJobs, setJobStatus, refreshJobs } from './api.js';

const COMPANIES = [
  { key: 'nvidia', label: 'NVIDIA' },
  { key: 'amazon', label: 'Amazon' },
  { key: 'checkpoint', label: 'Check Point' },
  { key: 'google', label: 'Google' },
  { key: 'mobileye', label: 'Mobileye' },
];

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'none', label: 'New' },
  { key: 'saved', label: 'Saved' },
  { key: 'applied', label: 'Applied' },
  { key: 'not_applied', label: 'Not Applied' },
];

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJobs({ company, status, q });
      setJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [company, status, q]);

  useEffect(() => {
    const handle = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [load, q]);

  const handleStatusChange = async (id, newStatus) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j)));
    try {
      await setJobStatus(id, newStatus);
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      await refreshJobs();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const counts = useMemo(() => {
    const c = {};
    for (const j of jobs) c[j.company] = (c[j.company] || 0) + 1;
    return c;
  }, [jobs]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Student Job Tracker</h1>
        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </header>

      <div className="filters">
        <div className="filter-group">
          {[{ key: '', label: 'All companies' }, ...COMPANIES].map((c) => (
            <button
              key={c.key}
              className={`chip ${company === c.key ? 'chip-active' : ''}`}
              onClick={() => setCompany(c.key)}
            >
              {c.label}
              {c.key && counts[c.key] ? ` (${counts[c.key]})` : ''}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              className={`chip ${status === s.key ? 'chip-active' : ''}`}
              onClick={() => setStatus(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="Search title or location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : jobs.length === 0 ? (
        <p className="empty-state">No jobs match these filters.</p>
      ) : (
        <ul className="job-list">
          {jobs.map((job) => (
            <li key={job.id} className="job-card">
              <div className="job-main">
                <span className={`badge badge-${job.company}`}>{job.company}</span>
                <a href={job.url} target="_blank" rel="noreferrer" className="job-title">
                  {job.title}
                </a>
                <div className="job-meta">
                  <span>{job.location || 'Location n/a'}</span>
                  {job.employment_type && <span>· {job.employment_type}</span>}
                  <span>· first seen {timeAgo(job.first_seen_at)}</span>
                </div>
              </div>
              <div className="job-side">
                {job.closed_at && <span className="closed-badge">Closed</span>}
                <div className="job-actions">
                  <button
                    className={`action-btn ${job.status === 'saved' ? 'action-active' : ''}`}
                    onClick={() => handleStatusChange(job.id, job.status === 'saved' ? 'none' : 'saved')}
                  >
                    {job.status === 'saved' ? '★ Saved' : '☆ Save'}
                  </button>
                  <button
                    className={`action-btn ${job.status === 'applied' ? 'action-active' : ''}`}
                    onClick={() => handleStatusChange(job.id, job.status === 'applied' ? 'none' : 'applied')}
                  >
                    {job.status === 'applied' ? '✓ Applied' : 'Mark applied'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
