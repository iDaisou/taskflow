# TaskFlow

Full-stack test project management app built with React, Express, PostgreSQL, and Prisma.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT

## Getting started

1. Copy `.env.example` to `.env` and install dependencies from the project root:
   ```bash
   npm install
   ```
2. Start PostgreSQL with Docker:
   ```bash
   docker compose up -d
   ```
3. Apply the checked-in Prisma migration and generate the Prisma client:
   ```bash
   npm --prefix server run db:migrate
   npm --prefix server run db:generate
   ```
4. Start the app in separate terminals:
   ```bash
   npm --prefix server run dev
   npm --prefix client run dev
   ```

## Main features

- User registration and login
- Project management
- Task tracking with statuses and priorities
- Dashboard summaries
- JWT-protected API
