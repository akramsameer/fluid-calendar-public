# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added system setting to disable the homepage and redirect to login/calendar
  - Admin-configurable option in System Settings
  - Redirects unauthenticated users to login page
  - Redirects authenticated users to calendar view
  - Default is off (homepage is shown)
  - Added database migration to add the disableHomepage field to SystemSettings
  - Uses direct API calls for real-time setting changes with no caching
- Task synchronization system (Phase 1)
  - Added database schema for task providers and task list mappings
  - Created core interfaces for task synchronization
  - Implemented task sync job processor and queue management
  - Added foundation for multi-provider task synchronization
  - Added API endpoints for managing task providers and mappings
  - Implemented Outlook tasks provider with one-way sync
  - Added intelligent periodic sync scheduler with support for different sync intervals
  - Created settings UI for managing task providers and mappings
  - Added account email resolution for providers to improve user experience
  - Added API endpoint for fetching task lists from providers
- Outlook tasks integration improvements (migration to new task synchronization system)
- First phase of bidirectional task sync implementation:
  - Added bidirectional sync capability to the task sync feature
  - Added direction parameter to the sync API to control sync flow 
  - Enhanced TaskSyncManager to handle different sync directions
  - Added UI controls to set sync direction for providers and mappings
  - Added manual sync button with direction support
- New field mapping system for task synchronization that allows consistent mapping between internal and external task fields
- Provider-specific field mappers to handle different task provider implementations
- Improved task conflict resolution based on update timestamps
- Recurrence rule conversion system for bidirectional sync of recurring tasks
- Provider-specific recurrence converters to handle different recurrence formats
- Support for task recurrence patterns in Outlook sync
- Added OutlookPriority and OutlookStatus enums for improved type safety
- Added Resend API key to SystemSettings for email service configuration
  - Added database migration to add resendApiKey field
  - Added UI field in System Settings for managing the API key
  - Added automatic initialization of resendApiKey from environment variables during setup
  - Enhanced setup process to prevent overwriting existing SystemSettings for better security
- Added setting to control daily email updates about upcoming meetings and tasks
  - Added dailyEmailEnabled field to NotificationSettings model
  - Added UI toggle in notification settings
  - Added database migration for the new field
  - Default is enabled for existing users

### Changed
- Updated task list API endpoint to use existing getMsGraphClient utility from outlook-utils.ts
- Fixed project loading in TaskSyncSettings component to ensure projects are available for mapping
- Fixed API route to properly await dynamic params following NextJS 15 convention
- Fixed TaskListMapping creation API to match Prisma schema (removed settings field)
- Updated API routes to follow project authentication patterns:
  - Replaced getServerSession with authenticateRequest in all task sync API endpoints
- Replaced Google Fonts CDN with self-hosted Inter font to fix intermittent build failures
- Updated waitlist entries sorting to include secondary sorting by priorityScore and createdAt
- Refactored task sync manager to use true bidirectional synchronization instead of two one-way syncs
- Enhanced handling of field preservation during sync to prevent overwriting local fields with null values
- Improved date handling in task synchronization to normalize all dates to UTC
- Fixed type issues in TaskUpdates interface to ensure compatibility with different providers
- Implemented recurrence rule conversion for Outlook tasks using provider pattern
- Improved type safety in recurrence conversion system with better interfaces and removed any types
- Centralized recurrence-related types in a dedicated types file for better maintainability
- Moved Resend API key from environment variables to SystemSettings table
  - Updated email-related services to use the API key from SystemSettings
  - Improved security by storing sensitive credentials in the database

### Fixed
- Added automatic project selection when creating a task from a project view:
  - When viewing a specific project, new tasks are automatically assigned to that project
  - When viewing "No Project", new tasks are created without a project
  - Improves workflow efficiency by reducing clicks needed to organize tasks
- Fixed duplicate task creation in Outlook when creating tasks in FluidCalendar:
  - Refreshed local task data after processing CREATE changes to prevent duplicate processing
  - Added tracking of processed task IDs during sync to avoid creating the same task twice
  - Ensured that tasks with pending sync changes are properly excluded from the unlinked tasks list
- Fixed task deletion not being properly synced to Outlook:
  - Improved task deletion API to create change records before deleting the task
  - Enhanced change tracking to validate required external data for deletions
  - Added special handling in sync manager to prioritize delete operations
  - Improved handling of tasks that appear in Outlook but were deleted in FluidCalendar
  - Fixed database schema to make taskId nullable in TaskChange table to prevent deletion conflicts
  - Enhanced processDeleteChange to better handle task deletions even when the task is gone
  - Improved change record persistence for DELETE operations to ensure sync reliability
