import { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchJobs, setJobStatus, refreshJobs } from './api.js';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'none', label: 'New' },
  { key: 'saved', label: 'Saved' },
  { key: 'applied', label: 'Applied' },
  { key: 'not_applied', label: 'Not Applied' },
];

// Optional prettier display names for known company keys. Anything not
// listed here still works fine - it just falls back to auto-capitalizing
// the raw key, so a brand-new connector needs zero frontend changes.
const COMPANY_LABELS = {
  nvidia: 'NVIDIA',
  checkpoint: 'Check Point',
  appsflyer: 'AppsFlyer',
  jfrog: 'JFrog',
  playperfect: 'Play Perfect',
  solaredge: 'SolarEdge',
  moonactive: 'Moon Active',
};

function companyLabel(key) {
  return COMPANY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

// Known companies keep their real brand color; anything else falls back to
// a deterministic hash-generated color, so a brand-new connector still gets
// a distinct, stable badge with no CSS/JS changes required.
const COMPANY_COLORS = {
  nvidia: '#76b900',
  amazon: '#e8871e',
  checkpoint: '#d0271d',
  google: '#4285f4',
  mobileye: '#6a3fbf',
};

function companyColor(key) {
  if (COMPANY_COLORS[key]) return COMPANY_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 40%)`;
}

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
  // Holds every job matching the current status/search filters, across all
  // companies - company filtering itself happens client-side below, so the
  // full set of company chips (and their counts) stay visible and accurate
  // no matter which company is currently selected.
  const [allJobs, setAllJobs] = useState([]);
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
      const data = await fetchJobs({ status, q });
      setAllJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    const handle = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [load, q]);

  const handleStatusChange = async (id, newStatus) => {
    setAllJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j)));
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

  const { companies, counts } = useMemo(() => {
    const counts = {};
    for (const j of allJobs) counts[j.company] = (counts[j.company] || 0) + 1;
    const companies = Object.keys(counts).sort();
    return { companies, counts };
  }, [allJobs]);

  const jobs = useMemo(
    () => (company ? allJobs.filter((j) => j.company === company) : allJobs),
    [allJobs, company]
  );

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
          <button className={`chip ${company === '' ? 'chip-active' : ''}`} onClick={() => setCompany('')}>
            All companies
          </button>
          {companies.map((key) => (
            <button
              key={key}
              className={`chip ${company === key ? 'chip-active' : ''}`}
              onClick={() => setCompany(key)}
            >
              {companyLabel(key)} ({counts[key]})
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
                <span className="badge" style={{ background: companyColor(job.company) }}>
                  {companyLabel(job.company)}
                </span>
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
