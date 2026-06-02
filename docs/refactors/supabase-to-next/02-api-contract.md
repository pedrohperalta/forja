# Supabase to Next.js Refactor — Mobile API Contract

All mobile endpoints live under:

```text
/api/mobile/v1
```

All request bodies and responses must be validated with schemas from `packages/domain`.

Versioning rules:

- backwards-compatible additions stay in `/api/mobile/v1`
- introduce `/api/mobile/v2` only for breaking contract changes
- admin routes are not part of the mobile API version contract

## Operational Health Endpoint

### `GET /api/health`

Public endpoint used by Docker, Portainer, and deployment validation.

Response:

```json
{
  "ok": true
}
```

Requirements:

- no authentication required
- no user data returned
- fast and safe to call frequently
- v1 only needs basic app process health; deeper database/storage checks can be added later

## CORS

- Admin routes are same-origin only.
- Mobile API routes under `/api/mobile/v1` do not enable broad browser CORS in v1.
- Native mobile clients call the HTTPS API directly and do not require browser CORS.
- `GET /api/health` is public.
- Any future browser client must be added through an explicit origin allowlist.

## Rate Limits

v1 uses simple app-level rate limiting without Redis:

- auth endpoints: 10 requests per minute per IP
- AI import endpoints: 5 requests per minute per authenticated user
- other authenticated API endpoints: 120 requests per minute per authenticated user

Rate limit responses must use HTTP `429` and the standard error shape.

## Common Rules

### Auth

Authenticated mobile endpoints require:

```http
Authorization: Bearer <accessToken>
```

### Error Shape

All API errors return:

```json
{
  "error": {
    "code": "string_code",
    "message": "Human readable message",
    "details": {}
  }
}
```

All API responses should include an `x-request-id` header. If the request includes `x-request-id`, the backend should propagate it; otherwise it should generate one. Error responses may also include the request ID in `details` when useful for troubleshooting.

Common status codes:

- `400`: invalid request
- `401`: unauthenticated
- `403`: forbidden
- `404`: not found
- `409`: conflict
- `422`: valid JSON but semantically invalid
- `429`: rate limited
- `500`: unexpected server error

Standard error codes:

- `invalid_request`
- `unauthenticated`
- `forbidden`
- `not_found`
- `conflict`
- `validation_error`
- `rate_limited`
- `invalid_cursor`
- `invalid_token`
- `oauth_error`
- `upload_too_large`
- `unsupported_media_type`
- `model_output_invalid`
- `internal_error`

### Success Shape

Endpoints can return domain-specific JSON directly. Avoid wrapping every success response in generic `{ data }` unless the schema benefits from it.

### Idempotency

Mobile push endpoints must be idempotent when client-generated IDs are reused.

## Auth Endpoints

### Shared Google Callback

### `GET /api/auth/google/callback`

Handles Google OAuth callback for both admin and mobile flows.

Rules:

- validates signed OAuth `state`
- rejects invalid, expired, or tampered state
- rejects Google accounts outside `FORJA_ALLOWED_USER_EMAILS`
- for admin flow, creates `admin_sessions` row and sets `forja_admin_session`
- for mobile flow, creates `mobile_auth_codes` row and redirects to `forja://auth/callback?code=<code>`

Tests:

- rejects invalid OAuth state
- rejects non-allowlisted email
- admin flow sets HTTP-only cookie
- mobile flow redirects with one-time code

## Mobile Auth Endpoints

### `POST /auth/google/start`

Starts mobile Google OAuth.

Request:

```json
{
  "redirectUri": "forja://auth/callback"
}
```

Response:

```json
{
  "url": "https://accounts.google.com/..."
}
```

Implementation note:

- backend uses the `forja-next-web` OAuth client
- Google redirects to `/api/auth/google/callback`
- backend then redirects to the mobile `redirectUri` with a one-time Forja auth code
- OAuth `state` identifies the mobile flow and is signed/expiring

Tests:

- rejects invalid redirect URI
- returns Google OAuth URL
- does not create a user yet
- rejects tampered or expired OAuth state on callback

### `POST /auth/google/exchange`

Exchanges a one-time Forja auth code for mobile tokens.

