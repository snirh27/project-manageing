async function api(path, options = {}) {
	const res = await fetch(path, {
		headers: { 'Content-Type': 'application/json' },
		...options
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`HTTP ${res.status}: ${text}`);
	}
	return res.json();
}

async function fileToDataUrlResized(file, { maxWidth = 1200, quality = 0.8 } = {}) {
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
    });
    const scale = Math.min(1, maxWidth / img.width || 1);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
}

async function fetchProjects(categoryId) {
    const q = categoryId != null ? `?category=${encodeURIComponent(categoryId)}` : '';
	return api(`/api/projects${q}`);
}

async function fetchCategories() {
    return api('/api/categories');
}

async function createProjectApi(payload) {
	return api('/api/projects', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

async function deleteProjectApi(id) {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
}

async function updateProjectApi(id, payload) {
    return api(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

function createStars(rating) {
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    return `<span class="stars">${stars}</span>`;
}

function createProjectCard(project) {
	const card = document.createElement('div');
	card.className = 'card';
	card.dir = 'rtl';
	card.innerHTML = `
		<div class="card-image">
			<img src="${project.imageUrl}" alt="${project.name}">
		</div>
		<div class="card-body">
			<h3 class="card-title">${project.name}</h3>
            <p class="project-id">מספר פרויקט: ${project.id}</p>
            <p>${project.description ?? ''}</p>
            <p class="muted">קטגוריה: ${project.categoryId}</p>
            <div class="rating">דירוג: ${createStars(project.rating || 1)}</div>
			<div class="card-actions">
				<button data-action="edit" data-id="${project.id}">עריכה</button>
				<button data-action="delete" data-id="${project.id}">מחיקה</button>
			</div>
		</div>
		<div class="card-tooltip">לפתיחה לחץ כאן</div>
	`;
	return card;
}

async function fetchProjectById(id) {
    return api(`/api/projects/${id}`);
}

function openDetailsModal(project) {
    const modal = document.getElementById('detailsModal');
    const card = document.getElementById('detailsCard');
    if (!modal || !card) return;
    
    // Store project data on the modal for later use
    modal.dataset.projectId = project.id;
    
    card.innerHTML = `
        <div class="card-image"><img src="${project.imageUrl}" alt="${project.name}"></div>
        <div class="card-body">
            <h3 class="card-title">${project.name}</h3>
            <p class="project-id">מספר פרויקט: ${project.id}</p>
            <p>${project.description ?? ''}</p>
            <p class="muted">קטגוריה: ${project.categoryId}</p>
            <div class="rating">דירוג: ${createStars(project.rating || 1)}</div>
            <div class="rating-control">
                <label>דרג פרויקט:</label>
                <select id="ratingSelect">
                    <option value="1" ${project.rating === 1 ? 'selected' : ''}>1 כוכב</option>
                    <option value="2" ${project.rating === 2 ? 'selected' : ''}>2 כוכבים</option>
                    <option value="3" ${project.rating === 3 ? 'selected' : ''}>3 כוכבים</option>
                    <option value="4" ${project.rating === 4 ? 'selected' : ''}>4 כוכבים</option>
                    <option value="5" ${project.rating === 5 ? 'selected' : ''}>5 כוכבים</option>
                </select>
                <button id="updateRating">עדכן דירוג</button>
            </div>
            <div class="card-actions">
                <button id="detailsClose">חזרה</button>
            </div>
        </div>
    `;
    modal.hidden = false; modal.setAttribute('aria-hidden', 'false');
}

function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (!modal) return;
    modal.hidden = true; modal.setAttribute('aria-hidden', 'true');
    // Ensure routing state resets to grid so future opens work
    if (location.hash.startsWith('#/projects/')) {
        location.hash = '#/';
    }
}

// Add keyboard escape handler
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('detailsModal');
        if (modal && !modal.hidden) {
            closeDetailsModal();
        }
    }
});

// Add specific event handler for details modal
document.addEventListener('click', (e) => {
    const modal = document.getElementById('detailsModal');
    if (!modal || modal.hidden) return;
    
    // Close on backdrop click
    if (e.target.matches('[data-close]')) {
        closeDetailsModal();
        return;
    }
    
    // Close on close button click
    if (e.target.matches('#detailsClose')) {
        closeDetailsModal();
        return;
    }
    
    // Handle rating update
    if (e.target.matches('#updateRating')) {
        const projectId = modal.dataset.projectId;
        if (!projectId) return;
        const rating = Number(document.getElementById('ratingSelect')?.value);
        if (!rating) return;
        
        updateProjectApi(projectId, { rating })
            .then(() => {
                closeDetailsModal();
                return renderGrid();
            })
            .catch(err => {
                alert('שגיאה בעדכון הדירוג');
                console.error(err);
            });
        return;
    }
});