- Fixed Prisma validation errors during task synchronization:
  - Properly handled nested objects like tags and project during conflict resolution
  - Removed nested objects from update data to prevent validation errors
  - Replaced any type with proper Record<string, unknown> for better type safety
  - Improved error handling to provide clearer error messages
- Fixed tasks not syncing from FluidCalendar to Outlook in bidirectional sync:
  - Added automatic detection of unlinked local tasks that need initial sync
  - Implemented synthetic change tracking for untracked tasks
  - Added extensive logging to help diagnose sync issues
  - Fixed TaskProvider type reference in syncFromLocalToExternal method
- Fixed bidirectional task sync issue where tasks edited in FluidCalendar were being overwritten by Outlook version:
  - Added timestamp comparison to only update tasks when external version is newer
  - Fixed timestamp tracking when tasks are edited in FluidCalendar
  - Added detailed logging for sync decision-making
- Fixed duplicate tasks in bidirectional sync:
  - Added improved task matching logic to prevent duplicates when syncing between Outlook and FluidCalendar
  - Added detection of unlinked local tasks to correctly associate them with external tasks
  - Implemented title-based matching for tasks during first sync to avoid duplicates
  - Added additional logging to aid in debugging sync issues
- Fixed bidirectional task sync functionality:
  - Added missing import for TaskChangeTracker in TaskSyncManager
  - Fixed authentication issues in task sync API routes
  - Corrected type errors in TaskSync API routes
  - Fixed nullable type handling in logger metadata
  - Improved error handling for authentication failures
  - Added missing lastModifiedDateTime property to ExternalTask interface
- Fixed the task list mappings API to prevent projectId from being accidentally set to null when updating only direction or other fields
- Fixed task mapping direction not displaying correctly in the UI and not updating properly when changed
- Fixed console error "mappings.map is not a function" when updating task mapping direction in the UI by correctly extracting the mappings array from API response
- Fixed conversion rate calculation in waitlist management to prevent exceeding 100%
- Fixed timestamp comparison logic in bidirectional sync:
  - Improved timestamp comparison to properly determine the newer version for each field
  - Fixed issue where local changes to due dates weren't being preserved when locally edited
  - Enhanced logging to clearly indicate which version (local or external) is being used for each sync
  - Standardized timestamp comparison logic across all task fields for consistent behavior
- Fixed TypeScript issues in task sync system:
  - Fixed TaskSyncJobData to satisfy JobData constraint by adding index signature
  - Updated TaskSyncJobResult to satisfy JobResult constraint by adding index signature
  - Properly typed logger metadata in task sync processor
  - Fixed implicit any types in task sync processor
  - Implemented getMsGraphClient utility function with proper type safety
  - Resolved linter errors in UI components
- Fixed toast usage in TaskSyncSettings component to match the API format
- Added missing provider list API endpoint for task synchronization
- Fixed all-day events appearing on the wrong day for Google Calendar events due to timezone handling issues
- Fixed Outlook all-day event creation that was failing due to Outlook requiring exact midnight UTC times
- Fixed Outlook all-day events requiring a minimum 24-hour duration by automatically extending single-day events to end on the next day at midnight
- Fixed Outlook all-day events displaying on the wrong day in the calendar due to incorrect date conversion during sync
- Fixed startDate handling for recurring tasks, ensuring the time interval between start date and due date is preserved when creating new instances
- Fixed timezone inconsistency in task list display for start dates and due dates
- Fixed DatePicker showing incorrect dates (off by one day) when inline editing due dates and start dates
- Fixed CalDAV all-day event creation failing with "invalid date-time value" error by properly using ICAL.Time.fromDateString instead of raw string dates
- Fixed bidirectional task sync issues where tasks edited in FluidCalendar were being overwritten during Outlook sync
  - Added proper timestamp comparison logic to ensure tasks are only updated when the external version is newer
  - Updated all code paths to set timestamps consistently for reliable sync comparisons
  - Enhanced logging to track timestamp comparisons and sync decisions
- Fixed task duplication during bidirectional sync when editing tasks in FluidCalendar
  - Enhanced task matching to prevent creating duplicates when syncing modified tasks
  - Improved filtering of unlinked tasks to avoid syncing tasks that already exist in the external system
  - Preserved original external task IDs during update operations
- Fixed local task changes being reverted during bidirectional sync
  - Added additional protection for local title changes in bidirectional sync mode
  - Enhanced logging to better track what changes are being preserved or overwritten
  - Implemented more aggressive preservation of local changes when titles differ
