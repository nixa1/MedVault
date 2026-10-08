const $ = (selector, root = document) => root.querySelector(selector);

const state = {
  token: localStorage.getItem('medvault_token'),
  user: JSON.parse(localStorage.getItem('medvault_user') || 'null'),
  page: 'dashboard',
  reportDays: 30,
};

const icons = {
  dashboard: '<path d="M3 12 12 4l9 8M5 10v10h5v-6h4v6h5V10" />',
  medicines: '<rect x="3" y="8" width="18" height="8" rx="4" /><path d="M12 8v8" />',
  batches: '<path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="m3 13 9 5 9-5" />',
  suppliers: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />',
  movements: '<path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" />',
  reports: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h6" />',
  plus: '<path d="M12 5v14M5 12h14" />',
  search: '<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" />',
  alert: '<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />',
  clock: '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />',
  out: '<path d="M12 20V9m0 0-4 4m4-4 4 4M5 4h14" />',
  close: '<path d="M6 6l12 12M18 6 6 18" />',
};

const pages = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your pharmacy stock' },
  medicines: { title: 'Medicines', subtitle: 'Product catalog and minimum stock levels' },
  batches: { title: 'Batches & expiry', subtitle: 'What is on the shelves and when it expires' },
  suppliers: { title: 'Suppliers', subtitle: 'Companies you receive deliveries from' },
  movements: { title: 'Movements', subtitle: 'Receipts, issues and write-offs' },
  reports: { title: 'Reports', subtitle: 'Expiring and low-stock reports with export' },
};

const movementTypes = {
  Receipt: ['Receipt', 'green'],
  Issue: ['Issue', 'blue'],
  WriteOff: ['Write-off', 'amber'],
};

const dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Solution', 'Injection', 'Ointment', 'Drops', 'Powder', 'Other'];

const icon = (name) => `<svg viewBox="0 0 24 24">${icons[name]}</svg>`;

const isAdmin = () => state.user?.role === 'Admin';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  const utc = /Z|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z';
  return new Date(utc).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value) {
  return Number(value).toLocaleString('en-GB', { style: 'currency', currency: 'EUR' });
}

function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(date) - today) / 86400000);
}

function expiryBadge(date) {
  const days = daysUntil(date);
  if (days < 0) return '<span class="badge red">Expired</span>';
  if (days <= 30) return `<span class="badge amber">${days === 0 ? 'Today' : `${days} days left`}</span>`;
  return '<span class="badge green">OK</span>';
}

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 3500);
}

function readError(status, text) {
  try {
    const data = JSON.parse(text);
    if (typeof data === 'string') return data;
    if (data.error) return data.error;
    if (data.title) return data.title;
  } catch {}
  if (status === 403) return 'You do not have permission for this action.';
  if (status >= 500) return 'Something went wrong on the server. Please check the data and try again.';
  return text || 'Request failed.';
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401 && state.token) {
    logout();
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!response.ok) {
    throw new Error(readError(response.status, await response.text()));
  }

  return response;
}

async function api(path, options) {
  const response = await request(path, options);
  return response.status === 204 ? null : response.json();
}

