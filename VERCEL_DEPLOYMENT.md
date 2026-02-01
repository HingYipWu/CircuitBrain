# Backend Deployment Guide for Vercel

## Prerequisites
- Vercel account
- PostgreSQL database (Vercel Postgres or external)
- GitHub repository with your code

## Step 1: Set Up PostgreSQL Database

Option A: Use Vercel Postgres (Recommended)
- Go to your Vercel dashboard
- Select your backend project
- Go to Storage > Create Postgres
- Copy the connection string

Option B: Use External PostgreSQL
- Use any PostgreSQL provider (AWS RDS, PlanetScale, etc.)
- Get your connection string

## Step 2: Deploy Backend

1. Connect your GitHub repo to Vercel
2. Select the `backend` folder as the root directory
3. Add environment variables in Vercel:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A strong random secret (use `openssl rand -base64 32`)
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: Your frontend's Vercel URL (e.g., https://your-app.vercel.app)

4. Deploy:
   ```bash
   npm run build
   ```

5. After deployment, run migrations:
   ```bash
   npx prisma migrate deploy
   ```
   Or from your local machine:
   ```bash
   cd backend
   DATABASE_URL="your_vercel_db_url" npx prisma migrate deploy
   ```

Your backend will be available at: `https://your-backend.vercel.app`

## Step 3: Deploy Frontend

1. Connect your GitHub repo to Vercel
2. Select the `frontend` folder as the root directory
3. Add environment variable:
   - `VITE_API_URL`: Your backend's Vercel URL (e.g., https://your-backend.vercel.app)

4. Deploy - Vercel will automatically run:
   ```bash
   npm run build
   ```

Your frontend will be available at: `https://your-frontend.vercel.app`

## Step 4: Update Backend CORS

Go back to your backend environment variables and update:
- `FRONTEND_URL`: The URL of your deployed frontend (from Step 3)

## Verification

1. Visit your frontend URL
2. Test signup/login
3. Create a post
4. Verify everything works

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if your database allows connections from Vercel IPs
- For Vercel Postgres, ensure it's in the same region

### API Connection Issues
- Verify `VITE_API_URL` in frontend matches backend URL
- Check browser console for CORS errors
- Verify `FRONTEND_URL` in backend matches frontend URL

### Prisma Issues
- Run migrations: `npx prisma migrate deploy`
- Generate client: `npx prisma generate`
- Check `prisma/schema.prisma` is committed to git

## Notes

- Both services deploy separately on Vercel
- They communicate via HTTP API calls
- Environment variables are loaded from Vercel dashboard
- For development, use `npm run dev` locally
