# CircuitBrain - Full Stack Web Application

A modern full-stack web application built with React, Node.js/Express, and PostgreSQL.

## Project Structure

```
CircuitBrain/
├── frontend/          # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/  # Reusable React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── context/     # Context for state management
│   │   └── api.ts       # API client
│   ├── package.json
│   └── vite.config.ts
│
└── backend/           # Express + TypeScript backend
    ├── src/
    │   ├── routes/      # API routes
    │   ├── controllers/  # Route handlers
    │   ├── middleware/   # Custom middleware
    │   └── index.ts     # Entry point
    ├── prisma/
    │   └── schema.prisma  # Database schema
    ├── package.json
    └── tsconfig.json

```

## Features

- **User Authentication**: Sign up, login with JWT tokens
- **Create & View Posts**: Users can create posts and view published content
- **Responsive Design**: Modern UI with CSS styling
- **Type Safety**: Full TypeScript support on both frontend and backend
- **Database**: PostgreSQL with Prisma ORM

## Getting Started

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your PostgreSQL connection string and JWT secret.

4. Initialize the database:
   ```bash
   npm run prisma:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user

### Posts
- `GET /api/posts` - Get all published posts
- `POST /api/posts` - Create a new post (requires authentication)
- `GET /api/posts/user/:userId` - Get posts by specific user

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router for navigation
- Axios for API calls

### Backend
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT for authentication
- Bcrypt for password hashing

## Development

- Both frontend and backend use TypeScript for type safety
- The Vite dev server proxies API requests to the backend
- JWT tokens are stored in localStorage on the frontend
- The backend validates tokens on protected routes

## Production Build

### Frontend
```bash
npm run build
```

### Backend
```bash
npm run build
npm start
```

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 5000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `NODE_ENV` - Environment (development/production)

## Notes

- Change the `JWT_SECRET` to a strong random value in production
- PostgreSQL must be running and accessible at the DATABASE_URL
- The frontend's Vite config has a proxy for `/api` requests to the backend
