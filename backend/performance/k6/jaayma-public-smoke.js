import http from 'k6/http';
import { check, sleep } from 'k6';

const frontendUrl = (__ENV.FRONTEND_URL || 'https://jaayma-sn.madutech0.workers.dev').replace(/\/$/, '');
const apiUrl = (__ENV.API_URL || 'https://jaayma-sn.onrender.com').replace(/\/$/, '');

export const options = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '20s', target: 3 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const homepage = http.get(`${frontendUrl}/`, { tags: { endpoint: 'homepage' } });
  check(homepage, { 'homepage responds 200': (response) => response.status === 200 });

  const health = http.get(`${apiUrl}/health`, { tags: { endpoint: 'api-health' } });
  check(health, {
    'API health responds 200': (response) => response.status === 200,
    'API health reports ok': (response) => response.json('ok') === true,
  });

  const explore = http.get(`${apiUrl}/shops/explore?limit=12`, {
    tags: { endpoint: 'shop-explore' },
  });
  check(explore, {
    'shop explore responds 200': (response) => response.status === 200,
    'shop explore returns JSON': (response) =>
      response.headers['Content-Type']?.includes('application/json') ?? false,
  });

  sleep(1);
}