Request:

```json
{
  "code": "one_time_forja_code",
  "redirectUri": "forja://auth/callback"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User"
  },
  "tokens": {
    "accessToken": "jwt",
    "refreshToken": "opaque_random_token",
    "expiresAt": "2026-05-18T12:00:00.000Z"
  }
}
```

Tests:

- creates user on first login
- links to existing Google account
- preserves imported Supabase user ID when account already exists
- rejects Google accounts outside `FORJA_ALLOWED_USER_EMAILS`
- rejects invalid code

### `POST /auth/refresh`

Rotates refresh token and issues a new access token.

Request:

```json
{
  "refreshToken": "opaque_random_token"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "new_opaque_random_token",
  "expiresAt": "2026-05-18T12:00:00.000Z"
}
```

Tests:

- rejects unknown refresh token
- rejects revoked refresh token
- rotates token
- old token cannot be reused

### `POST /auth/logout`

Revokes the current refresh token.

Request:

```json
{
  "refreshToken": "opaque_random_token"
}
```

Response:

```json
{
  "ok": true
}
```

Tests:

- revokes existing token
- succeeds idempotently for already revoked token

### `GET /auth/me`

Returns current mobile user.

Response:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User"
}
```

Tests:

- returns 401 without bearer token
- returns user for valid token

## Admin Auth Endpoints

### `GET /api/admin/auth/google/start`

Starts admin Google OAuth and redirects to Google.

Tests:

- redirects to Google OAuth URL
- includes signed admin OAuth state

### `POST /api/admin/auth/logout`

Revokes the current admin session and clears the `forja_admin_session` cookie.

Response:

```json
{
  "ok": true
}
```

Tests:

- revokes current admin session
- clears cookie
- succeeds idempotently when session is already absent

## Sync Endpoints

### `GET /sync/pull?cursor=<cursor>`

Returns server-owned changes since a cursor.

Cursor rules:

- cursor is stateless, opaque, and signed by the server with HMAC SHA-256
- cursor encodes `lastChangedAt` and a stable tie-breaker such as `lastId`
- sync ordering is `(changedAt, id)` ascending
- response returns at most 500 changed records in v1
- invalid or tampered cursor returns HTTP `400`

Response:

```json
{
  "cursor": "server_cursor",
  "hasMore": false,
  "plans": [
    {
      "id": "plan_id",
      "revisionId": "revision_id",
      "data": {},
      "updatedAt": "2026-05-18T12:00:00.000Z"
    }
  ],
  "deletedPlanIds": ["plan_id"],
  "workoutSessions": [
    {
      "id": "session_id",
      "data": {},
      "updatedAt": "2026-05-18T12:00:00.000Z"
    }
  ],
  "deletedWorkoutSessionIds": ["session_id"]
}
```

Tests:

- returns 401 when unauthenticated
- rejects malformed cursor
- returns all published plans when cursor is absent
- returns only changed records when cursor is present
- never returns draft-only plan changes
- orders changes deterministically by `(changedAt, id)`
- caps response at 500 changed records
- returns `hasMore: true` when another pull is needed
- includes tombstones
- response validates against shared schema

### `POST /sync/push`

Pushes mobile-owned changes.

Conflict resolution:

- workout sessions use latest `updatedAt` wins
- if incoming `updatedAt` is newer than the stored version, upsert the incoming version
- if incoming `updatedAt` is older than or equal to the stored version, keep the stored version
- equal timestamps use the stored server version as deterministic tie-breaker
- deletion is represented by a workout session payload with `deletedAt` and a newer `updatedAt`
- deletion wins only when its `updatedAt` is newer than the stored row
- normal latest-version resolution should not return HTTP `409`

Request:

```json
{
  "workoutSessions": [
    {
      "id": "session_id",
      "data": {},
      "updatedAt": "2026-05-18T12:00:00.000Z",
      "deletedAt": null
    }
  ],
  "clientMutationId": "uuid"
}
```

Response:

```json
{
  "ok": true,
  "acceptedWorkoutSessionIds": ["session_id"],
  "skippedWorkoutSessionIds": [],
  "currentWorkoutSessions": []
}
```

Tests:

- accepts idempotent upserts
- accepts newer incoming workout session over stored version
- keeps stored workout session when incoming version is older
- keeps stored workout session when timestamps are equal
- accepts newer delete tombstone
- ignores older delete tombstone
- scopes writes to authenticated user
- rejects invalid session data
- handles repeated `clientMutationId`

### `DELETE /workout-sessions/:id`

Deletes a workout session for the authenticated user.

Implementation should create/update a tombstone with `deletedAt` and `updatedAt` rather than hard-deleting immediately.

Response:

```json
{
  "ok": true
}
```

Tests:

- returns 401 when unauthenticated
- does not delete another user's session
- succeeds when session already deleted

## Plans Endpoints

### `GET /plans/published`

Returns current published plans for the authenticated user.

Response:

```json
{
  "plans": [
    {
      "id": "plan_id",
      "revisionId": "revision_id",
      "data": {}
    }
  ]
}
```

Tests:

- returns only published plans
- excludes drafts
- scopes to authenticated user

## Photo Endpoints

### `PUT /photos/equipment/:exerciseId`

Uploads or replaces an equipment photo.

Upload is an upsert by `exerciseId`: overwrite the stable file path and clear `deletedAt` on metadata.

Request:

- `multipart/form-data`
- field: `file`
- accepted content type: `image/jpeg`
- validate JPEG magic bytes in addition to content type
- max file size: 5 MB
- no server-side image reprocessing/transcoding in v1

Response:

```json
{
  "exerciseId": "exercise_id",
  "path": "equipment-photos/user_id/exercise_id.jpg",
  "updatedAt": "2026-05-18T12:00:00.000Z"
}
```

Tests:

- rejects unauthenticated request
- rejects non-JPEG file
- rejects JPEG content type with invalid magic bytes
- rejects file over 5 MB
- stores file under authenticated user's folder
- upserts existing photo
- replacing a previously deleted photo clears `deletedAt`

### `GET /photos/equipment`

Lists equipment photos for the authenticated user.

Response:

```json
{
  "photos": [
    {
      "exerciseId": "exercise_id",
      "downloadUrl": "/api/mobile/v1/photos/equipment/exercise_id/download",
      "updatedAt": "2026-05-18T12:00:00.000Z"
    }
  ]
}
```

Tests:

- lists only current user's photos
- returns stable exercise IDs

### `GET /photos/equipment/:exerciseId/download`

Downloads an equipment photo.

Response:

- `200 image/jpeg`
- `404` if absent

Tests:

- rejects unauthenticated request
- does not serve another user's file
- returns JPEG bytes

### `DELETE /photos/equipment/:exerciseId`

Deletes an equipment photo.

Deletion is logical in v1: set `deletedAt` in metadata and keep the physical file on disk.

Response:

```json
{
  "ok": true
}
```

Tests:

- deletes only current user's metadata
- keeps the physical file on disk
- succeeds idempotently when photo is absent

## Admin AI Import Endpoint

### `POST /api/admin/import/extract-workout`

Admin-authenticated endpoint that replaces Supabase Edge Function `extract-workout` for the web admin only. This endpoint is intentionally not part of `/api/mobile/v1`.

Persistence rules:

- store import job metadata for debugging and rate visibility
- do not store raw images or raw AI import payloads in v1
- extracted results are returned to the admin client and are persisted only if the admin accepts them through a normal create/update flow

Request:

```json
{
  "image": "base64_jpeg",
  "label": "A"
}
```

Limits:

- source image max size: 5 MB before base64 encoding
- accepted image type: JPEG

Response:

```json
{
  "workout": {
    "name": "Treino de Peito",
    "exercises": [
      {
        "name": "Supino Reto",
        "category": "Peito",
        "sets": 3,
        "reps": "10-12",
        "restSeconds": 60,
        "equipment": "Barra",
        "confidence": 0.95
      }
    ]
  }
}
```

Tests:

- rejects unauthenticated or non-admin requests
- rejects invalid base64 payload
- rejects non-JPEG or image over 5 MB
- calls Anthropic with server-only API key
- strips markdown code fences if model returns them
- normalizes categories
- validates response with shared schema
- returns 422 for malformed model output
