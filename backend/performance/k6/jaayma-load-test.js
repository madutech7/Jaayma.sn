import http from 'k6/http';
import { check, sleep } from 'k6';

const apiUrl = (__ENV.API_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const maxVus = Number(__ENV.MAX_VUS || 20);

function logUnexpectedResponse(endpoint, response) {
  if (response.status === 200) return;

  const body = typeof response.body === 'string' ? response.body.slice(0, 240) : '';
  console.error(
    `[k6] ${endpoint} status=${response.status} duration=${response.timings.duration.toFixed(0)}ms ` +
      `error=${response.error || 'none'} contentType=${response.headers['Content-Type'] || 'unknown'} body=${body}`,
  );
}

if (!Number.isInteger(maxVus) || maxVus < 1 || maxVus > 1000) {
  throw new Error('MAX_VUS doit être un entier compris entre 1 et 1000.');
}

export const options = {
  scenarios: {
    public_api_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.min(5, maxVus) },
        { duration: '1m', target: Math.min(10, maxVus) },
        { duration: '1m', target: maxVus },
        { duration: '2m', target: maxVus },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{endpoint:api-health}': ['p(95)<1000'],
    'http_req_duration{endpoint:shops-explore}': ['p(95)<2000'],
    'http_req_duration{endpoint:products-explore}': ['p(95)<2000'],
  },
};

export default function () {
  const health = http.get(`${apiUrl}/health`, {
    tags: { endpoint: 'api-health' },
  });
  logUnexpectedResponse('api-health', health);
  check(health, {
    'health responds 200': (response) => response.status === 200,
    'health reports ok': (response) => response.json('ok') === true,
  });

  const shops = http.get(`${apiUrl}/shops/explore?limit=12&page=1`, {
    tags: { endpoint: 'shops-explore' },
  });
  logUnexpectedResponse('shops-explore', shops);
  check(shops, {
    'shop explore responds 200': (response) => response.status === 200,
    'shop explore returns JSON': (response) =>
      response.headers['Content-Type']?.includes('application/json') ?? false,
  });

  const products = http.get(`${apiUrl}/products/explore?limit=12&page=1`, {
    tags: { endpoint: 'products-explore' },
  });
  logUnexpectedResponse('products-explore', products);
  check(products, {
    'product explore responds 200': (response) => response.status === 200,
    'product explore returns JSON': (response) =>
      response.headers['Content-Type']?.includes('application/json') ?? false,
  });

  sleep(1);
}
