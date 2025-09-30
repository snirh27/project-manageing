import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import {
	listProjects,
	getProject,
	createProject,
	updateProject,
	deleteProject,
	validateProjectInput
} from './projectsStore.js';

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static frontend
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Basic health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Projects API
app.get('/api/projects', (req, res) => {
	const { category } = req.query;
	const items = listProjects({ categoryId: category });
	res.json(items);
});

app.get('/api/projects/:id', (req, res) => {
	const project = getProject(req.params.id);
	if (!project) return res.status(404).json({ error: 'Not found' });
	res.json(project);
});

app.post('/api/projects', (req, res) => {
	const check = validateProjectInput(req.body);
	if (!check.valid) return res.status(400).json({ errors: check.errors });
	const created = createProject(req.body);
	res.status(201).json(created);
});

app.put('/api/projects/:id', (req, res) => {
	const check = validateProjectInput(req.body, { partial: true });
	if (!check.valid) return res.status(400).json({ errors: check.errors });
	const updated = updateProject(req.params.id, req.body);
	if (!updated) return res.status(404).json({ error: 'Not found' });
	res.json(updated);
});

app.delete('/api/projects/:id', (req, res) => {
	const ok = deleteProject(req.params.id);
	if (!ok) return res.status(404).json({ error: 'Not found' });
	res.status(204).end();
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


