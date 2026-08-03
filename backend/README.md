# AI Product Manager Copilot — Backend API

Node.js + Express + TypeScript + MongoDB (Mongoose) backend for the restaurant feedback analysis tool.

## Quick Start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, etc.

# 3. Seed the database (one-time import of analyzed_feedback.csv)
npm run seed

# 4. Start the dev server
npm run dev        # http://localhost:5000
```

### Production Build

```bash
npm run build      # Compiles TypeScript → dist/
npm start          # Runs compiled JS from dist/
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/ai_pm_copilot` | MongoDB connection string |
| `PORT` | `5000` | Server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin (comma-separated for multiple) |
| `FASTAPI_URL` | `http://localhost:8000` | Yash's FastAPI analysis service (not yet live) |
| `JWT_SECRET` | `super_secret_jwt_key_ai_pm_copilot_2026` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Expiration time for JWT tokens |

---

## Authentication & Authorization

All `/api/feedback` and `/api/stats` routes require a valid JWT passed in the HTTP Authorization header:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### User Roles & Permissions

| Endpoint | Method | Unauthenticated | Viewer | Product Manager | Admin |
|---|---|:---:|:---:|:---:|:---:|
| `/api/auth/register` | `POST` | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/me` | `GET` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback` | `GET` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback/:id` | `GET` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback` | `POST` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback/:id` | `PUT` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/feedback/:id` | `DELETE` | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| `/api/stats` | `GET` | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/analyze` | `POST` | ✅ | ✅ | ✅ | ✅ |

---

## Auth Endpoints

### Register User

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "pm@example.com",
  "password": "Password123!",
  "name": "Arpita Dev",
  "role": "product_manager"
}
```
*Note: `role` can be `"admin"`, `"product_manager"`, or `"viewer"` (defaults to `"viewer"`).*

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "pm@example.com",
      "name": "Arpita Dev",
      "role": "product_manager",
      "createdAt": "2026-08-03T23:30:00.000Z"
    }
  }
}
```

---

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "pm@example.com",
  "password": "Password123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "pm@example.com",
      "name": "Arpita Dev",
      "role": "product_manager",
      "createdAt": "2026-08-03T23:30:00.000Z"
    }
  }
}
```

---

### Get Current User Profile (`/me`)

```http
GET /api/auth/me
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "pm@example.com",
    "name": "Arpita Dev",
    "role": "product_manager",
    "createdAt": "2026-08-03T23:30:00.000Z"
  }
}
```

---

## API Reference

Base URL: `http://localhost:5000/api`

### Health Check

```http
GET /api/health
```

---

### Create Feedback (Requires Auth)

```http
POST /api/feedback
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

---

### List Feedback (Requires Auth)

```http
GET /api/feedback?page=1&limit=20&category=Food&sentiment=Positive
Authorization: Bearer <TOKEN>
```

---

### Get Single Feedback (Requires Auth)

```http
GET /api/feedback/:id
Authorization: Bearer <TOKEN>
```

---

### Update Feedback (Requires Auth)

```http
PUT /api/feedback/:id
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

---

### Delete Feedback (Requires Admin Role)

```http
DELETE /api/feedback/:id
Authorization: Bearer <ADMIN_TOKEN>
```

---

### Dashboard Stats (Requires Auth)

```http
GET /api/stats
Authorization: Bearer <TOKEN>
```

---

### Analyze Feedback (Stub — Public)

```http
POST /api/analyze
Content-Type: application/json
```

---

## Data Model Notes

The Feedback model maps all 45 columns from `dataset/processed/analyzed_feedback.csv`.

| Field | Status | Why |
|---|---|---|
| `originalPriority` | Always `null` in current dataset | Support-ticket-only field. |
| `theme` | ~93% `null` | Real theme extraction comes from `/api/analyze`. |
| `painPoint` | ~93% `null` | Real pain-point extraction comes from `/api/analyze`. |
| `aiRecommendation` | Always `null` for seeded data | Populated by `/api/analyze`. |
