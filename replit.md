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
- July 01, 2025 (23:59): Simplified to SQLite-only solution for maximum reliability:
  * Removed PostgreSQL complexity per user preference for simplicity
  * Configured SQLite for persistent deployment by removing from .gitignore
  * Database file now included in Git repository for deploy persistence
  * Backup system remains active for data protection
  * Solution ensures no data loss between Render deploys while maintaining simplicity
- July 02, 2025 (04:06): Enhanced WhatsApp integration with advanced filtering and task management:
  * Added group-specific filtering - restricts bot responses to configured WhatsApp group only
  * Implemented new commands: concluir (complete task), reabrir (reopen task), lancar-concluir (log time and complete)
  * Updated task listing to show only active tasks with enhanced information (time worked, deadlines)
  * Enhanced webhook processing to detect group vs individual messages
  * Added group name extraction and filtering logic in message processing
  * Updated frontend configuration to include group filtering settings
  * All WhatsApp commands now work with task IDs for better precision
- July 02, 2025 (05:30): Created comprehensive WhatsApp documentation:
  * Created detailed WHATSAPP_SETUP.md with complete manual configuration guide
  * Added step-by-step setup instructions for Evolution API and Pontual integration
  * Enhanced README.md with WhatsApp integration overview and command reference
  * Extended API_DOCUMENTATION.md with complete WhatsApp endpoints documentation
  * Documented all commands, error codes, authentication flow, and troubleshooting steps
  * Included practical examples and security best practices for production use
- July 02, 2025 (04:54): Enhanced WhatsApp task creation with complete parameter support:
  * Implemented advanced task creation via WhatsApp with full parameter parsing
  * Added support for --desc, --tempo, --prazo, and --cor parameters in task creation
  * Created parseTaskCreationInput method to handle complex parameter extraction
  * Enhanced help message to include detailed examples of advanced task creation
  * Updated API documentation with comprehensive parameter reference and examples
  * Task creation now supports: descriptions, estimated time, deadlines, and color coding
  * All parameters work with both English and Portuguese aliases (--desc/--descricao)
  * Color mapping supports user-friendly names (azul, verde, amarelo, vermelho, roxo)
- July 02, 2025 (04:58): Implemented interactive task selection system for WhatsApp:
  * Added conversational context system to remember last task list for 10 minutes
  * Created interactive selection allowing users to respond with numbers (1, 2, 3...)
  * Implemented direct action commands: "1 iniciar", "2 concluir", "3 lancamento 2h"
  * Added detailed task menu showing all available actions when selecting by number
  * Enhanced task listing to use sequential numbers (1, 2, 3) instead of task IDs
  * Created intelligent parsing for numeric responses with action detection
  * Users can now: list tasks, select by number, perform actions without remembering IDs
  * Greatly simplified WhatsApp workflow: "tarefas" → "1" → see menu → "1 iniciar"
- July 02, 2025 (05:23): Enhanced webhook debugging and case-insensitive commands:
  * Added comprehensive webhook logging to diagnose message reception issues
  * Implemented support for commands with first letter capitalized (Tarefas, Nova, Ajuda, etc.)
  * Added detection and filtering of bot's own messages to prevent loops
  * Enhanced debugging output with detailed message processing steps
  * Created webhook test script for development debugging
  * Improved error handling and logging throughout the WhatsApp integration pipeline
- July 02, 2025 (05:54): Fixed webhook authentication issue and completed WhatsApp integration:
  * Resolved 401 authentication error by implementing conditional middleware for webhook routes
  * Webhook now bypasses authentication while maintaining security for other endpoints
  * Successfully tested message processing from authorized WhatsApp groups
  * Confirmed group filtering works correctly (ignores unauthorized groups/individuals)
  * WhatsApp integration fully functional with commands like "Tarefas" working properly
  * System ready for production use with Evolution API
