
const API = 'https://api.freeapi.app/api/v1/public/meals';
const PER_PAGE = 12;

let allMeals = [];
let filtered = [];
let categories = new Set();
let activeCategory = 'All';
let currentPage = 1;
let searchTerm = '';
let sortMode = 'default';

async function fetchMeals() {
  try {
    const res = await fetch(`${API}?limit=100&page=1`);
    const json = await res.json();
    const data = json.data;
    if (data && data.meals) {
      allMeals = data.meals;
    } else if (data && Array.isArray(data)) {
      allMeals = data;
    } else if (json.data && json.data.data) {
      allMeals = json.data.data;
    } else {
      const keys = Object.keys(json);
      for (const k of keys) {
        if (Array.isArray(json[k])) { allMeals = json[k]; break; }
      }
    }
    allMeals.forEach(m => { if (m.strCategory) categories.add(m.strCategory); });
    buildCategoryPills();
    applyFilters();
  } catch(e) {
    document.getElementById('loader').innerHTML = '<p style="color:#c0522a">Failed to load meals. Please check your connection.</p>';
  }
}

function buildCategoryPills() {
  const container = document.getElementById('categoryPills');
  const cats = ['All', ...Array.from(categories).sort()];
  container.innerHTML = cats.map(c =>
    `<button class="pill ${c === activeCategory ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
  container.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      container.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPage = 1;
      applyFilters();
    });
  });
}

function applyFilters() {
  filtered = allMeals.filter(m => {
    const matchCat = activeCategory === 'All' || m.strCategory === activeCategory;
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || (m.strMeal || '').toLowerCase().includes(q)
      || (m.strCategory || '').toLowerCase().includes(q)
      || (m.strArea || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
  if (sortMode === 'az') filtered.sort((a,b) => (a.strMeal||'').localeCompare(b.strMeal||''));
  if (sortMode === 'za') filtered.sort((a,b) => (b.strMeal||'').localeCompare(a.strMeal||''));
  renderPage();
}

function renderPage() {
  const loader = document.getElementById('loader');
  const grid = document.getElementById('grid');
  const empty = document.getElementById('emptyState');
  loader.style.display = 'none';

  if (!filtered.length) { grid.innerHTML = ''; empty.style.display = 'block'; renderPagination(); return; }
  empty.style.display = 'none';

  const total = filtered.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (currentPage > totalPages) currentPage = 1;
  const start = (currentPage - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  document.getElementById('countLabel').textContent = total;
  document.getElementById('categoryLabel').textContent = activeCategory !== 'All' ? `Category: ${activeCategory}` : '';

  grid.innerHTML = slice.map((m, i) => mealCard(m, i)).join('');
  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });
  renderPagination();
}

function mealCard(m, i) {
  const img = m.strMealThumb
    ? `<img class="card-img" src="${m.strMealThumb}" alt="${esc(m.strMeal)}" loading="lazy" />`
    : `<div class="card-img-placeholder">🍽️</div>`;
  const tags = [
    m.strCategory ? `<span class="tag tag-cat">${esc(m.strCategory)}</span>` : '',
    m.strArea    ? `<span class="tag tag-area">${esc(m.strArea)}</span>` : '',
    m.strAlcoholic && m.strAlcoholic !== 'Non alcoholic' ? `<span class="tag tag-alc">${esc(m.strAlcoholic)}</span>` : '',
  ].join('');
  return `<div class="card" data-id="${m.idMeal || m.id || i}" style="animation-delay:${i*0.04}s">
    ${img}
    <div class="card-body">
      <div class="card-tags">${tags}</div>
      <div class="card-title">${esc(m.strMeal)}</div>
      <div class="card-meta">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        ${m.strInstructions ? esc(m.strInstructions.slice(0,70)) + '…' : 'View full recipe'}
      </div>
    </div>
    <div class="card-footer">
      <span class="card-id">#${m.idMeal || '—'}</span>
      <button class="view-btn">View recipe →</button>
    </div>
  </div>`;
}

function openModal(id) {
  const m = allMeals.find(x => String(x.idMeal || x.id) === String(id)) || allMeals[id];
  if (!m) return;

  document.getElementById('modalImg').src = m.strMealThumb || '';
  document.getElementById('modalImg').alt = m.strMeal || '';
  document.getElementById('modalTitle').textContent = m.strMeal || '';

  const tags = [
    m.strCategory ? `<span class="tag tag-cat">${esc(m.strCategory)}</span>` : '',
    m.strArea    ? `<span class="tag tag-area">${esc(m.strArea)}</span>` : '',
  ].join('');
  document.getElementById('modalTags').innerHTML = tags;

  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = m[`strIngredient${i}`];
    const meas = m[`strMeasure${i}`];
    if (ing && ing.trim()) ingredients.push(`${meas ? meas.trim()+' ' : ''}${ing.trim()}`);
  }
  document.getElementById('modalIngredients').innerHTML = ingredients.map(x =>
    `<span class="ingredient">${esc(x)}</span>`).join('');

  const instr = m.strInstructions || '';
  document.getElementById('modalInstructions').textContent = instr;
  document.getElementById('modalInstructionsSection').style.display = instr ? 'block' : 'none';

  const yt = m.strYoutube;
  document.getElementById('modalYoutube').innerHTML = yt
    ? `<a class="youtube-btn" href="${yt}" target="_blank" rel="noopener">▶ Watch on YouTube</a>` : '';

  document.getElementById('modalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PER_PAGE);
  const pag = document.getElementById('pagination');
  if (total <= 1) { pag.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>← Prev</button>`;
  for (let i = 1; i <= total; i++) {
    if (total > 7 && Math.abs(i - currentPage) > 2 && i !== 1 && i !== total) {
      if (i === 2 || i === total - 1) html += `<span style="padding:0 4px;color:var(--muted)">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===total?'disabled':''}>Next →</button>`;
  pag.innerHTML = html;
}

function goPage(n) {
  const total = Math.ceil(filtered.length / PER_PAGE);
  if (n < 1 || n > total) return;
  currentPage = n;
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function esc(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('modalBackdrop')) closeModal();
});
document.getElementById('search').addEventListener('input', e => {
  searchTerm = e.target.value;
  currentPage = 1;
  applyFilters();
});
document.getElementById('sortSelect').addEventListener('change', e => {
  sortMode = e.target.value;
  applyFilters();
});

fetchMeals();
