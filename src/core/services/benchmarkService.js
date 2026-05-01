import { apiRequest } from './apiClient.js';

export async function getBenchmarks(params = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.category) search.set('category', params.category);
  if (params.source) search.set('source', params.source);
  if (params.sort) search.set('sort', params.sort);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return apiRequest(`/benchmarks${suffix}`, { method: 'GET' });
}

export async function getBenchmarkDetail(slug, params = {}) {
  const search = new URLSearchParams();
  if (params.sportType) search.set('sportType', params.sportType);
  if (params.gymId) search.set('gymId', String(params.gymId));
  if (params.limit) search.set('limit', String(params.limit));
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return apiRequest(`/benchmarks/${encodeURIComponent(String(slug || '').trim().toLowerCase())}${suffix}`, { method: 'GET' });
}
