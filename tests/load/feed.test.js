import http from 'k6/http';
import { sleep, check } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export const options = {
  scenarios: {
    feed: { executor: 'constant-vus', vus: 100, duration: '5m', tags: { endpoint: 'feed' } },
    search: { executor: 'constant-vus', vus: 50, duration: '5m', tags: { endpoint: 'search' } },
    profile: { executor: 'constant-vus', vus: 50, duration: '5m', tags: { endpoint: 'profile' } },
  },
  thresholds: { http_req_duration: ['p(95)<500'], http_req_failed: ['rate<0.01'] },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  check(http.get(`${BASE}/calls`), { 'feed ok': (r) => r.status === 200 });
  check(http.get(`${BASE}/search?q=test`), { 'search ok': (r) => r.status < 500 });
  check(http.get(`${BASE}/users/me`), { 'profile ok': (r) => r.status < 500 });
  sleep(1);
}

export function handleSummary(data) {
  return { 'tests/load/report.html': htmlReport(data) };
}
