# Visual Symptom Simulator — Design

## 1. Purpose

Patients with transient visual disturbances often struggle to describe what they see. The Visual Symptom Simulator lets a patient, sitting with their clinician, stack and tune visual filters on top of a reference image until it matches their experience. The clinician then exports the result as an image and files it in the patient's chart.

### Goals
- Recreate a wide range of visual symptoms with intuitive, real-time controls (sliders, draggable regions, toggles).
- Let users combine several symptoms on one image, then toggle and reorder them.
- Export the final simulation: a full-resolution still image (PNG), or a short looping video (MP4/WebM) when animated symptoms are present.
- Work on desktop, tablet, and phone (mouse and touch).

### Non-goals (for now)
- Video as the base media. Simulations are applied to static images only (video *export* is supported, see 4.1.1). 3D scenes may come later.
- Storing any patient data. Clinicians keep their own notes; the exported image is the only artifact.
- Patient accounts. The architecture should not rule them out, though.
- Patient image uploads. Possible future feature, not a priority.

## 2. Users & usage flow

| Role | Access | Notes |
|---|---|---|
| Clinician | Logs in with email + password | ~10 accounts at launch, created by an admin (no public sign-up) |
| Patient | Uses the simulator in-clinic on the clinician's logged-in session | No account, no data stored |
| Admin | Manages clinician accounts, symptom library, base images | Initially via CLI/seed scripts; admin UI is a later option |

**Primary flow**
1. Clinician logs in.
2. Patient (or clinician) picks a base image from the image library.
3. Patient adds symptoms from the library, adjusting each one's parameters until the image matches what they see.
4. Layers can be toggled on/off and reordered to compare.
5. Clinician exports the result (PNG still, or MP4/WebM video for animated symptoms) and attaches it to the patient's file in their own records system.

## 3. Symptom catalogue

Each symptom is a **layer** with typed parameters. The parameters below are a starting point and will be refined with clinical input.

| Symptom | Example parameters | Rendering technique | Animated |
|---|---|---|---|
| Blurry vision | amount, region (whole / center / periphery) | Separable Gaussian blur | No |
| Diplopia (double vision) | offset distance, angle, ghost opacity, horizontal/vertical | Sample image twice with offset and blend | Optional |
| Visual field deficit: homonymous hemianopsia, bitemporal hemianopsia, quadrantanopia, blind spots | pattern preset, edge softness, spot position (draggable), spot size | Procedural mask (half-planes, circles) | No |
| Halos, zigzags (fortification spectra), shimmering lights | position (draggable), size, intensity, shimmer speed, color | Procedural overlay; zigzag arc with time-based flicker | Yes |
| Visual distortions (metamorphopsia, micropsia/macropsia, lines curved, closer/farther) | distortion amount, center (draggable), radius, scale factor | UV warping (radial/barrel/pinch, local scale) | No |
| Oscillopsia | amplitude, frequency, direction | Time-based UV offset | Yes |
| Starbursting | ray count, ray length, brightness threshold, intensity | Bright-pass + directional streak blur | No |
| Loss of contrast | contrast, brightness, haze | Contrast curve / mix toward grey | No |
| Visual snow | density, size, speed, opacity, color vs mono | Time-seeded noise | Yes |
| Blue field entoptic phenomenon | dot count, speed, size, brightness | Moving bright sprites on procedural paths | Yes |
| Trails (palinopsia) | trail length, decay, direction | Repeated faded offset copies (static image: simulated motion) | Optional |
| Central vision loss | position (draggable), size, edge softness, fill (dark/blurred/distorted) | Radial mask + blur/darken | No |
| Color blindness | type (protan/deutan/tritan/achromat), severity | Color matrix transform (e.g. Machado et al. 2009) | No |

Parameter kinds the UI must support: **range** (slider), **position** (drag a point on the image), **toggle**, **select**, and **color**. These are defined in [frontend/src/symptoms/types.ts](frontend/src/symptoms/types.ts).

## 4. Architecture