async function renderDetails(id) {
    try {
        const p = await fetchProjectById(id);
        openDetailsModal(p);
    } catch (err) {
        console.error(err);
        alert('שגיאה בטעינת פרטי הפרויקט');
    }
}

async function renderGrid(category = null) {
	const app = document.getElementById('app');
	app.innerHTML = '';

	const grid = document.createElement('div');
	grid.className = 'grid';
	app.appendChild(grid);

    try {
		let projects = await fetchProjects(category);
		// Apply client-side search and sort
		const searchInput = document.getElementById('filterSearch');
		const sortSelect = document.getElementById('sortOrder');
		const query = String(searchInput?.value || '').trim().toLowerCase();
		if (query) {
			projects = projects.filter(p =>
				String(p.name || '').toLowerCase().includes(query) ||
				String(p.description || '').toLowerCase().includes(query) ||
				String(p.id || '').toLowerCase().includes(query)
			);
		}
		const sort = sortSelect?.value || 'rating-desc';
		projects.sort((a, b) => {
			if (sort === 'name-asc') {
				return String(a.name).localeCompare(String(b.name), 'he');
			}
			if (sort === 'newest') {
				return Number(b.id) - Number(a.id);
			}
			// default: rating-desc
			return Number(b.rating || 0) - Number(a.rating || 0);
		});
		if (!projects.length) return; // show nothing when empty
		projects.forEach((p) => grid.appendChild(createProjectCard(p)));
	} catch (err) {
		const errorBox = document.createElement('div');
		errorBox.className = 'card';
		errorBox.dir = 'rtl';
		errorBox.textContent = 'שגיאה בטעינת הנתונים';
		app.appendChild(errorBox);
		console.error(err);
	}
}

function navigate() {
    const hash = location.hash.slice(1);
    const match = hash.match(/^\/projects\/(\d+)$/);
    if (match) {
        const id = match[1];
        renderDetails(id);
    } else {
        // Always render grid when not on a project details page
        const filterSelect = document.getElementById('filterCategory');
        const current = filterSelect?.value || null;
        renderGrid(current || null);
        closeDetailsModal();
    }
}

document.addEventListener('DOMContentLoaded', navigate);
window.addEventListener('hashchange', navigate);

document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('openCreate');
    const modal = document.getElementById('createModal');
    const backdrop = modal?.querySelector('[data-close]');
    const cancelBtn = document.getElementById('cancelCreate');
    const form = document.getElementById('modalCreateForm');
    const msg = document.getElementById('modalFormMsg');

    function openModal() { if (modal) { modal.hidden = false; modal.setAttribute('aria-hidden', 'false'); } }
    function closeModal() { if (modal) { modal.hidden = true; modal.setAttribute('aria-hidden', 'true'); msg.textContent = ''; form?.reset(); } }

    openBtn?.addEventListener('click', openModal);
    backdrop?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';
        const fd = new FormData(form);
        const name = String(fd.get('name') || '').trim();
        const description = String(fd.get('description') || '').trim();
        const file = fd.get('image');

        if (!name || !description) {
            msg.textContent = 'אנא מלא/י שם ותיאור';
            return;
        }

        const imageUrl = await (async () => {
            if (file && file instanceof File && file.size > 0) {
                return fileToDataUrlResized(file, { maxWidth: 1200, quality: 0.8 });
            }
            return 'https://picsum.photos/seed/placeholder/600/400';
        })();

        const categoryId = String(fd.get('category') || '').trim();
        if (!categoryId) {
            msg.textContent = 'אנא בחר/י קטגוריה';
            return;
        }
        const payload = { name, description, imageUrl, categoryId };
        try {
            await createProjectApi(payload);
            closeModal();
            await renderGrid();
        } catch (err) {
            msg.textContent = 'שגיאה ביצירה';
            console.error(err);
        }
    });

    const appRoot = document.getElementById('app');
    appRoot?.addEventListener('click', async (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        if (t.matches('button[data-action="edit"]')) {
            const id = t.getAttribute('data-id');
            if (!id) return;
            openEditModal(id);
            return;
        }
        if (t.matches('button[data-action="delete"]')) {
            const id = t.getAttribute('data-id');
            if (!id) return;
            const ok = confirm('האם למחוק את הפרויקט?');
            if (!ok) return;
            try {
                await deleteProjectApi(id);
                await renderGrid();
            } catch (err) {
                alert('שגיאה במחיקה');
                console.error(err);
            }
        }
        // Details modal events
        if (t.matches('#detailsClose')) {
            closeDetailsModal();
            return;
        }
        if (t.matches('[data-close]')) {
            closeDetailsModal();
            return;
        }
        if (t.matches('#updateRating')) {
            const modal = document.getElementById('detailsModal');
            const projectId = modal?.dataset.projectId;
            if (!projectId) return;
            const rating = Number(document.getElementById('ratingSelect')?.value);
            if (!rating) return;
            try {
                await updateProjectApi(projectId, { rating });
                closeDetailsModal();
                await renderGrid();
            } catch (err) {
                alert('שגיאה בעדכון הדירוג');
                console.error(err);
            }
            return;
        }
        // Card click -> details (but not on buttons or rating controls)
        if (t.closest('.card') && !t.closest('.card-actions') && !t.closest('.rating-control')) {
            const card = t.closest('.card');
            const idBtn = card.querySelector('button[data-id]');
            const id = idBtn?.getAttribute('data-id');
            if (id) {
                const newHash = `#/projects/${id}`;
                // If already on same hash, manually render details (hashchange won't fire)
                if (location.hash === newHash) {
                    await renderDetails(id);
                } else {
                    location.hash = newHash;
                }
                return;
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
	const input = document.getElementById('filterCategory');
	const search = document.getElementById('filterSearch');
	const sort = document.getElementById('sortOrder');
	const trigger = async () => {
		const val = input?.value;
		const category = val === '' ? null : val;
		await renderGrid(category);
	};
	input?.addEventListener('change', trigger);
	search?.addEventListener('input', trigger);
	sort?.addEventListener('change', trigger);
});

// Load categories and populate dropdowns
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const categories = await fetchCategories();
        const filterSelect = document.getElementById('filterCategory');
        const createSelect = document.getElementById('m_category');
        const editSelect = document.getElementById('e_category');
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterSelect?.appendChild(option.cloneNode(true));
            createSelect?.appendChild(option.cloneNode(true));
            editSelect?.appendChild(option.cloneNode(true));
        });
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
});

