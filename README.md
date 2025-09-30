# Projects Manager

Run: `npm install && npm start` (port 3000)

Backend: Node + Express (in-memory)
Frontend: HTML/CSS/JS (served by Express)

## API
- GET `/api/projects?category=ID`
- GET `/api/projects/:id`
- POST `/api/projects`
- PUT `/api/projects/:id`
- DELETE `/api/projects/:id`

## Fields
- `id` (auto), `name`, `description`, `imageUrl`, `categoryId`
