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
    // Read file to Image, then draw to canvas to compress/resize
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    // Create image element
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
            <p>${project.description ?? ''}</p>
            <p class="muted">קטגוריה: ${project.categoryId}</p>
			<div class="card-actions">
				<button data-action="edit" data-id="${project.id}">עריכה</button>
				<button data-action="delete" data-id="${project.id}">מחיקה</button>
			</div>
		</div>
	`;
	return card;
}

async function renderGrid() {
	const app = document.getElementById('app');
	app.innerHTML = '';

	const grid = document.createElement('div');
	grid.className = 'grid';
	app.appendChild(grid);

	try {
		const projects = await fetchProjects();
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

document.addEventListener('DOMContentLoaded', renderGrid);

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
                // Resize/compress to ensure request size is small enough
                return fileToDataUrlResized(file, { maxWidth: 1200, quality: 0.8 });
            }
            // Fallback placeholder
            return 'https://picsum.photos/seed/placeholder/600/400';
        })();

        const payload = { name, description, imageUrl, categoryId: 0 };
        try {
            await createProjectApi(payload);
            closeModal();
            await renderGrid();
        } catch (err) {
            msg.textContent = 'שגיאה ביצירה';
            console.error(err);
        }
    });

    // Delete handler (event delegation on #app)
    const appRoot = document.getElementById('app');
    appRoot?.addEventListener('click', async (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        // Edit
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
    });
});

// Edit modal logic
function openEditModal(id) {
    const modal = document.getElementById('editModal');
    const form = document.getElementById('modalEditForm');
    const msg = document.getElementById('modalEditMsg');
    const cancelBtn = document.getElementById('cancelEdit');
    const backdrop = modal?.querySelector('[data-close]');

    if (!modal || !form) return;
    msg.textContent = '';

    // Prefill from current card data in DOM
    const card = document.querySelector(`button[data-action="edit"][data-id="${id}"]`)?.closest('.card');
    const title = card?.querySelector('.card-title')?.textContent || '';
    const img = card?.querySelector('img')?.getAttribute('src') || '';

    form.querySelector('#e_id').value = id;
    form.querySelector('#e_name').value = title;
    form.querySelector('#e_description').value = ''; // user can retype; we didn't render desc on card
    form.querySelector('#e_imageUrl').value = img;

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
        let imageUrl = String(fd.get('imageUrl') || '').trim();

        const file = fd.get('image');
        if (file && file instanceof File && file.size > 0) {
            imageUrl = await fileToDataUrlResized(file, { maxWidth: 1200, quality: 0.8 });
        }
        // Build partial payload: include only provided fields
        const payload = {};
        if (name) payload.name = name;
        if (description) payload.description = description;
        if (imageUrl) payload.imageUrl = imageUrl;
        if (!payload.imageUrl && (file && file instanceof File && file.size > 0)) {
            // already handled above; this branch won't execute
        } else if (!payload.imageUrl) {
            // if user left both empty, use a random placeholder
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