- July 02, 2025 (15:30): Implemented secure group filtering with JID-based authentication:
  * Added allowedGroupJid field to database schema for precise group identification
  * Fixed message structure parsing to handle Evolution API format correctly (data in root, not array)
  * Implemented strict group filtering using WhatsApp JID instead of unreliable group names
  * Created comprehensive Postman test simulation for webhook validation
  * Updated web interface to configure authorized group JID
  * System now only processes messages from exact configured group JID (e.g., 120363419788242278@g.us)
  * Prevents accidental triggering from unauthorized groups or individual messages
- July 02, 2025 (16:51): Resolved message text extraction and database JID storage issues:
  * Fixed database storage problem where JID field wasn't being saved properly from web interface
  * Enhanced message text extraction to support multiple Evolution API message formats
  * Added comprehensive debugging for message structure analysis when text extraction fails
  * Created database verification script to diagnose and fix JID storage issues
  * System now successfully captures and processes WhatsApp messages with proper group filtering
  * Only remaining issue: Evolution API instance "pontualApp" doesn't exist (404 error)
- July 03, 2025 (03:10): Completely resolved WhatsApp integration data persistence and functionality:
  * Fixed critical bug in updateWhatsappIntegration() - allowedGroupJid field was missing from SQL update
  * Implemented smart API key handling - preserves existing key when field is empty during updates
  * Corrected form validation to prevent overwriting saved data with empty values
  * Successfully connected to Evolution API using correct instance name "pontulApp"
  * WhatsApp bot now fully operational - processes commands, sends responses, filters by group JID
  * Commands like "listar" working perfectly with 201 success responses from Evolution API
  * All data persistence issues resolved - JID and API configurations save correctly
- July 03, 2025 (03:35): Simplified WhatsApp menu interface for maximum user clarity:
  * Completely redesigned help message from verbose technical documentation to simple command guide
  * Simplified task list options from complex descriptions to clear "Liga timer", "Para timer", "Finaliza"
  * Enhanced menu individual de tarefas showing clear status (RODANDO/PARADO) with minimal options
  * Implemented automatic case-insensitive command processing (TAREFAS = tarefas = Tarefas)
  * Removed technical jargon in favor of natural Portuguese language throughout interface
  * User workflow now streamlined: "tarefas" → see numbered list → "1" → see simple menu → "iniciar"
- July 03, 2025 (03:37): Fixed WhatsApp manual time logging behavior to match web interface:
  * Corrected getRunningTimeEntries() SQL query that incorrectly included manual time entries as active sessions
  * Manual time logging via WhatsApp (e.g., "2 lancamento 45min") now correctly creates finished entries in history
  * Fixed logic to only show truly running timers (is_running = 1) in active sessions, not completed entries
  * WhatsApp behavior now identical to web interface - manual entries go directly to history without appearing as active
  * Validated with comprehensive testing: manual entries create proper historical records without session interference
- July 03, 2025 (03:41): Comprehensive testing confirms 100% behavior parity between WhatsApp and web interface:
  * Tested all 11 core functionalities: task listing, creation (simple/advanced), timer control, manual logging, reports
  * Fixed parseTaskCreationInput time conversion bug (seconds to hours) for estimated time in advanced task creation
  * Validated identical behavior: lançamentos manuais, timer operations, status reports, task completion, interactive selection
  * WhatsApp integration now provides complete feature parity with web interface - users can perform any operation via chat
  * All commands work with case-insensitive input, simplified menus, and natural Portuguese language throughout
- July 03, 2025 (04:04): Updated WhatsApp command vocabulary for better Portuguese localization:
  * Changed "lancamento" to "apontar" as primary command for manual time logging
  * Changed "lancar-concluir" to "apontar-concluir" for log time and complete task action
  * Changed "relatorio" to "resumo" as primary command for reports (resumo, resumo semanal, resumo mensal)
  * Updated help message to show new vocabulary: "📝 APONTAMENTO" and "📊 RESUMOS" sections
  * Updated individual task menus to show "apontar 2h" instead of "lancamento 2h"
  * Maintained backward compatibility - old commands still work alongside new ones
  * Enhanced API key form UX - shows when key is saved and allows empty updates to preserve existing key
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```