// In dev, relative '/api/...' goes through Vite's proxy to localhost:3001.
// In production (GitHub Pages), there's no proxy - VITE_API_URL must point
// at wherever the backend is actually reachable (e.g. https://your-tailscale-name:3001).
const API_ROOT = import.meta.env.VITE_API_URL || '';
const BASE = `${API_ROOT}/api/jobs`;

export async function fetchJobs({ company, status, q } = {}) {
  const params = new URLSearchParams();
  if (company) params.set('company', company);
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  const res = await fetch(`${BASE}?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}

export async function setJobStatus(id, status) {
  const res = await fetch(`${BASE}/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update job status');
  return res.json();
}

export async function refreshJobs() {
  const res = await fetch(`${BASE}/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh jobs');
  return res.json();
}

// The full list of tracked companies, independent of whether any of them
// currently have an open posting.
export async function fetchCompanies() {
  const res = await fetch(`${API_ROOT}/api/companies`);
  if (!res.ok) throw new Error('Failed to fetch companies');
  return res.json();
}
