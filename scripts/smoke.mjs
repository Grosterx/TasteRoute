import assert from 'node:assert/strict';

const apiBase = (process.env.API_BASE || 'http://localhost:8080/tasteroute/api').replace(/\/$/, '');
const adminToken = process.env.ADMIN_TOKEN || 'dev-admin-token';
const apiURL = new URL(apiBase);
const wsURLBase = `${apiURL.protocol === 'https:' ? 'wss:' : 'ws:'}//${apiURL.host}${apiURL.pathname.replace(/\/$/, '')}/ws`;

async function request(path, { method = 'GET', body, token, admin } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) headers['x-admin-token'] = admin;

  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text}`);
  return data;
}

function connect(url) {
  const socket = new WebSocket(url);
  const queue = [];
  const waiters = [];

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const index = waiters.findIndex((waiter) => waiter.predicate(message));
    if (index >= 0) {
      const [waiter] = waiters.splice(index, 1);
      waiter.resolve(message);
      return;
    }
    queue.push(message);
  });

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('websocket error')), { once: true });
  });

  function next(predicate, timeoutMs = 5000) {
    const index = queue.findIndex(predicate);
    if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('timeout waiting for websocket message'));
      }, timeoutMs);
      waiters.push({
        predicate,
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message);
        },
      });
    });
  }

  return {
    opened,
    next,
    send: (value) => socket.send(JSON.stringify(value)),
    close: () => socket.close(),
  };
}

async function main() {
  const room = await request('/rooms', { method: 'POST', body: { city: 'Тольятти' } });
  const first = await request(`/rooms/${room.code}/join`, {
    method: 'POST',
    body: { name: 'Smoke 1' },
  });
  const second = await request(`/rooms/${room.code}/join`, {
    method: 'POST',
    body: { name: 'Smoke 2' },
  });

  const catalog = await request(`/rooms/${room.code}/catalog`, { token: first.token });
  assert.ok(catalog.length > 0, 'catalog must not be empty');

  const byRestaurant = new Map();
  for (const dish of catalog) {
    if (!byRestaurant.has(dish.restaurant_id)) byRestaurant.set(dish.restaurant_id, dish);
  }
  const dishes = [...byRestaurant.values()].slice(0, 2);
  assert.equal(dishes.length, 2, 'catalog must contain at least two restaurants');

  const firstSocket = connect(`${wsURLBase}?room=${room.code}&token=${first.token}`);
  const secondSocket = connect(`${wsURLBase}?room=${room.code}&token=${second.token}`);
  await Promise.all([firstSocket.opened, secondSocket.opened]);
  await Promise.all([
    firstSocket.next((message) => message.type === 'participants'),
    secondSocket.next((message) => message.type === 'participants'),
  ]);

  for (const dish of dishes) {
    firstSocket.send({ type: 'swipe', dish_id: dish.dish_id, liked: true });
    secondSocket.send({ type: 'swipe', dish_id: dish.dish_id, liked: true });
    await Promise.all([
      firstSocket.next((message) => message.type === 'match' && message.dish_id === dish.dish_id),
      secondSocket.next((message) => message.type === 'match' && message.dish_id === dish.dish_id),
    ]);
  }

  const route = await request(`/rooms/${room.code}/route`, { token: first.token });
  assert.ok(route.stops.length >= 2, 'route must contain at least two stops');

  const lead = await request('/leads', {
    method: 'POST',
    token: first.token,
    body: { name: 'Smoke', phone: '+79990000000', comment: 'automated smoke test' },
  });
  assert.equal(lead.ok, true);

  const leads = await request('/admin/leads', { admin: adminToken });
  const stored = leads.find((item) => item.room_code === room.code);
  assert.ok(stored, 'lead must be visible in admin list');
  assert.ok(stored.route?.stops?.length >= 2, 'admin lead must include the route');

  firstSocket.close();
  secondSocket.close();
  console.log(`smoke ok: room=${room.code} stops=${route.stops.length} lead=${stored.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
