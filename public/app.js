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
                // Convert to data URL for in-memory storage
                const reader = new FileReader();
                const result = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                return String(result);
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


