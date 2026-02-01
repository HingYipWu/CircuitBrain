# Environment Variables Template

## Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/circuitbrain

# Server
PORT=0
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-random-key-change-this

# Frontend
FRONTEND_URL=https://your-frontend.vercel.app
```

## Frontend (.env or .env.local)

```env
VITE_API_URL=https://your-backend.vercel.app
```

## Vercel Environment Variables Setup

### For Backend Project
In Vercel Dashboard > Settings > Environment Variables, add:

| Key | Value |
|-----|-------|
| DATABASE_URL | postgresql://... |
| JWT_SECRET | (use strong random value) |
| NODE_ENV | production |
| FRONTEND_URL | https://your-frontend.vercel.app |

### For Frontend Project
In Vercel Dashboard > Settings > Environment Variables, add:

| Key | Value |
|-----|-------|
| VITE_API_URL | https://your-backend.vercel.app |

## Generating JWT_SECRET

```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object {[byte](Get-Random -Max 256)}))
```
