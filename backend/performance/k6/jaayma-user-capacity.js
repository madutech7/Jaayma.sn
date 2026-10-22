import http from 'k6/http';
import { check, sleep } from 'k6';
import { hmac } from 'k6/crypto';

const apiUrl = (__ENV.API_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const maxUsers = Number(__ENV.MAX_USERS || 30);
const sessionSecret = __ENV.JWT_SECRET || 'jaayma-local-session-secret';
const shopId = __ENV.TEST_SHOP_ID;
const shopSlug = __ENV.TEST_SHOP_SLUG;
const ownerId = __ENV.TEST_OWNER_ID;
const productId = __ENV.TEST_PRODUCT_ID;

if (!Number.isInteger(maxUsers) || maxUsers < 3 || maxUsers > 100) {
  throw new Error('MAX_USERS doit être un entier entre 3 et 100.');
}
if (!shopId || !shopSlug || !ownerId || !productId) {
  throw new Error('Définir TEST_SHOP_ID, TEST_SHOP_SLUG, TEST_OWNER_ID et TEST_PRODUCT_ID avec des données de test.');
}

const sellers = Math.max(1, Math.round(maxUsers * 0.17));
const buyers = Math.max(1, Math.round(maxUsers * 0.33));
const visitors = maxUsers - sellers - buyers;

function rampStages(target) {
  return [
    { duration: '30s', target: Math.max(1, Math.ceil(target * 0.25)) },
    { duration: '30s', target: Math.max(1, Math.ceil(target * 0.5)) },
    { duration: '30s', target: Math.max(1, Math.ceil(target * 0.75)) },
    { duration: '30s', target },
    { duration: '2m', target },
    { duration: '30s', target: 0 },
  ];
}

export const options = {
  scenarios: {
    visitors: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampStages(visitors),
      exec: 'visitorJourney',
      gracefulRampDown: '30s',
    },
    buyers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampStages(buyers),
      exec: 'buyerJourney',
      gracefulRampDown: '30s',
    },
    sellers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampStages(sellers),
      exec: 'sellerJourney',
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{role:visitor}': ['p(95)<2000'],
    'http_req_duration{role:buyer}': ['p(95)<2000'],
    'http_req_duration{role:seller}': ['p(95)<2000'],
  },
};

function authHeader() {
  const timestamp = Date.now();
  const signature = hmac('sha256', sessionSecret, `${ownerId}.${timestamp}`, 'hex');
  return { Authorization: `Bearer usr_${ownerId}_${timestamp}_${signature}` };
}

function get(path, role, name) {
  const response = http.get(`${apiUrl}${path}`, {
    headers: role === 'seller' ? authHeader() : undefined,
    tags: { role, endpoint: name },
  });
  if (response.status !== 200) {
    console.error(`${role} ${name} returned HTTP ${response.status}`);
  }
  check(response, {
    [`${role} ${name} responds 200`]: (result) => result.status === 200,
    [`${role} ${name} returns JSON`]: (result) =>
      result.headers['Content-Type']?.includes('application/json') ?? false,
  });
  return response;
}

function pauseBetweenPages() {
  sleep(1 + Math.random() * 2);
}

export function visitorJourney() {
  get('/shops/explore?limit=12&page=1', 'visitor', 'shops-explore');
  pauseBetweenPages();
  get('/products/explore?limit=12&page=1', 'visitor', 'products-explore');
  pauseBetweenPages();
  get(`/shops/${encodeURIComponent(shopSlug)}`, 'visitor', 'shop-detail');
  pauseBetweenPages();
  get(`/shops/${encodeURIComponent(shopSlug)}/products/${encodeURIComponent(productId)}`, 'visitor', 'product-detail');
  sleep(10 + Math.random() * 10);
}

export function buyerJourney() {
  get('/products/explore?limit=12&page=1', 'buyer', 'products-explore');
  pauseBetweenPages();
  get(`/shops/${encodeURIComponent(shopSlug)}`, 'buyer', 'shop-detail');
  pauseBetweenPages();
  get(`/shops/${encodeURIComponent(shopSlug)}/products/${encodeURIComponent(productId)}`, 'buyer', 'product-detail');
  sleep(10 + Math.random() * 10);
}

export function sellerJourney() {
  get(`/shops/by-owner/${encodeURIComponent(ownerId)}`, 'seller', 'seller-shop');
  pauseBetweenPages();
  get(`/shops/${encodeURIComponent(shopId)}/products`, 'seller', 'seller-products');
  pauseBetweenPages();
  get(`/orders/shops/${encodeURIComponent(shopId)}?take=50`, 'seller', 'seller-orders');
  sleep(10 + Math.random() * 10);
}
