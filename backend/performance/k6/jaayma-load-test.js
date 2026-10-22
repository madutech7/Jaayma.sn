import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const apiUrl = (__ENV.API_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const maxVus = Number(__ENV.MAX_VUS || 20);
const shopsBlocked = new Trend('shops_blocked_ms');
const shopsTtfb = new Trend('shops_ttfb_ms');
const shopsConnectionSetup = new Trend('shops_connection_setup_ms');
const shopsSending = new Trend('shops_sending_ms');
const shopsReceiving = new Trend('shops_receiving_ms');
const productsBlocked = new Trend('products_blocked_ms');
const productsTtfb = new Trend('products_ttfb_ms');
const productsConnectionSetup = new Trend('products_connection_setup_ms');
const productsSending = new Trend('products_sending_ms');
const productsReceiving = new Trend('products_receiving_ms');

function logUnexpectedResponse(endpoint, response) {
  if (response.status === 200) return;

  const body = typeof response.body === 'string' ? response.body.slice(0, 240) : '';
  console.error(
    `[k6] ${endpoint} status=${response.status} duration=${response.timings.duration.toFixed(0)}ms ` +
      `error=${response.error || 'none'} contentType=${response.headers['Content-Type'] || 'unknown'} body=${body}`,
  );
}

function recordTimings(endpoint, response) {
  if (endpoint === 'shops-explore') {
    shopsBlocked.add(response.timings.blocked);
    shopsTtfb.add(response.timings.waiting);
    shopsConnectionSetup.add(response.timings.connecting + response.timings.tls_handshaking);
    shopsSending.add(response.timings.sending);
    shopsReceiving.add(response.timings.receiving);
  } else if (endpoint === 'products-explore') {
    productsBlocked.add(response.timings.blocked);
    productsTtfb.add(response.timings.waiting);
    productsConnectionSetup.add(response.timings.connecting + response.timings.tls_handshaking);
    productsSending.add(response.timings.sending);
    productsReceiving.add(response.timings.receiving);
  }
}

function hasItemsArray(response) {
  try {
    return Array.isArray(response.json('items'));
  } catch {
    return false;
  }
}

function reportsApiHealthy(response) {
  try {
    return response.status === 200 && response.json('ok') === true;
  } catch {
    return false;
  }
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
    'http_req_duration{endpoint:shops-explore}': ['p(95)<2000'],
    'http_req_duration{endpoint:products-explore}': ['p(95)<2000'],
  },
};

export function setup() {
  const health = http.get(`${apiUrl}/health`, {
    tags: { endpoint: 'api-health-preflight' },
  });
  logUnexpectedResponse('api-health-preflight', health);

  if (!check(health, {
    'API preflight responds 200': (response) => response.status === 200,
    'API preflight reports ok': reportsApiHealthy,
  })) {
    throw new Error('Le contrôle préalable /health a échoué.');
  }
}

export default function () {
  const shops = http.get(`${apiUrl}/shops/explore?limit=12&page=1`, {
    tags: { endpoint: 'shops-explore' },
  });
  logUnexpectedResponse('shops-explore', shops);
  recordTimings('shops-explore', shops);
  check(shops, {
    'shop explore responds 200': (response) => response.status === 200,
    'shop explore returns JSON': (response) =>
      response.headers['Content-Type']?.includes('application/json') ?? false,
    'shop explore has items array': hasItemsArray,
  });

  // Most sessions stay on page 1; one in four advances to the second product page.
  const productPage = (__VU + __ITER) % 4 === 0 ? 2 : 1;
  const products = http.get(`${apiUrl}/products/explore?limit=12&page=${productPage}`, {
    tags: { endpoint: 'products-explore' },
  });
  logUnexpectedResponse('products-explore', products);
  recordTimings('products-explore', products);
  check(products, {
    'product explore responds 200': (response) => response.status === 200,
    'product explore returns JSON': (response) =>
      response.headers['Content-Type']?.includes('application/json') ?? false,
    'product explore has items array': hasItemsArray,
  });

  sleep(1);
}