async function download(path, fileName) {
  try {
    const response = await request(path);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(`${fileName} downloaded`);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function logout() {
  localStorage.removeItem('medvault_token');
  localStorage.removeItem('medvault_user');
  state.token = null;
  state.user = null;
  $('#app').classList.add('hidden');
  $('#login').classList.remove('hidden');
}

function boot() {
  if (!state.token || isTokenExpired(state.token)) {
    logout();
    return;
  }

  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');

  const name = state.user?.name || 'User';
  $('#userName').textContent = name;
  $('#userRole').textContent = state.user?.role || '';
  $('#avatar').textContent = name.charAt(0).toUpperCase();

  renderNav();
  render('dashboard');
}

function renderNav(lowStockCount) {
  $('#nav').innerHTML = Object.entries(pages)
    .map(([key, page]) => {
      const count = key === 'reports' && lowStockCount ? `<span class="count">${lowStockCount}</span>` : '';
      return `<button class="nav ${key === state.page ? 'active' : ''}" data-page="${key}">
        ${icon(key)}<span class="label">${page.title}</span>${count}
      </button>`;
    })
    .join('');

  document.querySelectorAll('.nav').forEach((btn) => {
    btn.onclick = () => render(btn.dataset.page);
  });
}

function setActions(html) {
  $('#pageActions').innerHTML = html;
}

async function render(page) {
  state.page = page;
  document.querySelectorAll('.nav').forEach((b) => b.classList.toggle('active', b.dataset.page === page));

  $('#pageTitle').textContent = pages[page].title;
  $('#pageSubtitle').textContent = pages[page].subtitle;
  setActions('');

  const content = $('#content');
  content.innerHTML = '<div class="loading">Loading…</div>';

  try {
    const renderers = {
      dashboard: renderDashboard,
      medicines: renderMedicines,
      batches: renderBatches,
      suppliers: renderSuppliers,
      movements: renderMovements,
      reports: renderReports,
    };
    await renderers[page](content);
  } catch (err) {
    if (!state.token) return;
    content.innerHTML = `<div class="panel empty"><b>Could not load data</b>${esc(err.message)}
      <div><button class="btn" onclick="render('${page}')">Try again</button></div></div>`;
  }
}

function emptyState(title, text, action = '') {
  return `<div class="empty"><b>${title}</b>${text}${action ? `<div>${action}</div>` : ''}</div>`;
}

function table(columns, rows) {
  const head = columns.map((c) => `<th class="${c.num ? 'num' : ''}">${c.title}</th>`).join('');
  const body = rows
    .map((row) => '<tr>' + row.map((v, i) => `<td class="${columns[i].num ? 'num' : ''}">${v}</td>`).join('') + '</tr>')
    .join('');
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

async function renderDashboard(content) {
  const [summary, expiring, lowStock] = await Promise.all([
    api('/api/reports/summary'),
    api('/api/reports/expiring?days=30'),
    api('/api/reports/low-stock'),
  ]);

  renderNav(lowStock.length);

  const stat = (label, value, hint, iconName, color = '') => `
    <div class="panel stat">
      <div class="stat-icon ${color}">${icon(iconName)}</div>
      <div><span>${label}</span><strong>${value}</strong><small>${hint}</small></div>
    </div>`;

  const actionCard = (title, text, iconName, onclick) => `
    <button class="panel action-card" onclick="${onclick}">
      <div class="stat-icon">${icon(iconName)}</div>
      <div><b>${title}</b><small>${text}</small></div>
    </button>`;

  const expiringList = expiring.length
    ? expiring
        .slice(0, 6)
        .map(
          (b) => `<div class="list-row">
            <div><b>${esc(b.medicine)}</b><small class="muted">Batch ${esc(b.number)} · ${b.quantity} units</small></div>
            ${expiryBadge(b.expiry)}
          </div>`,
        )
        .join('')
    : emptyState('Nothing expires soon', 'No batches expire in the next 30 days.');

  const lowList = lowStock.length
    ? lowStock
        .slice(0, 6)
        .map(
          (m) => `<div class="list-row">
            <div><b>${esc(m.name)}</b><small class="muted">SKU ${esc(m.sku)}</small></div>
            <span class="badge ${m.current === 0 ? 'red' : 'amber'}">${m.current} / ${m.minStock}</span>
          </div>`,
        )
        .join('')
    : emptyState('Stock levels look good', 'All medicines are above their minimum level.');

  content.innerHTML = `

    <div class="stats">
      ${stat('Medicines', summary.medicines, `${summary.suppliers} supplier${summary.suppliers === 1 ? '' : 's'}`, 'medicines')}
      ${stat('Units in stock', summary.units.toLocaleString('en-GB'), `${summary.batches} active batch${summary.batches === 1 ? '' : 'es'}`, 'box', 'blue')}
      ${stat('Low stock', summary.lowStock, 'at or below minimum', 'alert', 'amber')}
      ${stat('Expiring in 30 days', summary.expiringSoon, `${summary.expired} already expired`, 'clock', 'red')}
    </div>

    <div class="actions">
      ${isAdmin() ? actionCard('Receive delivery', 'Add a new batch to stock', 'truck', "openForm('batch')") : ''}
      ${actionCard('Issue or write off', 'Take units out of stock', 'out', "openForm('movement')")}
      ${isAdmin() ? actionCard('New medicine', 'Add a product to the catalog', 'plus', "openForm('medicine')") : ''}
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>Expiring soon</h3><button class="btn btn-sm" onclick="render('batches')">All batches</button></div>
        ${expiringList}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Low stock</h3><button class="btn btn-sm" onclick="render('reports')">Open report</button></div>
        ${lowList}
      </div>
    </div>`;
}

async function renderMedicines(content) {
  const [medicines, batches] = await Promise.all([api('/api/medicines'), api('/api/batches')]);

  if (isAdmin()) {
    setActions(`<button class="btn btn-primary" onclick="openForm('medicine')">${icon('plus')} Add medicine</button>`);
  }

  const stock = {};
  batches.forEach((b) => (stock[b.medicineId] = (stock[b.medicineId] || 0) + b.quantity));

  if (!medicines.length) {
    content.innerHTML = `<div class="panel">${emptyState(
      'No medicines yet',
      'Add your first product to start tracking stock.',
      isAdmin() ? `<button class="btn btn-primary" onclick="openForm('medicine')">Add medicine</button>` : '',
    )}</div>`;
    return;
  }

  const categories = [...new Set(medicines.map((m) => m.category).filter(Boolean))].sort();

  content.innerHTML = `
    <div class="toolbar">
      <div class="search">${icon('search')}<input id="medSearch" placeholder="Search by name, ingredient or SKU" /></div>
      <select id="medCategory">
        <option value="">All categories</option>
        ${categories.map((c) => `<option>${esc(c)}</option>`).join('')}
      </select>
    </div>
    <div class="panel" id="medTable"></div>`;

  const draw = () => {
    const query = $('#medSearch').value.trim().toLowerCase();
    const category = $('#medCategory').value;

    const filtered = medicines.filter(
      (m) =>
        (!category || m.category === category) &&
        (!query || [m.name, m.ingredient, m.sku].some((v) => v.toLowerCase().includes(query))),
    );

    const rows = filtered.map((m) => {
      const current = stock[m.id] || 0;
      const status =
        current === 0
          ? '<span class="badge red">Out of stock</span>'
          : current <= m.minStock
            ? '<span class="badge amber">Low</span>'
            : '<span class="badge green">In stock</span>';

      return [
        `<b>${esc(m.name)}</b><small>SKU ${esc(m.sku)}</small>`,
        esc(m.ingredient),
        esc(m.form),
        esc(m.category),
        m.prescriptionOnly ? '<span class="badge blue">Rx</span>' : '<span class="badge">OTC</span>',
        current,
        m.minStock,
        status,
      ];
    });

    $('#medTable').innerHTML = rows.length
      ? table(
          [
            { title: 'Medicine' },
            { title: 'Active ingredient' },
            { title: 'Form' },
            { title: 'Category' },
            { title: 'Type' },
            { title: 'In stock', num: true },
            { title: 'Minimum', num: true },
            { title: 'Status' },
          ],
          rows,
        )
      : emptyState('No matches', 'Try a different search or category.');
  };

  $('#medSearch').oninput = draw;
  $('#medCategory').onchange = draw;
  draw();
}

async function renderBatches(content) {
  const batches = await api('/api/batches');

  if (isAdmin()) {
    setActions(`<button class="btn btn-primary" onclick="openForm('batch')">${icon('plus')} Receive delivery</button>`);
  }

  if (!batches.length) {
    content.innerHTML = `<div class="panel">${emptyState(
      'No batches yet',
      'Batches appear here when you receive a delivery.',
      isAdmin() ? `<button class="btn btn-primary" onclick="openForm('batch')">Receive delivery</button>` : '',
    )}</div>`;
    return;
  }

  content.innerHTML = `
    <div class="toolbar">
      <div class="search">${icon('search')}<input id="batchSearch" placeholder="Search by medicine or batch number" /></div>
      <select id="batchFilter">
        <option value="">All batches</option>
        <option value="soon">Expiring in 30 days</option>
        <option value="expired">Expired</option>
        <option value="stock">With stock only</option>
      </select>
    </div>
    <div class="panel" id="batchTable"></div>`;

  const draw = () => {
    const query = $('#batchSearch').value.trim().toLowerCase();
    const filter = $('#batchFilter').value;

    const filtered = batches.filter((b) => {
      const days = daysUntil(b.expiry);
      if (filter === 'soon' && (days < 0 || days > 30)) return false;
      if (filter === 'expired' && days >= 0) return false;
      if (filter === 'stock' && b.quantity === 0) return false;
      if (!query) return true;
      return (b.medicine?.name || '').toLowerCase().includes(query) || b.number.toLowerCase().includes(query);
    });

    const rows = filtered.map((b) => [
      `<b>${esc(b.medicine?.name || '—')}</b>`,
      esc(b.number),
      formatDate(b.expiry),
      expiryBadge(b.expiry),
      b.quantity,
      formatMoney(b.price),
    ]);

    $('#batchTable').innerHTML = rows.length
      ? table(
          [
            { title: 'Medicine' },
            { title: 'Batch' },
            { title: 'Expiry date' },
            { title: 'Status' },
            { title: 'Quantity', num: true },
            { title: 'Unit price', num: true },
          ],
          rows,
        )
      : emptyState('No matches', 'Try a different search or filter.');
  };

  $('#batchSearch').oninput = draw;
  $('#batchFilter').onchange = draw;
  draw();
}

async function renderSuppliers(content) {
  const suppliers = await api('/api/suppliers');

  if (isAdmin()) {
    setActions(`<button class="btn btn-primary" onclick="openForm('supplier')">${icon('plus')} Add supplier</button>`);
  }

  if (!suppliers.length) {
    content.innerHTML = `<div class="panel">${emptyState(
      'No suppliers yet',
      'Add the companies you receive deliveries from.',
      isAdmin() ? `<button class="btn btn-primary" onclick="openForm('supplier')">Add supplier</button>` : '',
    )}</div>`;
    return;
  }

  const rows = suppliers.map((s) => [
    `<b>${esc(s.name)}</b><small>${esc(s.address)}</small>`,
    esc(s.taxId),
    esc(s.contact),
    esc(s.phone),
    s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : '—',
  ]);

  content.innerHTML = `<div class="panel">${table(
    [{ title: 'Company' }, { title: 'Tax ID' }, { title: 'Contact person' }, { title: 'Phone' }, { title: 'Email' }],
    rows,
  )}</div>`;
}

async function renderMovements(content) {
  const movements = await api('/api/stock/movements');

  setActions(`<button class="btn btn-primary" onclick="openForm('movement')">${icon('out')} Issue / write off</button>`);

  if (!movements.length) {
    content.innerHTML = `<div class="panel">${emptyState(
      'No movements yet',
      'Every receipt, issue and write-off will be logged here.',
    )}</div>`;
    return;
  }

  const rows = movements.map((m) => {
    const [label, color] = movementTypes[m.type] || [m.type, ''];
    const sign = m.type === 'Receipt' ? '+' : '−';
    return [
      formatDateTime(m.created),
      `<span class="badge ${color}">${label}</span>`,
      `<b>${esc(m.batch?.medicine?.name || '—')}</b><small>Batch ${esc(m.batch?.number || '—')}</small>`,
      `${sign}${m.quantity}`,
      esc(m.user?.name || '—'),
      esc(m.note || '—'),
    ];
  });

  content.innerHTML = `<div class="panel">${table(
    [
      { title: 'Date' },
      { title: 'Operation' },
      { title: 'Medicine' },
      { title: 'Quantity', num: true },
      { title: 'User' },
      { title: 'Note' },
    ],
    rows,
  )}</div>`;
}

async function renderReports(content) {
  const days = state.reportDays;
  const [expiring, lowStock] = await Promise.all([
    api(`/api/reports/expiring?days=${days}`),
    api('/api/reports/low-stock'),
  ]);

  renderNav(lowStock.length);

  const expiringTable = expiring.length
    ? table(
        [{ title: 'Medicine' }, { title: 'Batch' }, { title: 'Expiry date' }, { title: 'Status' }, { title: 'Quantity', num: true }],
        expiring.map((b) => [`<b>${esc(b.medicine)}</b>`, esc(b.number), formatDate(b.expiry), expiryBadge(b.expiry), b.quantity]),
      )
    : emptyState('Nothing to report', `No batches with stock expire in the next ${days} days.`);

  const lowTable = lowStock.length
    ? table(
        [{ title: 'Medicine' }, { title: 'SKU' }, { title: 'In stock', num: true }, { title: 'Minimum', num: true }],
        lowStock.map((m) => [`<b>${esc(m.name)}</b>`, esc(m.sku), m.current, m.minStock]),
      )
    : emptyState('Nothing to report', 'All medicines are above their minimum level.');

  content.innerHTML = `
    <div class="panel" style="margin-bottom: 20px">
      <div class="panel-head">
        <div>
          <h3>Expiring stock</h3>
          <p class="muted">${expiring.length} batch${expiring.length === 1 ? '' : 'es'} with stock</p>
        </div>
        <div class="report-actions">
          <select id="reportDays" style="width: auto; margin: 0">
            ${[7, 30, 60, 90, 180].map((d) => `<option value="${d}" ${d === days ? 'selected' : ''}>Next ${d} days</option>`).join('')}
          </select>
          <button class="btn btn-sm" id="expCsv">${icon('download')} CSV</button>
          <button class="btn btn-sm" id="expPdf">${icon('download')} PDF</button>
        </div>
      </div>
      ${expiringTable}
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>Low stock</h3>
          <p class="muted">Medicines at or below their minimum level</p>
        </div>
        <div class="report-actions">
          <button class="btn btn-sm" id="lowCsv">${icon('download')} CSV</button>
        </div>
      </div>
      ${lowTable}
    </div>`;

  $('#reportDays').onchange = (e) => {
    state.reportDays = Number(e.target.value);
    render('reports');
  };
  $('#expCsv').onclick = () => download(`/api/reports/expiring.csv?days=${days}`, `expiring-${days}d.csv`);
  $('#expPdf').onclick = () => download(`/api/reports/expiring.pdf?days=${days}`, `expiring-${days}d.pdf`);
  $('#lowCsv').onclick = () => download('/api/reports/low-stock.csv', 'low-stock.csv');
}

function field(name, label, attrs = '', optional = false) {
  return `<label>${label}${optional ? ' <span class="optional">(optional)</span>' : ''}
    <input name="${name}" ${attrs} ${optional ? '' : 'required'} /></label>`;
}

function selectField(name, label, options, placeholder) {
  const opts = options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('');
  return `<label>${label}<select name="${name}" required>
    ${placeholder ? `<option value="" disabled selected>${placeholder}</option>` : ''}${opts}
  </select></label>`;
}

const forms = {
  medicine: {
    title: 'New medicine',
    subtitle: 'Add a product to the catalog',
    async fields() {
      return `
        <div class="form-row">${field('name', 'Name', 'placeholder="e.g. Ibuprofen 400 mg"')}${field('sku', 'SKU', 'placeholder="e.g. IBU-400"')}</div>
        ${field('ingredient', 'Active ingredient', 'placeholder="e.g. Ibuprofen"')}
        <div class="form-row">
          ${selectField('form', 'Form', dosageForms.map((f) => [f, f]), 'Select form')}
          ${field('category', 'Category', 'placeholder="e.g. Pain relief"')}
        </div>
        ${field('minStock', 'Minimum stock', 'type="number" min="0" value="10"')}
        <label class="checkbox"><input type="checkbox" name="prescriptionOnly" /> Prescription only (Rx)</label>`;
    },
    submit: (v) =>
      api('/api/medicines', {
        method: 'POST',
        body: JSON.stringify({
          sku: v.sku,
          name: v.name,
          ingredient: v.ingredient,
          form: v.form,
          category: v.category,
          minStock: Number(v.minStock),
          prescriptionOnly: v.prescriptionOnly === 'on',
        }),
      }),
    success: 'Medicine added',
  },

  supplier: {
    title: 'New supplier',
    subtitle: 'Add a company you receive deliveries from',
    async fields() {
      return `
        ${field('name', 'Company name')}
        <div class="form-row">${field('taxId', 'Tax ID')}${field('contact', 'Contact person')}</div>
        <div class="form-row">${field('phone', 'Phone', 'type="tel"')}${field('email', 'Email', 'type="email"')}</div>
        ${field('address', 'Address')}`;
    },
    submit: (v) => api('/api/suppliers', { method: 'POST', body: JSON.stringify(v) }),
    success: 'Supplier added',
  },

  batch: {
    title: 'Receive delivery',
    subtitle: 'Add a new batch to stock',
    async fields() {
      const [medicines, suppliers] = await Promise.all([api('/api/medicines'), api('/api/suppliers')]);
      if (!medicines.length || !suppliers.length) {
        throw new Error('Add at least one medicine and one supplier first.');
      }
      return `
        ${selectField('medicineId', 'Medicine', medicines.map((m) => [m.id, `${m.name} (${m.sku})`]), 'Select medicine')}
        ${selectField('supplierId', 'Supplier', suppliers.map((s) => [s.id, s.name]), 'Select supplier')}
        <div class="form-row">${field('number', 'Batch number')}${field('expiry', 'Expiry date', 'type="date"')}</div>
        <div class="form-row">
          ${field('quantity', 'Quantity', 'type="number" min="1"')}
          ${field('price', 'Unit price, €', 'type="number" min="0" step="0.01"')}
        </div>`;
    },
    submit: (v) =>
      api('/api/batches', {
        method: 'POST',
        body: JSON.stringify({
          medicineId: Number(v.medicineId),
          supplierId: Number(v.supplierId),
          number: v.number,
          expiry: v.expiry,
          quantity: Number(v.quantity),
          price: Number(v.price),
        }),
      }),
    success: 'Delivery received',
  },

  movement: {
    title: 'Issue or write off',
    subtitle: 'Take units out of a batch',
    async fields() {
      const batches = (await api('/api/batches')).filter((b) => b.quantity > 0);
      if (!batches.length) throw new Error('There are no batches with stock yet.');
      return `
        ${selectField('type', 'Operation', [
          ['issue', 'Issue (dispense to pharmacy / customer)'],
          ['write-off', 'Write-off (damaged, expired, lost)'],
        ])}
        ${selectField(
          'batchId',
          'Batch',
          batches.map((b) => [b.id, `${b.medicine?.name || 'Medicine'} · ${b.number} · ${b.quantity} left`]),
          'Select batch',
        )}
        ${field('quantity', 'Quantity', 'type="number" min="1"')}
        ${field('note', 'Note', 'placeholder="e.g. Order #1024"', true)}`;
    },
    submit: (v) =>
      api(`/api/stock/${v.type}`, {
        method: 'POST',
        body: JSON.stringify({ batchId: Number(v.batchId), quantity: Number(v.quantity), note: v.note || null }),
      }),
    success: 'Stock updated',
  },
};

async function openForm(type) {
  const form = forms[type];

  let fieldsHtml;
  try {
    fieldsHtml = await form.fields();
  } catch (err) {
    toast(err.message, 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal" role="dialog">
      <div class="modal-head">
        <div><h3>${form.title}</h3><p class="muted">${form.subtitle}</p></div>
        <button class="icon-btn" data-close>${icon('close')}</button>
      </div>
      <form novalidate>
        ${fieldsHtml}
        <p class="form-error"></p>
        <div class="modal-foot">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>`;

  const close = () => {
    modal.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };

  modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  modal.addEventListener('mousedown', (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(modal);
  modal.querySelector('input, select')?.focus();

  const formEl = $('form', modal);
  formEl.onsubmit = async (e) => {
    e.preventDefault();
    const errorEl = $('.form-error', modal);

    if (!formEl.checkValidity()) {
      errorEl.textContent = 'Please fill in all required fields.';
      formEl.reportValidity();
      return;
    }

    const submitBtn = $('button[type=submit]', modal);
    submitBtn.disabled = true;
    errorEl.textContent = '';

    try {
      await form.submit(Object.fromEntries(new FormData(formEl)));
      close();
      toast(form.success);
      render(state.page);
    } catch (err) {
      errorEl.textContent = err.message;
      submitBtn.disabled = false;
    }
  };
}

$('#loginForm').onsubmit = async (e) => {
  e.preventDefault();
  $('#loginError').textContent = '';

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('#email').value, password: $('#password').value }),
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('medvault_token', data.token);
    localStorage.setItem('medvault_user', JSON.stringify(data.user));
    boot();
  } catch {
    $('#loginError').textContent = 'Incorrect email or password.';
  }
};

$('#logout').onclick = logout;

boot();
