# API Contracts

**⚠️ READ-ONLY**

This directory defines the API contract that **all backend teams MUST follow**.

Each UC team implements the endpoints defined here. Frontend teams use this spec to understand request/response formats.

## Files

- `openapi-spec.yaml` — Complete OpenAPI 3.0 specification
- `models/` — JSON schemas for request/response bodies

## Rules

1. **Don't change the contract** — Discuss with team lead if changes needed
2. **All endpoints must match** — Status codes, field names, data types
3. **Backend implements exactly** — Frontend depends on these contracts

## How to Use

**Backend teams:**
```
Read openapi-spec.yaml
Implement all endpoints exactly as specified
Run: fastapi docs (auto-generated, should match openapi-spec.yaml)
```

**Frontend teams:**
```
Read openapi-spec.yaml
Build UI based on request/response schemas
Mock endpoints initially (before backend ready)
```

