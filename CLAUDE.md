# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XDesign AI is an AI-powered mobile design agent SaaS that generates mobile UI screens from text prompts. It uses AI to create production-ready HTML/CSS mobile screens with customizable themes, draggable canvas interface, and real-time updates.

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Generate Prisma client (runs automatically on postinstall)
pnpm prisma generate
```

## Architecture Overview

### Core Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MySQL with Prisma ORM
- **Authentication**: NextAuth v5 (credentials-based)
- **AI Models**:
  - DeepSeek v3 for analysis and project name generation
  - Google Gemini 3 Pro for HTML generation
- **Background Jobs**: Inngest with real-time updates
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

1. **User submits prompt** → Creates project and triggers `ui/generate.screens` event
2. **Inngest function** (`inngest/functions/generateScreens.ts`):
   - **Analysis phase**: DeepSeek analyzes prompt and returns 1-4 screen plans with theme
   - **Generation phase**: For each screen, Gemini generates HTML using:
     - Theme CSS variables from `lib/themes.ts` (22 predefined themes)
     - Previous screens as context for consistency
     - Unsplash tool for real images
     - Strict prompt rules from `lib/prompt.ts`
3. **Real-time updates**: Inngest publishes events to user-specific channel
4. **Client subscribes** to realtime updates via `@inngest/realtime`

**Key files**:
- `inngest/functions/generateScreens.ts` - Main generation orchestrator
- `inngest/functions/regenerateFrame.ts` - Single frame regeneration
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

Inngest realtime middleware enables server-to-client streaming:

1. Server publishes events during generation: `generation.start`, `analysis.start`, `analysis.complete`, `frame.created`, `generation.complete`
2. Client fetches token via `app/action/realtime.ts`
3. Client subscribes to `user:${userId}` channel
4. Canvas updates live as frames are generated

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