- Fixed linter errors throughout the task sync system for better code quality
- Removed redundant code in the Outlook provider implementation
- Fixed type conversions between string values and enum types for task status and priority
- Standardized method names and interfaces for consistency
- Added proper type definitions for Outlook task update payloads to prevent type errors
- Fixed type safety issues in TaskSync related files by replacing 'any' types with proper interfaces
- Removed unused imports and parameters throughout the codebase
- Fixed issues with Record<string, unknown> type compatibility
- Improved TypeScript type safety with proper generic type usage
- Fixed Prisma type compatibility issues in database operations
- Added proper type assertions with intermediate unknown types where needed
- Ensured null values are properly handled with Prisma JSON fields
- Fixed task-sync-manager type incompatibilities with Prisma models
- Improved date handling in task fields to ensure type compatibility
- Updated `/api/tasks/outlook/lists` endpoint to use the TaskProvider interface and TaskSyncManager

### Removed
- Migration code for old Outlook task mappings - decided to use new sync system without migrating old data
- Separate one-way sync methods in favor of a more efficient bidirectional approach
- Legacy components and endpoints related to the old one-way Outlook task import:
  - Removed `OutlookTaskSettings` component (replaced by `TaskSyncSettings`)
  - Removed `OutlookTaskImportModal` component (replaced by task sync UI)
  - Removed `/api/tasks/outlook/import` endpoint (replaced by task sync API)
  - Removed `/api/tasks/outlook/lists` endpoint (replaced by `/api/task-sync/providers/[id]/lists`)
  - Removed `OutlookTasksService` (replaced by `OutlookProvider` implementation)
- Removed `OutlookTaskListMapping` model as it has been replaced by the more generic `TaskListMapping` model in the task synchronization system
- Removed RESEND_API_KEY from environment variables (now stored in SystemSettings)

## [1.2.3]
### Added
- Added task start date feature to specify when a task should become active
  - Tasks with future start dates won't appear in focus mode
  - Auto-scheduling respects start dates, not scheduling tasks before their start date
  - Visual indicators for upcoming tasks in task list view
  - Filter option to hide upcoming tasks
  - Ability to sort and filter by start date
- Added week start day setting to Calendar Settings UI to allow users to choose between Monday and Sunday as the first day of the week
- Expanded timezone options in user settings to include a more comprehensive global list fixes #68
- Bulk resend invitations functionality for users with INVITED status
- Added "Resend Invitation" button to individual user actions in waitlist management

### Changed
- Updated email templates to use "FluidCalendar" instead of "Fluid Calendar" for consistent branding
- Refactored task scheduling logic into a common service to reduce code duplication
  - Created `TaskSchedulingService` with shared scheduling functionality
  - Updated both API route and background job processor to use the common service
- Improved SAAS/open source code separation
  - Moved SAAS-specific API routes to use `.saas.ts` extension
  - Renamed NotificationProvider to NotificationProvider.saas.tsx
  - Relocated NotificationProvider to SAAS layout for better code organization
  - Updated client-side code to use the correct endpoints based on version

### Fixed
- Fixed type errors in the job retry API by using the correct compound unique key (queueName + jobId)
- Fixed database connection exhaustion issue in task scheduling:
  - Refactored SchedulingService to use the global Prisma instance instead of creating new connections
  - Updated CalendarServiceImpl and TimeSlotManagerImpl to use the global Prisma instance
  - Added proper cleanup of resources in task scheduling API route
  - Resolved "Too many database connections" errors in production

## [1.2.2] 2025-03-18
### Added
- Added rate limiting to email queue to limit processing to 2 emails per second
- Added additional logging to email processor to monitor rate limiting effectiveness
- Added ability to manually retry failed jobs from the admin jobs interface
- Added View Details button to jobs in the admin interface to inspect job data, results, and errors
- Added lifetime subscription interest tracking to waitlist system
  - Implemented `interestedInLifetime` flag in Waitlist and PendingWaitlist models
  - Added admin notification emails when users express interest in lifetime subscription
  - Added background task scheduling system with real-time notifications
  - Implemented task scheduling queue with BullMQ for asynchronous processing
  - Added debouncing mechanism to prevent duplicate scheduling jobs
  - Created SSE (Server-Sent Events) endpoint with Redis-backed notifications
  - Integrated with existing notification system for toast messages
  - Added fallback to direct scheduling for open source version without Redis
- Docker image now available on GitHub Container Registry (ghcr.io)
- GitHub workflow for automatic Docker image publication
- Documentation for using the Docker image in README.md
- Added `scripts/sync-repos-reverse.sh` for syncing changes from open source repository back to SAAS repository
- Added data retention and deletion information to privacy policy to comply with Google's app verification requirements

### Changed
- Modified job retry functionality to update existing job records instead of creating new ones
- Updated email templates to use "FluidCalendar" instead of "Fluid Calendar" for consistent branding
- Refactored task scheduling logic into a common service to reduce code duplication
  - Created `TaskSchedulingService` with shared scheduling functionality
  - Updated both API route and background job processor to use the common service
