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
  * Fixed finishTimer functionality - now correctly removes timers from active sessions
  * Added SQL validation to filter out finalized timers (endTime < startTime)
- July 01, 2025 (21:32): Fixed validation system for time entry deletion:
  * Corrected SQLiteStorage.getTimeEntry() to properly map database fields to TypeScript objects
  * Implemented validation to prevent deletion of active time entries (endTime null or isRunning true)
  * Added proper error messages in Portuguese for blocked deletions
  * Validated system: active entries show "Fim N/A" and are protected from deletion
  * Finalized entries can be safely deleted from history
- July 01, 2025 (21:46): Implemented task completion and management system:
  * Added "Finalizar e Concluir" button in timer page - finalizes timer and marks task as completed
  * Created complete/reopen task endpoints (/api/tasks/:id/complete and /api/tasks/:id/reopen)
  * Updated tasks page to separate active and completed activities
  * Completed tasks show with visual indicators and can be reopened
  * Filtered completed tasks from timer selection - only active tasks selectable
  * Added proper notifications and error handling for task state changes
- July 01, 2025 (22:00): Enhanced task management and documentation:
  * Resolved interface freeze issue (browser cache problem resolved by reopening preview)
  * Successfully tested complete task functionality with proper status separation
  * Cleaned up debug logs and finalized task completion system
  * Updated API documentation with all new endpoints (complete, reopen, reports, timer)
  * Documented all advanced timer functionality and validation features
  * Enhanced filter system for task organization by status, search term, and color
  * System now fully supports active/completed task workflow with seamless transitions
- July 01, 2025 (22:37): Implemented robust data persistence solution:
  * Migrated SQLite database from root to dedicated data/ directory for better organization
  * Added automatic backup system creating hourly backups in data/backups/ directory
  * Implemented backup retention policy (keeps 5 most recent backups)
  * Updated .gitignore to protect database files from being committed to Git
  * Fixed ES module imports in SQLiteStorage for proper Node.js compatibility
  * Database path now uses absolute paths to ensure persistence across builds and deployments
  * Added export functionality for data migration and additional backup options
- July 01, 2025 (23:48): Resolved Render deployment build failure and optimized for production:
  * Fixed critical build error by moving vite and esbuild from devDependencies to dependencies
  * Resolved ES module import conflicts that prevented PostgreSQL integration
  * Created comprehensive Render deployment guide with step-by-step instructions
  * Implemented PostgreSQL migration script for seamless database transition
  * Added intelligent database detection system (PostgreSQL when DATABASE_URL present, SQLite fallback)
  * Verified build process works locally and ready for Render deployment
  * Documentation complete with troubleshooting steps and environment variable configuration
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```