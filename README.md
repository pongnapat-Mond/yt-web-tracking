# YouTube Schedule — Hololive-style + Admin Panel + Handle Resolver

- Hololive-like schedule grid (Live / Upcoming / Recent)
- Admin Panel (`#/admin`) with client-side PIN
- **Handle Resolver**: convert `@handle` → Channel ID (UC…) via YouTube API

## Local
```bash
npm i
npm run dev
```

## Deploy to Vercel
- Build command: `npm run build`
- Output: `dist`
- Or use `vercel` CLI

## How to use Handle Resolver
1. Go to `#/admin` and set API key first
2. In **Add by @handle**, type a handle (e.g., `@holoen_raorapanthera`)
3. Click **Resolve & Add** → The Channel ID will be appended to your channels list
