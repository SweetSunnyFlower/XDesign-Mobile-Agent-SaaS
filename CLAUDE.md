# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XDesign AI is an AI-powered mobile design agent SaaS that generates mobile UI screens from text prompts. It uses AI to create production-ready HTML/CSS mobile screens with customizable themes, draggable canvas interface, and real-time updates.

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Run development server (starts both Next.js + Worker)
pnpm dev

# Run Next.js server only
pnpm dev:next

# Run Worker only
pnpm worker

# Build for production
pnpm build

# Start production server
pnpm start

# Start production worker (run in separate process)
pnpm start:worker

# Lint code
pnpm lint

# Generate Prisma client (runs automatically on postinstall)
pnpm prisma generate
```

**Important**: You must have Redis running locally before starting the development server:
```bash
redis-server
```

## Architecture Overview

### Core Technology Stack

- **Framework**: Next.js 16 (App Router) with Custom Server
- **Database**: MySQL with Prisma ORM
- **Authentication**: NextAuth v5 (credentials-based)
- **Queue System**: BullMQ with Redis
- **Real-time**: Socket.io (WebSocket)
- **AI Models**:
  - DeepSeek v3 for analysis and project name generation
  - Google Gemini 3 Pro for HTML generation
- **Background Jobs**: BullMQ Workers (separate process)
- **Screenshot Generation**: Puppeteer (with Chromium for production)
- **State Management**: React Query (@tanstack/react-query)
- **Styling**: Tailwind CSS v4

### Data Model

**User → Project → Frame** hierarchy:
- User: email/password authentication
- Project: has a theme, name, thumbnail, and multiple frames
- Frame: individual mobile screen with title and HTML content

Prisma client is generated to `lib/generated/prisma/` (not the default location).

### AI Generation Workflow

The core AI workflow is an event-driven, multi-step process:

1. **User submits prompt** → Creates project and adds job to BullMQ queue
2. **BullMQ Worker** (`workers/index.ts`) picks up the job and routes to appropriate processor:
   - **Analysis phase** (`workers/processors/generateScreens.ts`): DeepSeek analyzes prompt and returns 1-4 screen plans with theme
   - **Generation phase**: For each screen, Gemini generates HTML using:
     - Theme CSS variables from `lib/themes.ts` (22 predefined themes)
     - Previous screens as context for consistency
     - Unsplash tool for real images
     - Strict prompt rules from `lib/prompt.ts`
3. **Real-time updates**: Worker emits events via Socket.io to user-specific room
4. **Client subscribes** to WebSocket updates via `useWebSocket` hook

**Key files**:
- `workers/index.ts` - BullMQ worker entry point
- `workers/processors/generateScreens.ts` - Main generation orchestrator
- `workers/processors/regenerateFrame.ts` - Single frame regeneration
- `lib/queue.ts` - BullMQ queue configuration
- `lib/websocket.ts` - Socket.io server singleton
- `server.ts` - Custom Next.js server with Socket.io integration
- `lib/prompt.ts` - System prompts for analysis and generation
- `lib/themes.ts` - Theme definitions and CSS variables

### Canvas & Frame Rendering

Frames are rendered in iframes with dynamic height calculation:

1. **Frame wrapper** (`lib/frame-wrapper.ts`): Wraps HTML with theme variables, fonts, Tailwind CDN, and Iconify
2. **PostMessage communication**: Iframe sends height to parent via `postMessage`
3. **Device Frame** (`components/canvas/device-frame.tsx`): Draggable container using `react-rnd`
4. **Canvas Context** (`context/canvas-context.tsx`): Manages frames, theme, and canvas state

Generated HTML screens:
- Use only Tailwind CSS classes and CSS variables
- Include Iconify icons (`<iconify-icon>`)
- SVG-only charts (no canvas/JavaScript)
- Mobile-optimized with hidden scrollbars

### Authentication Flow

- NextAuth v5 with credentials provider
- Session stored as JWT (30-day expiration)
- Protected routes via middleware
- Login/register pages at `/login` and `/register`
- Auth configuration in `lib/auth.ts`

### API Routes Structure

```
app/api/
├── auth/[...nextauth]/  # NextAuth handlers
├── inngest/             # Inngest webhook endpoint
├── project/
│   ├── route.ts        # Create/list projects
│   └── [id]/
│       ├── route.ts    # Get/update/delete project
│       └── frame/
│           ├── regenerate/  # Regenerate single frame
│           └── delete/      # Delete frame
└── screenshot/         # Generate PNG from HTML
```

### Environment-Specific Behavior

Screenshot generation (`app/api/screenshot/route.ts`):
- **Development**: Uses local Puppeteer
- **Production (Vercel)**: Uses `@sparticuz/chromium-min` with cached executable path

## AI Prompt Engineering

The system uses carefully crafted prompts to ensure consistent, high-quality output:

**Analysis prompt** (`ANALYSIS_PROMPT`):
- Returns structured JSON with screens array
- Each screen has: id, name, purpose, visualDescription
- Selects theme from 22 predefined options
- Provides explicit bottom navigation rules

**Generation prompt** (`GENERATION_SYSTEM_PROMPT`):
- Enforces Dribbble-quality design standards
- Requires CSS variables for colors
- Prohibits JavaScript, canvas, markdown
- Includes detailed chart patterns (SVG only)
- Bottom nav must match existing screens

## Real-time Updates

Socket.io WebSocket system for server-to-client streaming:

1. Server emits events during generation via `emitToUser()` helper
2. Client fetches JWT token via `/api/ws/token`
3. Client connects to Socket.io server and joins `user:${userId}` room
4. Events: `generation.start`, `analysis.start`, `analysis.complete`, `frame.created`, `generation.complete`
5. Canvas updates live as frames are generated

**Architecture**:
- `server.ts` - Custom Next.js server with Socket.io attached
- `lib/websocket.ts` - Socket.io server initialization and JWT authentication
- `hooks/useWebSocket.ts` - Client hook for WebSocket connection
- `workers/utils/emitProgress.ts` - Worker helper to emit events to users

## Component Organization

- `components/canvas/` - Canvas, device frames, toolbars, controls
- `components/ui/` - Reusable UI primitives (Radix UI + Tailwind)
- `components/ai-elements/` - AI-specific components (code blocks, suggestions)
- `context/` - React context providers (canvas, query)
- `features/` - React Query hooks for data fetching

## Database Operations

Always use `prisma` from `lib/prisma.ts`:
```typescript
import prisma from "@/lib/prisma";
```

Prisma client output is in `lib/generated/prisma/` due to custom configuration in `prisma.config.ts`.

## Queue System

BullMQ with Redis for background job processing:

**Adding jobs**:
```typescript
import { addGenerateScreensJob, addRegenerateFrameJob } from "@/lib/queue";

await addGenerateScreensJob({
  userId,
  projectId,
  prompt,
  frames, // optional, for adding to existing project
  theme, // optional
});
```

**Workers**:
- Run in separate process via `pnpm worker` (development) or `pnpm start:worker` (production)
- Processes jobs concurrently (default: 2)
- Automatic retry on failure (3 attempts with exponential backoff)
- Emits progress updates via WebSocket

## Theme System

22 predefined themes in `lib/themes.ts`:
- Each theme defines CSS variables (--primary, --background, --foreground, etc.)
- `BASE_VARIABLES` includes fonts and shadows
- Themes are injected into iframe via `getHTMLWrapper()`
- Client can switch themes, triggering regeneration with new theme

## Important Patterns

**Server Actions**: Use `"use server"` directive for AI generation, auth actions
**Client Components**: Canvas and interactive elements use `"use client"`
**Error Handling**: AI generation failures return fallback values, not errors
**Caching**: Chromium path cached to avoid re-downloading on Vercel

## License

This codebase requires a commercial license for commercial use. Free for personal use only.
