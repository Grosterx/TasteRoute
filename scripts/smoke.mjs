import assert from 'node:assert/strict';

const apiBase = (process.env.API_BASE || 'http://localhost:8080/tasteroute/api').replace(/\/$/, '');
const adminToken = process.env.ADMIN_TOKEN || 'dev-admin-token';
const apiURL = new URL(apiBase);
const wsURLBase = `${apiURL.protocol === 'https:' ? 'wss:' : 'ws:'}//${apiURL.host}${apiURL.pathname.replace(/\/$/, '')}/ws`;

async function request(path, { method = 'GET', body, token, admin } = {}) {
  const headers = { 'serveo-skip-browser-warning': 'true' };
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

async function expectError(path, options, status) {
  try {
    await request(path, options);
  } catch (error) {
    if (String(error.message).includes(`-> ${status}:`)) return;
    throw error;
  }
  throw new Error(`${path} was expected to fail with ${status}`);
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

  const suffix = Date.now().toString(36);
  const slug = `smoke-${suffix}`;
  const email = `smoke-${suffix}@tasteroute.local`;
  const password = 'smoke-pass-123';
  let smokeRestaurantID = '';

  try {
    const publicList = await request('/public/restaurants?city=Тольятти');
    assert.ok(publicList.length > 0, 'public catalog must not be empty');

    const createdRestaurant = await request('/admin/restaurants', {
      method: 'POST',
      admin: adminToken,
      body: {
        slug,
        name: `Smoke Restaurant ${suffix}`,
        city: 'Тольятти',
        cuisine: 'европейская',
        address: 'ул. Тестовая, 1',
        phone: '+79990000000',
        plan: 'pilot',
        plan_status: 'trial',
      },
    });
    smokeRestaurantID = createdRestaurant.id;
    assert.equal(createdRestaurant.slug, slug);

    await request(`/admin/restaurants/${smokeRestaurantID}/account`, {
      method: 'POST',
      admin: adminToken,
      body: { email, password },
    });

    const restaurantLogin = await request('/restaurant/login', {
      method: 'POST',
      body: { email, password },
    });
    assert.ok(restaurantLogin.token, 'restaurant login must return token');

    const createdDish = await request('/restaurant/dishes', {
      method: 'POST',
      token: restaurantLogin.token,
      body: {
        name: 'Смоук-паста',
        description: 'Блюдо для автоматической проверки',
        price: 490,
        tags: ['тест'],
        image_url: '',
        category: 'Основное',
        sort_order: 1,
      },
    });
    assert.equal(createdDish.restaurant_id, smokeRestaurantID);

    const publicPlace = await request(`/public/restaurants/${slug}`);
    assert.equal(publicPlace.id, smokeRestaurantID);
    assert.ok(publicPlace.dishes.some((dish) => dish.dish_id === createdDish.dish_id));

    const restaurantRoom = await request('/rooms', {
      method: 'POST',
      body: { city: 'Тольятти', restaurant_slug: slug, source: 'qr' },
    });
    assert.equal(restaurantRoom.mode, 'restaurant');
    assert.equal(restaurantRoom.restaurant_slug, slug);

    const guestA = await request(`/rooms/${restaurantRoom.code}/join`, {
      method: 'POST',
      body: { name: 'Smoke QR 1' },
    });
    const guestB = await request(`/rooms/${restaurantRoom.code}/join`, {
      method: 'POST',
      body: { name: 'Smoke QR 2' },
    });

    const restaurantCatalog = await request(`/rooms/${restaurantRoom.code}/catalog`, {
      token: guestA.token,
    });
    assert.ok(restaurantCatalog.length > 0, 'restaurant catalog must not be empty');
    assert.ok(
      restaurantCatalog.every((dish) => dish.restaurant_id === smokeRestaurantID),
      'restaurant room catalog must contain only its own dishes',
    );

    const guestASocket = connect(`${wsURLBase}?room=${restaurantRoom.code}&token=${guestA.token}`);
    const guestBSocket = connect(`${wsURLBase}?room=${restaurantRoom.code}&token=${guestB.token}`);
    await Promise.all([guestASocket.opened, guestBSocket.opened]);
    await Promise.all([
      guestASocket.next((message) => message.type === 'participants'),
      guestBSocket.next((message) => message.type === 'participants'),
    ]);

    guestASocket.send({ type: 'swipe', dish_id: createdDish.dish_id, liked: true });
    await Promise.all([
      guestASocket.next((message) => message.type === 'match' && message.dish_id === createdDish.dish_id),
      guestBSocket.next((message) => message.type === 'match' && message.dish_id === createdDish.dish_id),
    ]);
    guestBSocket.send({ type: 'swipe', dish_id: createdDish.dish_id, liked: true });

    const selection = await request(`/rooms/${restaurantRoom.code}/selection`, {
      token: guestA.token,
    });
    assert.equal(selection.room.mode, 'restaurant');
    assert.ok(
      selection.dishes.some((dish) => dish.dish_id === createdDish.dish_id),
      'selection must include matched dish',
    );
    assert.equal(selection.booking, null);

    const booking = await request('/bookings', {
      method: 'POST',
      token: guestA.token,
      body: {
        name: 'Smoke Booking',
        phone: '+79990000000',
        party_size: 2,
        comment: 'smoke booking',
      },
    });
    assert.equal(booking.restaurant_id, smokeRestaurantID);
    assert.equal(booking.status, 'new');
    assert.ok(booking.dishes.some((dish) => dish.dish_id === createdDish.dish_id));

    await expectError(
      '/bookings',
      {
        method: 'POST',
        token: guestB.token,
        body: {
          name: 'Smoke Hijack',
          phone: '+79991111111',
          party_size: 4,
          comment: 'must not overwrite another participant booking',
        },
      },
      409,
    );

    const selectionWithBooking = await request(`/rooms/${restaurantRoom.code}/selection`, {
      token: guestB.token,
    });
    assert.equal(selectionWithBooking.booking?.id, booking.id);

    const restaurantBookings = await request('/restaurant/bookings', {
      token: restaurantLogin.token,
    });
    assert.ok(restaurantBookings.some((item) => item.id === booking.id));

    const confirmedBooking = await request(`/restaurant/bookings/${booking.id}`, {
      method: 'PATCH',
      token: restaurantLogin.token,
      body: { status: 'confirmed' },
    });
    assert.equal(confirmedBooking.status, 'confirmed');

    const analytics = await request('/restaurant/analytics', {
      token: restaurantLogin.token,
    });
    assert.ok(analytics.summary.bookings >= 1, 'analytics must count booking');
    assert.ok(analytics.summary.matches >= 1, 'analytics must count match');

    const adminBookings = await request('/admin/bookings', { admin: adminToken });
    assert.ok(adminBookings.some((item) => item.id === booking.id));

    const salesLead = await request('/sales-leads', {
      method: 'POST',
      body: {
        restaurant_name: `Smoke Sales ${suffix}`,
        contact_name: 'Smoke',
        phone: '+79990000000',
        email,
        city: 'Тольятти',
        message: 'smoke sales lead',
      },
    });
    assert.equal(salesLead.ok, true);

    const salesLeads = await request('/admin/sales-leads', { admin: adminToken });
    const storedSalesLead = salesLeads.find((item) => item.id === salesLead.id);
    assert.ok(storedSalesLead, 'sales lead must be visible in admin list');

    const updatedSalesLead = await request(`/admin/sales-leads/${salesLead.id}`, {
      method: 'PATCH',
      admin: adminToken,
      body: { status: 'contacted' },
    });
    assert.equal(updatedSalesLead.status, 'contacted');

    const metrics = await request('/admin/metrics', { admin: adminToken });
    assert.ok(metrics.restaurants >= 1);
    assert.ok(metrics.bookings >= 1);

    const newPassword = 'smoke-pass-456';
    await request('/restaurant/change-password', {
      method: 'POST',
      token: restaurantLogin.token,
      body: { current_password: password, new_password: newPassword },
    });
    await expectError('/restaurant/me', { token: restaurantLogin.token }, 401);
    const relogin = await request('/restaurant/login', {
      method: 'POST',
      body: { email, password: newPassword },
    });
    assert.ok(relogin.token, 'restaurant must be able to log in with the new password');

    guestASocket.close();
    guestBSocket.close();
    console.log(
      `smoke ok: room=${room.code} stops=${route.stops.length} lead=${stored.id} restaurant_room=${restaurantRoom.code} booking=${booking.id}`,
    );
  } finally {
    if (smokeRestaurantID) {
      await request(`/admin/restaurants/${smokeRestaurantID}`, {
        method: 'PATCH',
        admin: adminToken,
        body: { active: false },
      }).catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
