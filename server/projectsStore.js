// Simple in-memory projects store with basic validation

let nextId = 1;
/** @type {Array<{id:number,name:string,description:string,imageUrl:string,categoryId:string}>} */
const projects = [];

// Hebrew categories
const CATEGORIES = ['מזון', 'אורח חיים', 'מחשבים', 'ספורט', 'אחר'];

function isNonEmptyString(value) {
	return typeof value === 'string' && value.trim().length > 0;
}

function isValidUrl(value) {
	if (!isNonEmptyString(value)) return false;
	// Allow data URL images from client-side uploads
	if (value.startsWith('data:image/')) return true;
	try {
		const u = new URL(value);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

export function validateProjectInput(input, { partial = false } = {}) {
	const errors = {};
	const checkField = (key, predicate, message) => {
		if (!(key in input)) {
			if (!partial) errors[key] = 'Required';
			return;
		}
		if (!predicate(input[key])) errors[key] = message;
	};

	checkField('name', isNonEmptyString, 'Must be a non-empty string');
	checkField('description', isNonEmptyString, 'Must be a non-empty string');
	checkField('imageUrl', (v) => isNonEmptyString(v) && isValidUrl(v), 'Must be a valid URL');
	checkField('categoryId', (v) => CATEGORIES.includes(v), 'Must be a valid category');

	return { valid: Object.keys(errors).length === 0, errors };
}

export function listProjects({ categoryId } = {}) {
	if (categoryId === undefined) return [...projects];
	return projects.filter((p) => p.categoryId === categoryId);
}

export function getProject(id) {
	const pid = Number(id);
	return projects.find((p) => p.id === pid) || null;
}

export function createProject({ name, description, imageUrl, categoryId }) {
	const project = {
		id: nextId++,
		name: name.trim(),
		description: description.trim(),
		imageUrl: imageUrl.trim(),
		categoryId: String(categoryId)
	};
	projects.push(project);
	return project;
}

export function updateProject(id, updates) {
	const pid = Number(id);
	const idx = projects.findIndex((p) => p.id === pid);
	if (idx === -1) return null;
	const current = projects[idx];
	const next = { ...current };
	if (updates.name !== undefined) next.name = String(updates.name).trim();
	if (updates.description !== undefined) next.description = String(updates.description).trim();
	if (updates.imageUrl !== undefined) next.imageUrl = String(updates.imageUrl).trim();
	if (updates.categoryId !== undefined) next.categoryId = String(updates.categoryId);
	projects[idx] = next;
	return next;
}

export function deleteProject(id) {
	const pid = Number(id);
	const idx = projects.findIndex((p) => p.id === pid);
	if (idx === -1) return false;
	projects.splice(idx, 1);
	return true;
}

export { CATEGORIES };



