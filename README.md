# visual-symptom-simulator

Lets patients recreate transient visual symptoms by layering adjustable filters over images, so a clinician can capture what they see. See [DESIGN.md](DESIGN.md).

## Development

Requirements: Node 20+, Go 1.25+.

```sh
# Frontend (http://localhost:5173, proxies /api to :8080)
cd frontend && npm install && npm run dev

# Backend (http://localhost:8080)
cd backend && go run ./cmd/server

# Database setup
docker compose up -d
```

Check it worked:

```sh
docker compose ps
docker exec -it vss-db psql -U vss -d vss -c "\dt"

```

### Updating scenes (reseed)

After pulling new scenes, add them to your database:

```sh
docker exec -i vss-db psql -v ON_ERROR_STOP=1 -U vss -d vss < backend/seeds/seed.sql
```

The seed is safe to run again, it only adds new scenes and updates ones that changed.

To hide a scene without deleting it:

```sh
docker exec -it vss-db psql -U vss -d vss -c "UPDATE scenes SET is_active = false WHERE name = 'Scene name';"
```

To start the database over from scratch (this deletes everything in it, the tables and seed get recreated automatically):

```sh
docker compose down -v
docker compose up -d
```

After a reset the test user gets a new id, so update `SEED_USER_ID` in your `.env` with:

```sh
docker exec -it vss-db psql -U vss -d vss -t -c "SELECT id FROM users LIMIT 1;"
```

### Adding a new scene

1. Put the file in `backend/data/images/` or `backend/data/videos/` (16:9, ex. 1280x720, videos as mp4)
2. Add a row for it in `backend/seeds/seed.sql`
3. Run the reseed command above

## Postman API Testing

- Import Visual Symptom Simulator API.postman_test_run.json into Postman and run entire folder

### Wednesday prototype notes

- Because auth is not set up yet, testing was done with a seeded user ID in the .env file. It will always use the same user.
- When auth is set up, remove everything that has the "auth" keyword.
- router.go is pretty bloated right now, so functions should be split into respective files eventually.

## Shader sandbox (dev only)

With the frontend running, open http://localhost:5173/sandbox to try symptom shaders with live sliders. Shader files live in `frontend/src/rendering/shaders/`.