```
┌──────────────────────── Browser ────────────────────────┐
│ React (Vite + TS)                                       │
│  ├─ UI: symptom stack, parameter controls, image picker │
│  ├─ Simulator state: base image + ordered layers        │
│  └─ WebGL renderer: one shader pass per layer → canvas  │
│                       │ export → PNG download           │
└───────────────────────┼─────────────────────────────────┘
                        │ /api (JSON, session cookie)
┌───────────────────────▼─────────────────────────────────┐
│ Go (net/http)                                           │
│  ├─ auth: clinician login, sessions                     │
│  ├─ symptoms: filter definition library                 │
│  ├─ images: base image library (metadata + files)       │
│  └─ storage: repository interfaces → DB (TBD)           │
└─────────────────────────────────────────────────────────┘
```

All image processing happens **client-side on the GPU**. The server never sees the patient's simulated image. This keeps hosting cheap (static files plus a small API, no server GPU) and keeps patient-related output off the server entirely.

### 4.1 Frontend

- **Stack:** React 19, TypeScript, Vite, React Router, PixiJS v8 (WebGL renderer).
- **Rendering:** WebGL2 fragment shaders, run through PixiJS. Pixi owns the WebGL context, textures, framebuffers, and uniform uploads; we write the GLSL.
  - One `.frag` file per symptom in `src/rendering/shaders/`, loaded with Vite's `?raw` import and wrapped in a Pixi `Filter` (paired with Pixi's `defaultFilterVert`).
  - Each parameter maps 1:1 to a uniform `u_<paramKey>`.
  - The base image is a Pixi `Sprite`; the layer stack is its `filters` array, which Pixi runs as a chain of passes (ping-ponging pooled render textures). Reordering layers reorders the array; toggling a layer sets `filter.enabled`.
  - The Pixi app is created with `preference: 'webgl'`. Shaders are GLSL only, so the WebGPU and Canvas renderers are not supported.
  - The render loop runs continuously only when an animated layer is enabled; otherwise it renders on change.
  - Export renders the filtered sprite at the base image's native resolution into a `RenderTexture`, then extracts it (`renderer.extract`) and encodes a PNG blob. Animated layers export the current frame. Video export is covered in 4.1.1.
  - A dev-only `/sandbox` route (`src/features/sandbox/`) is a playground for trying individual shaders with live uniform sliders.
- **Why WebGL over Canvas 2D/CSS:** distortion (UV warping), animated effects, and stacking many layers need per-pixel GPU work to stay smooth while sliders move. Canvas 2D per-pixel loops stutter on large images, and CSS filters can't do warping. Pixi handles the WebGL plumbing so effort goes into the shaders; the GLSL is also reusable if 3D (three.js) is added later.
- **Input:** Pointer Events (unified mouse/touch/pen) for draggable position parameters. Responsive layout for phone, tablet, and desktop.
- **State:** React state/context for the simulator. Symptom definitions and image list are fetched from the API. No global state library unless needed.

#### 4.1.1 Video export

Animated symptoms (oscillopsia, visual snow, shimmering lights, blue field, etc.) can be exported as a short looping video. Like everything else, this happens in the browser, so there is no backend involvement and no extra hosting cost.

- **Format:** MP4 (H.264) by default for the widest playback support. WebM (VP9) is the fallback on browsers that can't encode MP4. GIF is intentionally not supported.
- **Frame-accurate capture:** recording does not rely on the live, real-time render loop. The renderer steps `u_time` by a fixed amount per frame (e.g. 1/30 s), renders each frame offscreen, and encodes it with the WebCodecs `VideoEncoder`. A small muxer library (e.g. `mp4-muxer` / `webm-muxer`) packages the frames into a file. The output is smooth even on slower devices.
- **Determinism:** animated shaders must depend only on `u_time` and their parameters (no `Math.random()` per frame on the CPU), so a recording exactly matches what the patient approved.
- **Options:** duration (e.g. 3–10 s), resolution (native or a capped size such as 1080p to keep files small), frame rate (30 fps default).
- **Fallback:** if WebCodecs is unavailable, record the canvas live via `canvas.captureStream()` + `MediaRecorder`.
- **UI:** the export action offers "Image (PNG)" and, when any enabled layer is animated, "Video". It shows progress during encoding.

### 4.2 Backend

