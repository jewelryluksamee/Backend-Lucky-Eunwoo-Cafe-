# Lucky Eunwoo Cafe – Backend API Testing Guide

Base URL: `http://localhost:3000`

---

## Quick Start

```bash
# 1. Copy env file and fill in Firebase credentials
cp .env.example .env

# 2. Start the server
npm run dev

# 3. Verify server is alive
curl http://localhost:3000/health
# → { "status": "ok" }
```

---

## Endpoints

### 1. Health Check

**GET** `/health`

Verifies the server is running. No Firebase connection required.

```bash
curl http://localhost:3000/health
```

**Expected response `200`**
```json
{ "status": "ok" }
```

---

### 2. Get All Wall Items

**GET** `/api/wall`

Returns all items on the wishing wall, ordered oldest → newest.

```bash
curl http://localhost:3000/api/wall
```

**Expected response `200`**
```json
{
  "success": true,
  "items": [
    {
      "id": "abc123",
      "type": "sticky",
      "author": "Jewelry",
      "text": "Happy Birthday Eunwoo!",
      "color": "#fffde0",
      "x": 120,
      "y": 200,
      "rot": -3.2,
      "createdAt": "2026-03-17T10:00:00.000Z"
    }
  ]
}
```

**Empty wall response**
```json
{ "success": true, "items": [] }
```

---

### 3. Add Sticky Note

**POST** `/api/wall/sticky`
**Content-Type:** `application/json`

| Field    | Type   | Required | Notes                                |
|----------|--------|----------|--------------------------------------|
| `text`   | string | ✅       | Max 200 characters                   |
| `author` | string | ❌       | Defaults to `"Guest"`                |
| `color`  | string | ❌       | Hex color. Defaults to `"#fffde0"`   |
| `x`      | number | ❌       | Canvas X position. Auto-random if omitted |
| `y`      | number | ❌       | Canvas Y position. Auto-random if omitted |
| `rot`    | number | ❌       | Rotation in degrees. Auto-random if omitted |

#### Test – success

```bash
curl -X POST http://localhost:3000/api/wall/sticky \
  -H "Content-Type: application/json" \
  -d '{
    "author": "Jewelry",
    "text": "Happy Birthday Eunwoo! ⭐",
    "color": "#fce4ec"
  }'
```

**Expected response `201`**
```json
{
  "success": true,
  "id": "Firestore_document_id",
  "type": "sticky",
  "author": "Jewelry",
  "text": "Happy Birthday Eunwoo! ⭐",
  "color": "#fce4ec",
  "x": 187.4,
  "y": 243.1,
  "rot": 2.7,
  "createdAt": "2026-03-17T10:00:00.000Z"
}
```

#### Test – missing text (validation error)

```bash
curl -X POST http://localhost:3000/api/wall/sticky \
  -H "Content-Type: application/json" \
  -d '{ "author": "Jewelry" }'
```

**Expected response `400`**
```json
{ "success": false, "error": "text is required" }
```

#### Test – with explicit position

```bash
curl -X POST http://localhost:3000/api/wall/sticky \
  -H "Content-Type: application/json" \
  -d '{
    "author": "AROHA",
    "text": "We love you so much!",
    "color": "#e8f5e9",
    "x": 100,
    "y": 150,
    "rot": -5
  }'
```

---

### 4. Add Sticker

**POST** `/api/wall/sticker`
**Content-Type:** `application/json`

| Field  | Type   | Required | Notes                                   |
|--------|--------|----------|-----------------------------------------|
| `src`  | string | ✅       | Path or URL to the sticker image        |
| `x`    | number | ❌       | Auto-random if omitted                  |
| `y`    | number | ❌       | Auto-random if omitted                  |
| `size` | number | ❌       | Width/height in px. Defaults 80–120 random |
| `rot`  | number | ❌       | Rotation in degrees. Auto-random if omitted |

#### Test – success

```bash
curl -X POST http://localhost:3000/api/wall/sticker \
  -H "Content-Type: application/json" \
  -d '{
    "src": "images/sticker1.png",
    "size": 90
  }'
```

**Expected response `201`**
```json
{
  "success": true,
  "id": "Firestore_document_id",
  "type": "sticker",
  "src": "images/sticker1.png",
  "x": 220.5,
  "y": 310.2,
  "size": 90,
  "rot": -12.4,
  "createdAt": "2026-03-17T10:00:00.000Z"
}
```

#### Test – missing src (validation error)

```bash
curl -X POST http://localhost:3000/api/wall/sticker \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response `400`**
```json
{ "success": false, "error": "src is required" }
```

---

### 5. Upload Polaroid (Image)

**POST** `/api/wall/polaroid`
**Content-Type:** `multipart/form-data`

| Field     | Type   | Required | Notes                              |
|-----------|--------|----------|------------------------------------|
| `image`   | file   | ✅       | JPEG / PNG / GIF / WebP, max 5 MB  |
| `author`  | string | ❌       | Defaults to `"Guest"`              |
| `caption` | string | ❌       | Max 40 characters                  |
| `x`       | number | ❌       | Auto-random if omitted             |
| `y`       | number | ❌       | Auto-random if omitted             |
| `rot`     | number | ❌       | Auto-random if omitted             |

#### Test – success

```bash
curl -X POST http://localhost:3000/api/wall/polaroid \
  -F "image=@/path/to/your/photo.jpg" \
  -F "author=Jewelry" \
  -F "caption=Eunwoo my star ⭐"
