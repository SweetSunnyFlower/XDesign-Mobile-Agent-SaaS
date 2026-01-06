# 🎨 XDesign AI – AI Mobile Design Agent

> **AI-powered mobile UI screen generation SaaS** that creates production-ready HTML/CSS mobile screens from text prompts using DeepSeek v3 and Google Gemini AI.

## 📖 Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Development Guide](#-development-guide)
- [Queue Management](#-queue-management)
- [AI Generation Workflow](#-ai-generation-workflow)
- [WebSocket Events](#-websocket-events)
- [Theme System](#-theme-system)
- [API Documentation](#-api-documentation)
- [Production Deployment](#-production-deployment)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🗝️ Key Features

- 🔐 **Authentication** - NextAuth v5 with credentials-based login
- 🤖 **AI-Powered Generation** - DeepSeek v3 for analysis + Gemini 3 Pro for HTML generation
- ✍️ **Prompt-to-Design** - Generate 1-4 mobile screens from simple text prompts
- 🖼️ **Interactive Canvas** - Draggable, resizable mobile frames with zoom/pan
- 🎨 **22 Predefined Themes** - Switch themes in real-time (midnight, ocean-breeze, neo-brutalism, etc.)
- 🔁 **Regeneration** - Modify individual screens with new prompts
- 📸 **PNG Export** - Download individual frames or entire canvas as images
- 🌄 **Unsplash Integration** - Real images via Unsplash API tool calling
- ⚡ **Real-time Updates** - WebSocket streaming of generation progress
- 🚀 **Concurrent Generation** - Parallel frame generation with BullMQ
- 🔄 **Background Jobs** - Resilient job processing with automatic retry
- 🎯 **Production-Ready** - Optimized for Vercel deployment

---

## 🛠️ Tech Stack

### Core Framework
- **Next.js 16** (App Router) - React framework with custom server
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first CSS framework

### Database & ORM
- **MySQL** - Relational database
- **Prisma** - Type-safe ORM with custom output location

### Authentication
- **NextAuth v5** - Authentication solution
- Credentials provider with JWT sessions (30-day expiration)

### AI & Tools
- **DeepSeek v3** - Prompt analysis and screen planning
- **Google Gemini 3 Pro** - HTML generation with tool calling
- **Vercel AI SDK** - Unified AI interface
- **Unsplash API** - Real image generation

### Background Jobs
- **BullMQ** - Redis-based job queue
- **Redis** - In-memory data store for queue management
- Concurrent job processing (5 workers)
- Automatic retry with exponential backoff

### Real-time Communication
- **Socket.io** - WebSocket server for live updates
- JWT-based authentication
- User-specific rooms for targeted events

### State Management
- **React Query** (@tanstack/react-query) - Server state management
- **React Context** - Client state management

### UI Components
- **Radix UI** - Headless accessible components
- **react-rnd** - Draggable/resizable components
- **react-zoom-pan-pinch** - Canvas zoom/pan controls
- **Iconify** - 100k+ icons

### Screenshot Generation
- **Puppeteer** - Headless Chrome automation
- **@sparticuz/chromium-min** - Optimized Chromium for Vercel

---

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (Next.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Canvas     │  │   Theme      │  │  WebSocket   │      │
│  │   Context    │  │   Selector   │  │   Client     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   /project   │  │  /screenshot │  │   /ws/token  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      BullMQ Queue (Redis)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  generate-screens → generate-frame (x3) → complete  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   BullMQ Worker (Separate Process)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ generateScreens│ │ generateFrame│ │regenerateFrame│     │
│  │  Processor    │  │  Processor   │  │  Processor   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↓                  ↓                  ↓              │
│  ┌────────────────────────────────────────────────────┐     │
│  │          DeepSeek v3 / Gemini 3 Pro                │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Socket.io Server                          │
│  (Emits progress events to user-specific rooms)             │
└─────────────────────────────────────────────────────────────┘
                            ↑
                    Back to Client
```

### Data Model

```
User
  ├── id (UUID)
  ├── email
  ├── password (hashed)
  └── projects []

Project
  ├── id (UUID)
  ├── name (AI-generated)
  ├── theme (e.g., "midnight")
  ├── thumbnail (base64 PNG)
  ├── userId (foreign key)
  └── frames []

Frame
  ├── id (UUID)
  ├── title (e.g., "Home Dashboard")
  ├── htmlContent (Tailwind CSS HTML)
  ├── projectId (foreign key)
  ├── createdAt
  └── updatedAt
```

### AI Generation Flow (Concurrent)

```
1. User submits prompt
   ↓
2. Create project in DB
   ↓
3. Add "generate-screens" job to BullMQ
   ↓
4. Worker: Analysis Phase
   - DeepSeek analyzes prompt
   - Returns: { screens: [1-4], theme: "midnight" }
   ↓
5. Worker: Create empty frames in DB
   - Get database IDs for all frames
   ↓
6. Worker: Dispatch concurrent "generate-frame" jobs
   - Job 1: Frame ID abc123 (parallel)
   - Job 2: Frame ID def456 (parallel)
   - Job 3: Frame ID ghi789 (parallel)
   ↓
7. Each frame job:
   - Gemini generates HTML
   - Updates frame in DB
   - Emits "frame.updated" via WebSocket
   ↓
8. Client: Real-time progress
   - Shows empty frames immediately
   - Updates each frame as HTML arrives
   - Marks complete when all frames done
```

---

## 📁 Project Structure

```
XDesign-Mobile-Agent-SaaS/
├── app/                          # Next.js App Router
│   ├── (routes)/                 # Route groups
│   │   ├── login/                # Login page
│   │   ├── register/             # Register page
│   │   ├── page.tsx              # Landing page
│   │   └── project/[id]/         # Project canvas page
│   ├── api/                      # API routes
│   │   ├── auth/[...nextauth]/   # NextAuth handlers
│   │   ├── project/              # Project CRUD
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET/POST/PATCH project
│   │   │       └── frame/        # Frame operations
│   │   ├── screenshot/           # PNG generation
│   │   └── ws/token/             # WebSocket JWT token
│   ├── layout.tsx                # Root layout
│   └── providers.tsx             # Client providers
│
├── components/
│   ├── canvas/                   # Canvas-related components
│   │   ├── index.tsx             # Main canvas component
│   │   ├── device-frame.tsx      # Draggable frame component
│   │   ├── theme-selector.tsx    # Theme picker
│   │   └── canvas-controls.tsx   # Zoom/pan controls
│   ├── ui/                       # Reusable UI components (Radix)
│   └── theme-provider.tsx        # Dark mode provider
│
├── context/
│   ├── canvas-context.tsx        # Canvas state management
│   ├── websocket-provider.tsx    # Global WebSocket provider
│   └── query-provider.tsx        # React Query provider
│
├── features/                     # React Query hooks
│   ├── use-project.ts            # Project mutations/queries
│   ├── use-project-id.ts         # Get project by ID
│   └── use-frame.ts              # Frame operations
│
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma client singleton
│   ├── redis.ts                  # Redis client
│   ├── queue.ts                  # BullMQ queue + job types
│   ├── websocket.ts              # Socket.io server
│   ├── deepseek.ts               # DeepSeek AI provider
│   ├── prompt.ts                 # System prompts
│   ├── themes.ts                 # 22 theme definitions
│   ├── tools.ts                  # Unsplash tool
│   └── frame-wrapper.ts          # HTML wrapper with theme CSS
│
├── workers/
│   ├── index.ts                  # BullMQ worker entry point
│   ├── processors/
│   │   ├── generateScreens.ts    # Main orchestrator (analysis + dispatch)
│   │   ├── generateFrame.ts      # Single frame generation (parallel)
│   │   └── regenerateFrame.ts    # Frame modification
│   └── utils/
│       └── emitProgress.ts       # WebSocket event emitter
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Migration history
│
├── server.ts                     # Custom Next.js server (Socket.io)
├── CLAUDE.md                     # Claude Code project instructions
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 8+ (install: `npm install -g pnpm`)
- **MySQL** 8+ (local or cloud instance)
- **Redis** 6+ (local or cloud instance)
- **DeepSeek API Key** ([Get here](https://platform.deepseek.com/))
- **Google AI API Key** ([Get here](https://aistudio.google.com/app/apikey))
- **Unsplash API Key** (optional, [Get here](https://unsplash.com/developers))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/TechWithEmmaYT/XDesign-Mobile-Agent-SaaS.git
cd XDesign-Mobile-Agent-SaaS

# 2. Install dependencies
pnpm install

# 3. Generate Prisma client
pnpm prisma generate

# 4. Set up environment variables (see below)
cp .env.example .env
# Edit .env with your credentials

# 5. Run database migrations
pnpm prisma migrate dev

# 6. (Optional) Seed database with demo user
pnpm prisma db seed
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/xdesign"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"

# Redis (BullMQ + Cache)
REDIS_URL="redis://localhost:6379"

# AI APIs
DEEPSEEK_API_KEY="sk-your-deepseek-api-key"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"

# Unsplash (Optional)
UNSPLASH_ACCESS_KEY="your-unsplash-access-key"

# Node Environment
NODE_ENV="development"
```

### Generate NextAuth Secret

```bash
openssl rand -base64 32
```

---

## 💻 Development Guide

### Start All Services

```bash
# Terminal 1: Start Redis (if not running as service)
redis-server

# Terminal 2: Start Next.js dev server + Worker
pnpm dev

# This runs both:
# - Next.js dev server (http://localhost:3000)
# - BullMQ worker (background job processor)
```

### Start Services Separately

```bash
# Terminal 1: Next.js only
pnpm dev:next

# Terminal 2: Worker only
pnpm worker
```

### Other Commands

```bash
# Build for production
pnpm build

# Start production server (after build)
pnpm start

# Start production worker (separate process)
pnpm start:worker

# Lint code
pnpm lint

# Database operations
pnpm prisma studio        # Open Prisma Studio GUI
pnpm prisma migrate dev   # Create new migration
pnpm prisma db push       # Push schema without migration
pnpm prisma db seed       # Seed database

# Install Puppeteer Chromium (for screenshots)
npx puppeteer browsers install chrome
```

### Development Workflow

1. **Create a new feature**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make database changes**
   ```bash
   # Edit prisma/schema.prisma
   pnpm prisma migrate dev --name my_migration
   ```

3. **Test locally**
   - Ensure Redis is running
   - Run `pnpm dev`
   - Create a project and test generation

4. **Check queue status** (see Queue Management section)

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add my feature"
   git push origin feature/my-feature
   ```

---

## 📊 Queue Management

### Monitor Queue with BullMQ Board

Install BullMQ Board globally:

```bash
npm install -g bull-board
```

Run BullMQ Board:

```bash
npx bull-board
```

Access at: **http://localhost:3000/admin/queues**

Features:
- View all jobs (waiting, active, completed, failed)
- Retry failed jobs
- Clean old jobs
- Real-time job progress

### Monitor with Redis CLI

```bash
# Connect to Redis
redis-cli

# View all queue keys
KEYS bull:xdesign-generation:*

# View waiting jobs count
LLEN bull:xdesign-generation:wait

# View active jobs count
LLEN bull:xdesign-generation:active

# View failed jobs count
ZCARD bull:xdesign-generation:failed

# View specific job data
HGETALL bull:xdesign-generation:job-id-here

# Clear all jobs (careful!)
FLUSHDB
```

### Programmatic Queue Inspection

Add this to your code:

```typescript
import { queue } from '@/lib/queue';

// Get job counts
const counts = await queue.getJobCounts();
console.log(counts);
// { waiting: 0, active: 2, completed: 10, failed: 1, delayed: 0 }

// Get all waiting jobs
const waitingJobs = await queue.getWaiting();

// Get all failed jobs
const failedJobs = await queue.getFailed();

// Retry a failed job
const job = await queue.getJob('job-id');
await job?.retry();

// Remove a job
await job?.remove();

// Clean old completed jobs
await queue.clean(24 * 3600 * 1000); // Keep jobs < 24h
```

---

## 🤖 AI Generation Workflow

### Analysis Phase (DeepSeek v3)

**Input:** User prompt (e.g., "Create a finance tracking app")

**Process:**
```typescript
// System Prompt: ANALYSIS_CN_PROMPT (Chinese)
// Analyzes prompt and returns structured JSON

const result = await generateText({
  model: deepseek("deepseek-v3-1-250821"),
  system: ANALYSIS_CN_PROMPT,
  prompt: userPrompt,
});

// Output Schema (Zod)
{
  theme: "midnight",
  screens: [
    {
      id: "finance-dashboard",
      name: "Finance Dashboard",
      purpose: "Overview of financial health",
      visualDescription: "Dark gradient, large balance display, bar chart..."
    },
    // ... up to 4 screens
  ]
}
```

### Generation Phase (Gemini 3 Pro) - Concurrent

**For each screen (runs in parallel):**

```typescript
// System Prompt: GENERATION_CN_SYSTEM_PROMPT (Chinese)
// Generates production-ready HTML

const result = await generateText({
  model: deepseek("deepseek-v3-1-250821"),
  system: GENERATION_CN_SYSTEM_PROMPT,
  tools: { searchUnsplash: unsplashTool },
  prompt: `
    Screen: ${screen.name}
    Purpose: ${screen.purpose}
    Visual: ${screen.visualDescription}
    Theme: ${themeCSS}
    Previous Screens: ${previousFramesHTML}
  `,
});

// Output: Raw HTML with Tailwind classes
<div class="w-full min-h-screen bg-[var(--background)]">
  <!-- Mobile UI content -->
</div>
```

### Theme Variables Injection

Each frame is wrapped with theme CSS:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      /* Base Variables */
      --font-sans: 'Inter', sans-serif;
      --radius: 0.5rem;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);

      /* Theme-specific (e.g., midnight) */
      --background: 222.2 84% 4.9%;
      --foreground: 210 40% 98%;
      --primary: 263 70% 50.4%;
      --secondary: 222.2 47.4% 11.2%;
      /* ... */
    }
  </style>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
</head>
<body>
  ${generatedHTML}
  <script>
    // Send height to parent for iframe resize
    window.parent.postMessage({
      type: 'FRAME_HEIGHT',
      frameId: '${frameId}',
      height: document.body.scrollHeight
    }, '*');
  </script>
</body>
</html>
```

### Unsplash Tool Calling

AI can request real images during generation:

```typescript
// Tool definition
{
  searchUnsplash: {
    description: "Search Unsplash for high-quality images",
    parameters: z.object({
      query: z.string(),
      orientation: z.enum(["landscape", "portrait", "squarish"]),
    }),
    execute: async ({ query, orientation }) => {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&orientation=${orientation}`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      );
      return response.json();
    },
  }
}

// AI usage example:
// 1. AI decides it needs a beach image
// 2. Calls searchUnsplash({ query: "beach sunset", orientation: "landscape" })
// 3. Gets image URLs
// 4. Uses in generated HTML: <img src="https://images.unsplash.com/photo-123..." />
```

---

## 🔌 WebSocket Events

### Client Connection

```typescript
// Automatic connection via WebSocketProvider
import { useWebSocket } from '@/context/websocket-provider';

const { freshData, isConnected } = useWebSocket();

// freshData: array of all received messages
// isConnected: boolean connection status
```

### Event Types

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `generation.start` | Server → Client | `{ status: "running", projectId }` | Generation job started |
| `analysis.start` | Server → Client | `{ status: "analyzing", projectId }` | AI analyzing prompt |
| `analysis.complete` | Server → Client | `{ theme, totalScreens, screens[], projectId }` | Analysis done, screens planned |
| `frames.created` | Server → Client | `{ frames[], projectId }` | Empty frames created in DB |
| `frame.updated` | Server → Client | `{ frameId, frame, projectId }` | Frame HTML generated |
| `generation.complete` | Server → Client | `{ status: "completed", projectId }` | All frames done |
| `generation.error` | Server → Client | `{ error, projectId }` | Generation failed |
| `frame.error` | Server → Client | `{ frameId, error, projectId }` | Single frame failed |

### Example Event Flow

```typescript
// canvas-context.tsx listening to events

useEffect(() => {
  freshData.forEach((message) => {
    const { topic, data } = message;

    switch (topic) {
      case "frames.created":
        // Add empty frames to UI
        setFrames(prev => [...prev, ...data.frames]);
        break;

      case "frame.updated":
        // Update specific frame with HTML
        setFrames(prev =>
          prev.map(f =>
            f.id === data.frameId ? data.frame : f
          )
        );
        break;

      // ... other events
    }
  });
}, [freshData]);
```

---

## 🎨 Theme System

### Available Themes (22 total)

```typescript
const THEME_LIST = [
  { id: "midnight", name: "Midnight" },
  { id: "ocean-breeze", name: "Ocean Breeze" },
  { id: "forest-sage", name: "Forest Sage" },
  { id: "sunset-coral", name: "Sunset Coral" },
  { id: "neo-brutalism", name: "Neo Brutalism" },
  // ... 17 more
];
```

### Theme Structure

Each theme defines CSS variables:

```typescript
{
  id: "midnight",
  name: "Midnight",
  style: `
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 263 70% 50.4%;
    --primary-foreground: 210 20% 98%;
    --secondary: 222.2 47.4% 11.2%;
    --muted: 217.2 32.6% 17.5%;
    --accent: 217.2 32.6% 17.5%;
    --destructive: 0 62.8% 30.6%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 263 70% 50.4%;
  `
}
```

### Switching Themes

```typescript
// In ThemeSelector component
const { setTheme } = useCanvas();

// User clicks theme
setTheme("ocean-breeze");

// Triggers:
// 1. Local state update (instant)
// 2. Database update (persisted)
// 3. iframe HTML recalculation (useMemo)
// 4. Frames re-render with new theme
```

### Theme Usage in AI Generation

```typescript
// AI uses theme variables, not hardcoded colors
<div class="bg-[var(--background)] text-[var(--foreground)]">
  <button class="bg-[var(--primary)] text-[var(--primary-foreground)]">
    Click me
  </button>
</div>

// NOT this:
<div class="bg-gray-900 text-white">
  <button class="bg-purple-600 text-white">Click me</button>
</div>
```

---

## 📡 API Documentation

### Authentication Required

All routes require authentication via NextAuth session.

```typescript
const session = await getServerSession(authOptions);
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### POST `/api/project`

Create new project and start generation.

**Request:**
```json
{
  "prompt": "Create a fitness tracking app with workout history"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "AI-generated name",
    "theme": null,
    "thumbnail": null,
    "userId": "uuid",
    "createdAt": "2026-01-06T..."
  }
}
```

**Side Effects:**
- Creates project in DB
- Adds `generate-screens` job to BullMQ
- Returns immediately (generation happens in background)

### GET `/api/project`

Get all user's projects.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Fitness Tracker",
      "theme": "ocean-breeze",
      "thumbnail": "data:image/png;base64,...",
      "createdAt": "2026-01-06T...",
      "frames": [...]
    }
  ]
}
```

### GET `/api/project/[id]`

Get single project with frames.

**Response:**
```json
{
  "id": "uuid",
  "name": "Fitness Tracker",
  "theme": "ocean-breeze",
  "frames": [
    {
      "id": "uuid",
      "title": "Dashboard",
      "htmlContent": "<div>...</div>",
      "createdAt": "2026-01-06T..."
    }
  ]
}
```

### POST `/api/project/[id]`

Add screens to existing project.

**Request:**
```json
{
  "prompt": "Add a settings screen with profile editing"
}
```

**Response:**
```json
{
  "success": true
}
```

**Side Effects:**
- Adds `generate-screens` job with existing frames as context

### PATCH `/api/project/[id]`

Update project theme.

**Request:**
```json
{
  "themeId": "neo-brutalism"
}
```

**Response:**
```json
{
  "success": true,
  "project": { ... }
}
```

### POST `/api/project/[id]/frame/regenerate`

Regenerate single frame with new prompt.

**Request:**
```json
{
  "frameId": "uuid",
  "prompt": "Make the dashboard more minimalist"
}
```

**Response:**
```json
{
  "success": true
}
```

**Side Effects:**
- Adds `regenerate-frame` job to BullMQ

### DELETE `/api/project/[id]/frame/delete`

Delete a frame.

**Request:**
```json
{
  "frameId": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST `/api/screenshot`

Generate PNG from HTML.

**Request:**
```json
{
  "html": "<html>...</html>",
  "width": 420,
  "height": 800,
  "projectId": "uuid" // optional, saves as thumbnail
}
```

**Response:**
- Binary PNG image (Content-Type: image/png)
- Or JSON: `{ thumbnail: "data:image/png;base64,..." }` if projectId provided

### GET `/api/ws/token`

Get JWT token for WebSocket authentication.

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Token payload:**
```json
{
  "userId": "uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## 🚢 Production Deployment

### PM2 Deployment (VPS/Local Server)

PM2 is a production process manager that keeps your applications running with automatic restarts and monitoring.

**Install PM2:**
```bash
npm install -g pm2
# or
pnpm add -g pm2
```

**Start all services (server + worker):**
```bash
# Production mode
pm2 start ecosystem.config.cjs

# Development mode
pm2 start ecosystem.config.cjs --env development
```

**View running processes:**
```bash
pm2 status
# or
pm2 list
```

**View logs:**
```bash
# All logs
pm2 logs

# Specific service logs
pm2 logs xdesign-server
pm2 logs xdesign-worker

# Clear logs
pm2 flush
```

**Stop/Restart services:**
```bash
# Stop all
pm2 stop all

# Stop specific service
pm2 stop xdesign-server
pm2 stop xdesign-worker

# Restart all
pm2 restart all

# Restart specific service
pm2 restart xdesign-server
pm2 restart xdesign-worker
```

**Monitor resource usage:**
```bash
pm2 monit
```

**Remove processes:**
```bash
pm2 delete all
```

**Enable auto-restart on system reboot:**
```bash
# Save current process list
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions shown to enable startup
```

**Configuration:**
The `ecosystem.config.cjs` file manages both processes:
- `xdesign-server`: Runs on port 8787 (production) or 8777 (development)
- `xdesign-worker`: Background job processor

**Important Notes:**
- Ensure Redis is running before starting PM2
- Both server and worker will auto-restart if they crash
- Use `pm2 logs` to debug issues
- For production, always run `pm2 save` after starting

---

### Vercel Deployment (Recommended)

**Prerequisites:**
- Vercel account
- MySQL database (PlanetScale, Railway, etc.)
- Redis instance (Upstash, Railway, etc.)

**Steps:**

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository

3. **Configure Environment Variables**
   - Add all `.env` variables
   - **Important:** Use production URLs for Redis and MySQL

4. **Configure Build Settings**
   ```bash
   Build Command: pnpm build
   Output Directory: .next
   Install Command: pnpm install
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

6. **Run Worker Separately**

   Option 1: Use Vercel Cron (Limited)
   - Not ideal for long-running workers

   Option 2: Deploy worker to separate service
   ```bash
   # Railway, Render, or DigitalOcean
   # Run: pnpm start:worker
   ```

   Option 3: Use serverless background jobs
   - Consider Trigger.dev or Inngest for managed solution

### Environment-Specific Code

The app automatically detects environment:

```typescript
// Screenshot generation
if (process.env.NODE_ENV === "production") {
  // Use @sparticuz/chromium-min (Vercel-optimized)
  const chromium = await import("@sparticuz/chromium-min");
  const executablePath = await chromium.executablePath();
} else {
  // Use local Puppeteer
  const executablePath = undefined; // Auto-detect
}
```

### Post-Deployment

1. **Run migrations**
   ```bash
   npx prisma migrate deploy
   ```

2. **Test WebSocket connection**
   - Create a project
   - Verify real-time updates work

3. **Monitor queue**
   - Check Redis dashboard
   - Ensure worker is processing jobs

4. **Set up monitoring**
   - Vercel Analytics
   - Sentry for error tracking
   - LogTail for logs

---

## 🐛 Troubleshooting

### Redis Connection Failed

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
```bash
# Start Redis
redis-server

# Or install Redis
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis
```

### Prisma Client Not Found

**Error:** `Error: @prisma/client did not initialize yet`

**Solution:**
```bash
pnpm prisma generate
```

### Worker Not Processing Jobs

**Symptoms:**
- Jobs stuck in "waiting" state
- No progress events

**Solutions:**
1. Check worker is running: `pnpm worker`
2. Check Redis connection
3. Check worker logs for errors
4. Restart worker: `Ctrl+C` then `pnpm worker`

### WebSocket Not Connecting

**Error:** Console shows WebSocket connection failed

**Solutions:**
1. Ensure custom server is running: `pnpm dev` (not `next dev`)
2. Check `/api/ws/token` returns valid JWT
3. Check Socket.io logs in terminal
4. Clear browser cache

### AI Generation Fails

**Error:** `generation.error` event received

**Solutions:**
1. Check API keys are valid
2. Check API rate limits (DeepSeek/Gemini)
3. Check worker logs for detailed error
4. Retry failed job from BullMQ Board

### Database Migration Conflicts

**Error:** `Migration X failed to apply`

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Or manually fix
pnpm prisma studio  # Edit conflicting data
pnpm prisma migrate deploy
```

### Puppeteer/Chromium Issues

**Error:** `Error: Failed to launch the browser process`

**Solutions:**
```bash
# Install Chromium manually
npx puppeteer browsers install chrome

# Or use system Chrome
# Set environment variable
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

---

## 📚 Additional Resources

- **Next.js Documentation:** [nextjs.org/docs](https://nextjs.org/docs)
- **Prisma Documentation:** [prisma.io/docs](https://www.prisma.io/docs)
- **BullMQ Documentation:** [docs.bullmq.io](https://docs.bullmq.io)
- **Socket.io Documentation:** [socket.io/docs](https://socket.io/docs)
- **DeepSeek API:** [platform.deepseek.com](https://platform.deepseek.com/api-docs)
- **Gemini API:** [ai.google.dev](https://ai.google.dev)

---

## 📄 License

This code, whether in parts or whole, is licensed for commercial use **only with a license**.
It is **free for personal use**.

**Commercial License:**
👉 [Get a Commercial License](https://techwithemma.gumroad.com/l/ogphz) **with the ENV**

For more details, see [TECHWITHEMMA-LICENSE.md](https://github.com/TechWithEmmaYT/XDesign-Mobile-Agent-SaaS/blob/main/TECHWITHEMMA-LICENSE.md)

---

## 🙏 Acknowledgments

- **Tech With Emma** - Original creator and maintainer
- **DeepSeek** - AI analysis engine
- **Google Gemini** - HTML generation engine
- **Vercel** - Deployment platform
- **All contributors** - Thank you for your support!

---

## 📺 Subscribe for More Projects

I build real-world SaaS, AI agents, and production-grade systems.

🔔 **Subscribe:** [https://dub.sh/subcribe-to-channel](https://dub.sh/subcribe-to-channel)

☕ **Buy Me a Coffee:** [https://dub.sh/buy-me-coffee](https://dub.sh/buy-me-coffee)

⭐ **Star this repo** if you found it helpful!

---

Made with ❤️ by [Tech With Emma](https://github.com/TechWithEmmaYT)
