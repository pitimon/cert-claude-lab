# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack) on localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all tests (Vitest)
npx vitest run src/components/chat/__tests__/MessageList.test.tsx  # Single test
npm run setup        # Install deps + Prisma generate + migrate
npm run db:reset     # Reset database (destructive)
```

## What This Is

UIGen is an AI-powered React component generator. Users describe a component in chat, Claude generates/edits files via tool calls, and a live preview renders the result — all without writing to disk.

## Architecture

### Core Flow

1. User sends chat message → `POST /api/chat` streams Claude response via Vercel AI SDK
2. Claude uses two tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete)
3. Tool calls update an in-memory `VirtualFileSystem` (Map-based, no disk I/O)
4. `jsx-transformer.ts` compiles files with Babel standalone → blob URLs via import map
5. Preview iframe loads the entry point (`/App.jsx`) with error boundary

### State Management

Two React Contexts drive the UI:

- **ChatProvider** (`lib/contexts/chat-context.tsx`): Wraps Vercel AI SDK's `useChat`. Handles tool invocations by dispatching file operations to FileSystemContext.
- **FileSystemProvider** (`lib/contexts/file-system-context.tsx`): Owns the `VirtualFileSystem` instance. Exposes file CRUD operations and a refresh counter that triggers preview re-renders.

### Virtual File System

`lib/file-system.ts` implements an in-memory tree with path-based lookups. Key behaviors:
- Auto-creates parent directories on file write
- Serializable to/from JSON for Prisma persistence
- Path normalization strips leading slashes

### AI Tool Definitions

Defined in `lib/tools/`:
- `str_replace_editor`: Modes are `create` (new file), `str_replace` (exact string swap), `insert` (at line number)
- `file_manager`: `rename` and `delete` operations

The system prompt lives in `lib/prompts/generation.tsx` — instructs Claude to produce React + Tailwind components.

### Auth

JWT tokens in httpOnly cookies (via `jose`), verified in `middleware.ts`. Server actions in `src/actions/` handle sign-up/sign-in/sign-out. Anonymous users can use the app without signing in; work is preserved in localStorage via an anon work tracker.

### Database

SQLite via Prisma. Two models:
- **User**: email, hashed password
- **Project**: name, userId, `messages` (JSON), `data` (JSON — serialized VirtualFileSystem)

### Preview Rendering

`PreviewFrame.tsx` creates an iframe with a dynamic import map (blob URLs for each file). Babel transforms JSX at runtime. Missing imports get stub modules. Runtime errors are caught by an error boundary and displayed with file/line info.

## Key Files

| File | Purpose |
|---|---|
| `src/app/api/chat/route.ts` | Streaming chat endpoint with tool calling |
| `src/lib/file-system.ts` | VirtualFileSystem implementation |
| `src/lib/transform/jsx-transformer.ts` | Babel JSX → ES modules for preview |
| `src/lib/prompts/generation.tsx` | System prompt for component generation |
| `src/lib/provider.ts` | Anthropic model config + mock fallback |
| `src/middleware.ts` | Auth route protection |
| `src/app/[projectId]/page.tsx` | Main project page (protected) |

## Environment Variables

- `ANTHROPIC_API_KEY` — Claude API key. If absent, a mock provider returns static components.
- `JWT_SECRET` — Signs auth tokens. Defaults to a dev-only secret when `NODE_ENV !== 'production'`.

## Testing

Vitest with jsdom and React Testing Library. Tests live in `__tests__/` folders next to their source. Component tests exist for chat, editor, and file system context.
