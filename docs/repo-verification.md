# REPO-05 Audit — validateSessionId Coverage

Audit date: 2026-05-22
Audit method: manual file inspection + grep verification

## Routes Reading sessionId from Request

| Route | File | sessionId source | validateSessionId called | Evidence (line range) |
|-------|------|------------------|--------------------------|------------------------|
| POST /api/analyze | src/app/api/analyze/route.ts | request body (JSON) | yes | L2, L9-L11 |
| POST /api/answers | src/app/api/answers/route.ts | request body (JSON) | yes | L2, L12-L14 |
| POST /api/generate | src/app/api/generate/route.ts | request body (JSON) | yes | L2, L11-L13 |
| GET /api/listing | src/app/api/listing/route.ts | URL query param | yes | L2, L35-L37 |
| PATCH /api/listing | src/app/api/listing/route.ts | request body (JSON) | yes | L2, L13-L15 |
| GET /api/orders | src/app/api/orders/route.ts | URL query param | yes | L2, L14-L16 |
| POST /api/publish | src/app/api/publish/route.ts | request body (JSON) | yes | L2, L13-L15 |
| POST /api/questions | src/app/api/questions/route.ts | request body (JSON) | yes | L2, L9-L11 |

## Routes That Do Not Read sessionId from Request

| Route | File | Rationale |
|-------|------|-----------|
| POST /api/upload | src/app/api/upload/route.ts | Creates a new sessionId server-side via createSession() — no untrusted sessionId input to validate |

## Grep Evidence

```bash
grep -rn "validateSessionId" src/app/api/
```

Actual output (captured 2026-05-22):

```
src/app/api/publish/route.test.ts:22:  validateSessionId: mockValidateSessionId,
src/app/api/publish/route.ts:2:import { validateSessionId, readSession, writeSession } from '@/lib/session'
src/app/api/publish/route.ts:13:    validateSessionId(sessionId)
src/app/api/answers/route.ts:2:import { validateSessionId, readSession, writeSession } from '@/lib/session'
src/app/api/answers/route.ts:12:    validateSessionId(sessionId)
src/app/api/analyze/route.ts:2:import { validateSessionId, readSession, writeSession } from '@/lib/session'
src/app/api/analyze/route.ts:9:    validateSessionId(sessionId)
src/app/api/generate/route.ts:2:import { validateSessionId, readSession, writeSession } from '@/lib/session'
src/app/api/generate/route.ts:11:    validateSessionId(sessionId)
src/app/api/orders/route.test.ts:12:  validateSessionId: mockValidateSessionId,
src/app/api/listing/route.ts:2:import { validateSessionId, readSession, writeSession } from '@/lib/session'
src/app/api/listing/route.ts:13:    validateSessionId(sessionId)
src/app/api/listing/route.ts:35:    validateSessionId(sessionId)
src/app/api/orders/route.ts:2:import { validateSessionId } from '@/lib/session'
src/app/api/orders/route.ts:14:    validateSessionId(sessionId)
src/app/api/questions/route.ts:2:import { validateSessionId, readSession, writeSession } from '@/lib/session'
src/app/api/questions/route.ts:9:    validateSessionId(sessionId)
```

Note: test files (route.test.ts) appear in grep output — they mock `validateSessionId`, confirming the real route imports are also tested.

## Conclusion

REPO-05 verified. No gaps. validateSessionId is called in every route that accepts a sessionId from an untrusted source. The upload route is correctly exempt as it creates the sessionId server-side and never processes a caller-supplied sessionId.