- **Stack:** Go 1.25+, standard library `net/http` (method + path-param routing), minimal dependencies.
- **Responsibilities:**
  1. **Auth.** Email + password login, passwords hashed with argon2id/bcrypt, server-side sessions in an HttpOnly, Secure, SameSite=Lax cookie. No public registration; accounts are seeded by an admin.
  2. **Symptom library.** Serves `SymptomDefinition` JSON (id, name, description, category, params with ranges/defaults). Lets parameter ranges and descriptions change without a frontend redeploy. Shader code stays in the frontend.
  3. **Base image library.** Metadata (title, category, alt text, dimensions) plus image files served from `IMAGE_DIR` (later object storage).
- **Storage:** Engine **undecided**. Packages depend on interfaces in `internal/storage`, so PostgreSQL or SQLite can be plugged in later.

### 4.3 API (draft)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Liveness check |
| POST | `/api/auth/login` | — | `{email, password}` → sets session cookie |
| POST | `/api/auth/logout` | clinician | Clears session |
| GET | `/api/auth/me` | clinician | Current clinician |
| GET | `/api/symptoms` | clinician | List symptom definitions |
| GET | `/api/images` | clinician | List base images (metadata) |
| GET | `/api/images/{id}` | clinician | Image file |

### 4.4 Data model (draft)

- **Clinician:** id, email, password_hash, display_name, created_at, disabled_at
- **Session:** token_hash, clinician_id, expires_at, created_at
- **Symptom:** id (slug), name, description, category, animated, params (JSON), sort_order, enabled
- **BaseImage:** id, title, category, alt_text, width, height, file_path, sort_order

Not stored: patient identity, simulations, or exported images/videos.

## 5. Project structure

```
visual-symptom-simulator/
├── DESIGN.md
├── README.md
├── .env.example
├── frontend/                     React + Vite + TS
│   ├── index.html
│   ├── vite.config.ts            dev proxy /api → :8080
│   └── src/
│       ├── main.tsx
│       ├── app/                  App shell, routing, providers
│       ├── api/                  fetch client + endpoint functions
│       ├── components/           shared UI components (from design)
│       ├── features/
│       │   ├── auth/             login page, session context
│       │   └── simulator/        simulator page, layer stack, controls
│       ├── rendering/            Pixi renderer, symptom filters
│       │   └── shaders/          <symptom-id>.frag
│       ├── symptoms/             symptom/param type definitions
│       ├── hooks/
│       ├── utils/
│       └── assets/
└── backend/                      Go
    ├── go.mod
    ├── cmd/server/main.go        entrypoint
    ├── internal/
    │   ├── config/               env config
    │   ├── httpapi/              router, middleware, handlers
    │   ├── auth/                 passwords, sessions, auth middleware
    │   ├── symptoms/             symptom library service
    │   ├── images/               base image library service
    │   └── storage/              repository interfaces (+ DB impl later)
    ├── migrations/               schema migrations (once DB chosen)
    └── data/images/              local base image files (dev)
```

## 6. Security & privacy

- No PHI is stored or transmitted. Simulated images and videos exist only in the browser until the clinician downloads them.
- Clinician-only API. All routes except health and login require a valid session.
- Login rate-limiting and generic error messages, to avoid account enumeration.
- HTTPS required in production (Secure cookies).
- CSRF: SameSite cookies, plus an Origin/`X-Requested-With` check on state-changing requests.
- If patient uploads are added later, revisit: uploads should stay client-side unless storage is explicitly required. If they must be stored, that triggers a privacy review (e.g. PIPEDA/provincial health privacy law).

## 7. Deployment

Not yet decided. Both apps should be containerizable (Docker) so any host works:
- The frontend builds to static files (`npm run build` → `frontend/dist`), served by a static host or by the Go server.
- The backend is a single Go binary plus a database and an image directory/bucket.
- No GPU or heavy compute needed server-side.

## 8. Future work

- Patient accounts (self-serve use at home, sharing with a clinician).
- Patient-uploaded base images.
- 3D scenes (three.js) reusing the symptom shaders.
- Admin UI for clinicians, symptoms, and images.

## 9. Open decisions

- [ ] Database engine (PostgreSQL vs SQLite)
- [ ] Hosting/deployment target
- [ ] Exact parameter sets and ranges per symptom (needs clinical input)
- [ ] Base image set (scenes: street, reading text, Amsler grid, faces, etc.)
- [ ] How "trails" should present on a static image
- [ ] UI design (incoming)
- [ ] Confirm which file formats clinicians' records systems accept (MP4 vs WebM)