- Improved SAAS/open source code separation
  - Moved SAAS-specific API routes to use `.saas.ts` extension
  - Renamed NotificationProvider to NotificationProvider.saas.tsx
  - Relocated NotificationProvider to SAAS layout for better code organization
  - Updated client-side code to use the correct endpoints based on version

### Fixed
- Fixed type errors in the job retry API by using the correct compound unique key (queueName + jobId)
- Fixed database connection exhaustion issue in task scheduling:
  - Refactored SchedulingService to use the global Prisma instance instead of creating new connections
  - Updated CalendarServiceImpl and TimeSlotManagerImpl to use the global Prisma instance
  - Added proper cleanup of resources in task scheduling API route
  - Resolved "Too many database connections" errors in production

### Technical Debt
- Added proper TypeScript types to replace `any` types
- Added eslint-disable comments only where absolutely necessary
- Fixed linter and TypeScript compiler errors
- Improved code maintainability with better type definitions
- Added documentation for the job processing system
- Standardized error handling across the codebase

### Removed
- Separate one-way sync methods in favor of a more efficient bidirectional approach

## [1.2.1] 2025-03-13
### Added
- Added login button to SAAS home page that redirects to signin screen or app root based on authentication status
- Added SessionProvider to SAAS layout to support authentication state across SAAS pages
- Added pre-commit hooks with husky and lint-staged to run linting and type checking before commits

### Changed
- Removed Settings option from the main navigation bar since it's already available in the user dropdown menu
- Improved dark mode by replacing black with dark gray colors for better visual comfort and reduced contrast

### Fixed
- Fixed event title alignment in calendar events to be top-aligned instead of vertically centered
- Removed minimum height constraint for all-day events in WeekView and DayView components to improve space utilization
- Made EventModal and TaskModal content scrollable on small screens to ensure buttons remain accessible

## [1.2.0] 2025-03-13
### Added
- Added background job processing system with BullMQ
  - Implemented BaseProcessor for handling job processing
  - Added DailySummaryProcessor for generating and sending daily summary emails
  - Added EmailProcessor for sending emails via Resend
  - Created job tracking system to monitor job status in the database
- Added admin interface for job management
  - Created admin jobs page with statistics and job listings
  - Added ability to trigger daily summary emails for testing
  - Implemented toast notifications for user feedback
- Added Toaster component to the saas layout and admin layout
- Added Redis configuration for job queues
- Added Prisma schema updates for job records
- Added worker process for background job processing
  - Created worker.ts and worker.cjs for running the worker process
  - Added run-worker.ts script for starting the worker
- Added Kubernetes deployment configuration for the worker
- Added Docker configuration for the worker
- Added date utilities for handling timezones in job processing
- Added maintenance job system for database cleanup
  - Implemented MaintenanceProcessor for handling system maintenance tasks
  - Added daily scheduled job to clean up orphaned job records
  - Created cleanup logic to mark old pending jobs as failed
- Centralized email service that uses the queue system for all email sending
- Task reminder processor and templates for sending task reminder emails
- Email queue system for better reliability and performance

### Fixed
- Fixed TypeScript errors in the job processing system:
  - Replaced `any` types with proper type constraints in BaseProcessor, job-creator, and job-tracker
  - Added proper type handling for job data and results
  - Fixed handling of undefined values in logger metadata
  - Added proper error handling for Prisma event system
  - Fixed BullMQ job status handling to use synchronous properties instead of Promise-returning methods
  - Added proper null fallbacks for potentially undefined values
  - Fixed type constraints for job data interfaces
  - Added proper type casting with eslint-disable comments where necessary
- Fixed meeting and task utilities to use proper date handling
- Fixed worker deployment in CI/CD pipeline
- Fixed job ID uniqueness issues by implementing UUID generation for all queue jobs
  - Resolved unique constraint violations when the same job ID was used across different queues
  - Replaced console.log calls with proper logger usage in worker.ts
- Fixed job tracking reliability issues
  - Reordered operations to create database records before adding jobs to the queue
  - Improved error handling and logging for job tracking operations
  - Added automated cleanup for orphaned job records
- Improved error handling in email sending process
- Reduced potential for rate limiting by queueing emails

### Changed
- Updated job tracking system to be more robust:
  - Improved error handling in job tracker
  - Added better type safety for job data and results
  - Enhanced logging with proper null fallbacks
  - Improved job status detection logic
  - Changed job creation sequence to ensure database records exist before processing begins
  - Added daily maintenance job to clean up orphaned records
- Updated GitHub workflow to include worker deployment
- Updated Docker Compose configuration to include Redis
- Updated package.json with new dependencies for job processing
- Updated tsconfig with worker-specific configuration
- Refactored date utilities to be more consistent
- Improved API routes for job management
- Enhanced admin interface with better job visualization
- Refactored all direct email sending to use the queue system
- Updated waitlist email functions to use the new email service
