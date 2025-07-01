# Pontual - Sistema de Controle de Tempo e Tarefas

## Overview

Pontual is a Brazilian Portuguese time tracking and task management application that provides intelligent time management with advanced reporting and productivity control features. The system allows users to track activities with timers, manage subtasks, generate reports, and maintain detailed history of their work sessions.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Icons**: Lucide React icon library
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM (configurable to use SQLite via better-sqlite3)
- **API Design**: RESTful API endpoints with proper HTTP status codes
- **Validation**: Zod schemas for input validation
- **Build Process**: ESBuild for server bundling

### Authentication
- **Provider**: Firebase Authentication
- **Flow**: Email/password authentication with session management
- **Protection**: Route-level authentication guards

## Key Components

### Task Management System
- **Tasks**: Core entities with properties like name, description, color coding, estimated hours, and deadlines
- **Task Items**: Subtasks/checklist items associated with each task
- **Color Coding**: Visual organization with predefined color palette
- **Status Tracking**: Active/inactive task states

### Time Tracking Engine
- **Timer Functionality**: Start/pause/resume/stop operations with real-time updates
- **Manual Entry**: Direct time input for retrospective logging
- **Running State Management**: Prevents multiple timers for the same task
- **Duration Calculation**: Accurate time accumulation across pause/resume cycles

### Reporting and Analytics
- **Dashboard Statistics**: Daily, weekly, and monthly time summaries
- **Task Analytics**: Time distribution across different activities
- **Export Capabilities**: CSV and PDF export with date filtering
- **Visual Indicators**: Progress tracking and deadline monitoring

### Data Models
- **Users**: Authentication and user management
- **Tasks**: Activity definitions with metadata
- **Task Items**: Subtask/checklist functionality
- **Time Entries**: Time tracking records with start/end times and duration

## Data Flow

1. **Authentication Flow**: Firebase handles user authentication, with React context managing auth state
2. **Data Fetching**: TanStack Query manages API calls with automatic caching and background updates
3. **Real-time Updates**: Timer components update every 5 seconds when active
4. **State Synchronization**: Mutations automatically invalidate related queries for data consistency
5. **Optimistic Updates**: UI updates immediately with server sync happening in background

## External Dependencies

### Core Framework Dependencies
- React 18+ with TypeScript support
- Express.js for backend API
- Drizzle ORM for database operations
- Firebase for authentication services

### UI and Styling
- Tailwind CSS for utility-first styling
- Radix UI for accessible component primitives
- shadcn/ui for pre-built components
- Lucide React for consistent iconography

### Development and Build Tools
- Vite for development server and building
- ESBuild for server bundling
- TypeScript for type checking
- PostCSS for CSS processing

### Database Options
- PostgreSQL (primary) via @neondatabase/serverless
- SQLite (alternative) via better-sqlite3
- Drizzle Kit for schema management and migrations

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR
- tsx for TypeScript execution in development
- Concurrent frontend and backend development setup

### Production Build
- Frontend: Vite build to static assets
- Backend: ESBuild bundle for Node.js deployment
- Environment-specific configuration via environment variables

### Database Configuration
- Drizzle configuration supports both PostgreSQL and SQLite
- Schema defined in shared directory for type consistency
- Migration support via Drizzle Kit

## Changelog
```
Changelog:
- July 01, 2025. Initial setup
- July 01, 2025 (21:00): Implemented timer system improvements:
  * Fixed pause/resume functionality with proper state management
  * Added prevention of multiple active sessions for same task
  * Created finishTimer function to remove sessions from active list
  * Improved distinction between paused sessions (temporary) and finished sessions (permanent)
  * Updated backend query to show running timers AND paused sessions from last 4 hours
  * Fixed paused timers visibility - they now remain in active sessions for resumption
  * Connected project to GitHub repository: https://github.com/gabrielagithub/pontualApp.git
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```