function openEditModal(id) {
    const modal = document.getElementById('editModal');
    const form = document.getElementById('modalEditForm');
    const msg = document.getElementById('modalEditMsg');
    const cancelBtn = document.getElementById('cancelEdit');
    const backdrop = modal?.querySelector('[data-close]');

    if (!modal || !form) return;
    msg.textContent = '';

    const card = document.querySelector(`button[data-action="edit"][data-id="${id}"]`)?.closest('.card');
    const title = card?.querySelector('.card-title')?.textContent || '';
    const img = card?.querySelector('img')?.getAttribute('src') || '';

    form.querySelector('#e_id').value = id;
    form.querySelector('#e_name').value = title;
	// Prefill description from the card to avoid clearing it on edit
	const descriptionText = card?.querySelector('.card-body p:not(.muted):not(.project-id)')?.textContent || '';
	form.querySelector('#e_description').value = descriptionText;
    form.querySelector('#e_imageUrl').value = img;
    const categoryText = card?.querySelector('.muted')?.textContent?.replace('קטגוריה: ', '') || '';
    form.querySelector('#e_category').value = categoryText;

    function close() { modal.hidden = true; modal.setAttribute('aria-hidden', 'true'); msg.textContent=''; }
    function open() { modal.hidden = false; modal.setAttribute('aria-hidden', 'false'); }

    open();
    const onBackdrop = () => close();
    const onCancel = () => close();
    backdrop?.addEventListener('click', onBackdrop, { once: true });
    cancelBtn?.addEventListener('click', onCancel, { once: true });

    const onSubmit = async (e) => {
        e.preventDefault();
        msg.textContent = '';
        const fd = new FormData(form);
        const pid = fd.get('id');
        const name = String(fd.get('name') || '').trim();
        const description = String(fd.get('description') || '').trim();
        const categoryId = String(fd.get('category') || '').trim();
        let imageUrl = String(fd.get('imageUrl') || '').trim();

        const file = fd.get('image');
        if (file && file instanceof File && file.size > 0) {
            imageUrl = await fileToDataUrlResized(file, { maxWidth: 1200, quality: 0.8 });
        }
        const payload = {};
        if (name) payload.name = name;
        if (description) payload.description = description;
        if (categoryId) payload.categoryId = categoryId;
        if (imageUrl) payload.imageUrl = imageUrl;
        if (!payload.imageUrl && (file && file instanceof File && file.size > 0)) {
        } else if (!payload.imageUrl) {
            payload.imageUrl = `https://picsum.photos/seed/${Date.now()}/600/400`;
        }
        if (!name) { msg.textContent = 'אנא הזן/י שם'; return; }
        const confirmOk = confirm('לאשר עדכון פרויקט?');
        if (!confirmOk) return;
        try {
            await updateProjectApi(pid, payload);
            close();
            await renderGrid();
        } catch (err) {
            msg.textContent = 'שגיאה בעדכון';
            console.error(err);
        }
    };
    form.addEventListener('submit', onSubmit, { once: true });
}