```

**Expected response `201`**
```json
{
  "success": true,
  "id": "Firestore_document_id",
  "type": "polaroid",
  "src": "https://storage.googleapis.com/your-bucket/wall-images/uuid.jpg",
  "author": "Jewelry",
  "caption": "Eunwoo my star ⭐",
  "x": 180.3,
  "y": 255.7,
  "rot": 3.1,
  "createdAt": "2026-03-17T10:00:00.000Z"
}
```

#### Test – no file attached (validation error)

```bash
curl -X POST http://localhost:3000/api/wall/polaroid \
  -F "author=Jewelry"
```

**Expected response `400`**
```json
{ "success": false, "error": "image file is required" }
```

#### Test – file too large (> 5 MB)

Upload any file larger than 5 MB.

**Expected response `400`** (Multer error)
```json
{ "success": false, "error": "File too large" }
```

#### Test – invalid file type

```bash
curl -X POST http://localhost:3000/api/wall/polaroid \
  -F "image=@/path/to/document.pdf" \
  -F "author=Test"
```

**Expected response `400`**
```json
{ "success": false, "error": "Only image files are allowed (jpeg, png, gif, webp)" }
```

---

### 6. Update Item Position (Drag & Drop)

**PUT** `/api/wall/:id/position`
**Content-Type:** `application/json`

| Field | Type   | Required |
|-------|--------|----------|
| `x`   | number | ✅       |
| `y`   | number | ✅       |

Replace `:id` with a real Firestore document ID from a previous POST response.

#### Test – success

```bash
curl -X PUT http://localhost:3000/api/wall/REPLACE_WITH_REAL_ID/position \
  -H "Content-Type: application/json" \
  -d '{ "x": 350, "y": 420 }'
```

**Expected response `200`**
```json
{ "success": true }
```

#### Test – invalid body (missing x/y)

```bash
curl -X PUT http://localhost:3000/api/wall/REPLACE_WITH_REAL_ID/position \
  -H "Content-Type: application/json" \
  -d '{ "x": 100 }'
```

**Expected response `400`**
```json
{ "success": false, "error": "x and y must be numbers" }
```

#### Test – ID does not exist

```bash
curl -X PUT http://localhost:3000/api/wall/nonexistent_id/position \
  -H "Content-Type: application/json" \
  -d '{ "x": 100, "y": 200 }'
```

**Expected response `500`** (Firestore throws on missing doc update)

---

### 7. Delete an Item

**DELETE** `/api/wall/:id`

Deletes the Firestore document. If the item is a polaroid, also deletes the image from Firebase Storage.

#### Test – success

```bash
curl -X DELETE http://localhost:3000/api/wall/REPLACE_WITH_REAL_ID
```

**Expected response `200`**
```json
{ "success": true }
```

#### Test – ID not found

```bash
curl -X DELETE http://localhost:3000/api/wall/nonexistent_id
```

**Expected response `404`**
```json
{ "success": false, "error": "Item not found" }
```

---

## Full Flow Test (copy-paste sequence)

```bash
BASE=http://localhost:3000

# 1. Health check
curl $BASE/health

# 2. Add a sticky note – save the returned "id"
curl -X POST $BASE/api/wall/sticky \
  -H "Content-Type: application/json" \
  -d '{"author":"Jewelry","text":"Happy Birthday Eunwoo!","color":"#fce4ec"}'

# 3. Add a sticker
curl -X POST $BASE/api/wall/sticker \
  -H "Content-Type: application/json" \
  -d '{"src":"images/sticker1.png"}'

# 4. Upload a polaroid (replace path with a real image on your machine)
curl -X POST $BASE/api/wall/polaroid \
  -F "image=@./test.jpg" \
  -F "author=Jewelry" \
  -F "caption=Eunwoo my star"

# 5. Fetch all items
curl $BASE/api/wall

# 6. Move an item (replace ID)
curl -X PUT $BASE/api/wall/PASTE_ID_HERE/position \
  -H "Content-Type: application/json" \
  -d '{"x":300,"y":400}'

# 7. Delete an item (replace ID)
curl -X DELETE $BASE/api/wall/PASTE_ID_HERE

# 8. Verify item was removed
curl $BASE/api/wall
```

---

## Response Schema Reference

### Wall Item (Sticky)
```json
{
  "id":        "string  – Firestore document ID",
  "type":      "sticky",
  "author":    "string",
  "text":      "string  – max 200 chars",
  "color":     "string  – hex color",
  "x":         "number  – canvas X px",
  "y":         "number  – canvas Y px",
  "rot":       "number  – rotation degrees",
  "createdAt": "string  – ISO 8601"
}
```

### Wall Item (Sticker)
```json
{
  "id":        "string",
  "type":      "sticker",
  "src":       "string  – image path or URL",
  "x":         "number",
  "y":         "number",
  "size":      "number  – width/height px",
  "rot":       "number",
  "createdAt": "string"
}
```

### Wall Item (Polaroid)
```json
{
  "id":        "string",
  "type":      "polaroid",
  "src":       "string  – Firebase Storage public URL",
  "author":    "string",
  "caption":   "string  – max 40 chars",
  "x":         "number",
  "y":         "number",
  "rot":       "number",
  "createdAt": "string"
}
```

### Error Response
```json
{
  "success": false,
  "error":   "string  – human-readable message"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK – request succeeded |
| `201` | Created – item was added |
| `400` | Bad Request – missing/invalid fields or file |
| `404` | Not Found – document ID does not exist |
| `500` | Internal Server Error – Firebase or server error |
