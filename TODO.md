# Task Synchronization Phase 1 Implementation

Phase 1 focuses on building the foundation for a scalable task synchronization system that will support two-way sync with multiple providers.

## Task Sync Phase 1 Tasks

1. **Database Schema Changes**
   - [x] Create the `TaskProvider` model in schema.prisma
   - [x] Create the `TaskListMapping` model to replace `OutlookTaskListMapping`
   - [x] Update the `Task` model with additional sync fields
   - [x] Update the `Project` model with sync-related fields
   - [x] Create a migration for the schema changes
  
2. **Core Interfaces and Classes**
   - [x] Create `src/lib/task-sync/providers/task-provider.interface.ts`
   - [x] Create `src/lib/task-sync/task-sync-manager.ts`
   - [x] Create `src/lib/task-sync/task-change-tracker.ts`
   - [x] Create helper utilities for mapping between providers
   - [x] Fix TypeScript type issues in task sync related files

3. **Outlook Provider Implementation**
   - [x] Create `src/lib/task-sync/providers/outlook-provider.ts`
   - [x] Port existing functionality from `OutlookTasksService`
   - [x] Implement the one-way sync from Outlook to FluidCalendar
   - [ ] Add support for task list mapping

4. **API Endpoints**
   - [x] Create provider management endpoints
   - [x] Create mapping management endpoints
   - [x] Create sync trigger endpoints

5. **Background Jobs**
   - [x] Set up BullMQ job queue for task synchronization
   - [x] Create job processor for task sync operations
   - [ ] Implement scheduler for periodic sync jobs

6. **UI Components**
   - [ ] Create provider management UI in settings
   - [ ] Create task list mapping UI
   - [ ] Create sync status indicator components

7. **Data Migration**
   - [ ] Write migration script to move existing Outlook task mappings
   - [ ] Test data migration process

8. **Next Steps**
   - [ ] Build UI components for task sync management
   - [ ] Implement periodic sync scheduler
   - [ ] Finish data migration for existing Outlook tasks
   - [ ] Test the complete workflow from adding a provider to auto-syncing tasks

# FluidCalendar Implementation Plan
# Random Tasks
- [ ] 2-way task sync see [sync document](docs/task-sync.md)
- [ ] add a calculator comparing motion to FC
- [ ] add a sidebar thingy in open to tell them to move to saas
- [ ] auto schedule working hours in settings using 24 instead am/pm
- [ ] improve task lists and focus view see [tasklist](docs/tasklist-enhancements.md)
  - [ ] add view for scheduled tasks and over due or saved views
- [ ] use task-reminder job for sending reminders
- [ ] cron job to cleanup logs
- [ ] cron job to expire waitlist verifications
- [ ] support attendees
- [ ] support event notifications
- [ ] add localization for date formatting
- [ ] share availability
- [ ] use SSE throughout to improve sync performance
- [ ] use database for sysconfig instead of infisical

# CalDAV Implementation
## Phase 3: Calendar Synchronization (Pending)
- [ ] Implement two-way sync with change tracking

## Phase 4: Advanced Features (Pending)
- [ ] Support for CalDAV collections
- [ ] Handle different calendar permissions
- [ ] Implement free/busy status
- [ ] Add support for calendar sharing

# Focus Mode
# Focus Mode
## Focus Mode Implementation
- [ ] fix keyboard shortcuts
- [ ] in taskmodal make the tags more obvious if they are selected
- [ ] Daily Email

# BUG
- [ ] if i have a bunch of tasks that have isautoscheduled false and i click autoschedule the UI updates with a blank list because no tasks are returned. i have to refresh the page to get the tasks.
- [ ] auto scheduling is creating task in the past (it might be off by one day)
- [ ] auto scheduling did not schedule high priority tasks first
- [ ] save task completed date and sync it with outlook 
- [ ] deleteing a recurring event from quickview doens't work well and doesn't ask me if i want to delete the series or just the instance.

# Misc

# Misc
## Next Steps
- [ ] Integrate google calendar
  - [ ] auto sync with webhooks
  - [ ] when deleting one event from the series, it deletes all instances locally but google is working fine.
- [ ] prevent adding events to read-only calendars
- [ ] allow changing calendar color
- [ ] allow calendar re-ordering in the UI
- [ ] when deleting a recurring event, it deletes all instances but it shows a random instance which disappears after a sync, also i tried it again and it only deleted the instance locally but the entire series deleted from google.
- [ ] add ability to RSVP
- [ ] show events not RSVPed to
- [ ] show spinner when deleting/creating/updating in event modal
- [ ] Use AI to break down tasks
- [ ] recurring tasks don't indicate that it's recurring
- [ ] Ability to add tasks in calendar view

## Focus Mode Enhancements (Future)
- [ ] Add focus session analytics
  - [ ] Track time spent in focus mode
  - [ ] Record tasks completed per session
  - [ ] Visualize productivity patterns
- [ ] Implement custom focus modes
  - [ ] Deep work mode (2+ hour sessions)
  - [ ] Quick task mode (15-30 minute sessions)
  - [ ] Meeting preparation mode
- [ ] Add Pomodoro technique integration
  - [ ] Configurable work/break intervals
  - [ ] Break reminders
  - [ ] Session statistics

## Outlook sync issues
- [ ] deleting one instance doesn't sync correctly
- [ ] add real-time updates with webhooks
- [ ] implement offline support

## Tasks
- [ ] task dependencies

## 1. Core Calendar Features
- [ ] Calendar Grid Component
  - [ ] Add month view layout
  - [ ] Implement day view layout
  - [ ] Add navigation between days/weeks/months

## 2. Task Management
- [ ] Task Data Structure
  - [ ] Define task interface (title, description, date, duration, status, etc.)
  - [ ] Create task store using Zustand
  - [ ] Implement CRUD operations for tasks
- [ ] Task UI Components
  - [ ] Create task card component
  - [ ] Add task creation modal
  - [ ] Implement task edit modal
  - [ ] Add task details view
  - [ ] Create task list view in sidebar

## 3. Drag and Drop Features
- [ ] Task Rescheduling
  - [ ] Enable drag and drop between time slots
  - [ ] Add visual feedback during drag
  - [ ] Implement time snapping
  - [ ] Handle task duration during drag
- [ ] Task List Reordering
  - [ ] Allow reordering in list view
  - [ ] Sync order changes with store

## 4. Smart Features
- [ ] Task Auto-scheduling
  - [ ] Implement algorithm for finding free time slots
  - [ ] Add priority-based scheduling
  - [ ] Consider task dependencies
- [ ] Time Blocking
  - [ ] Add ability to block out time
  - [ ] Create different block types (focus, meeting, break)
  - [ ] Allow recurring blocks

## 5. Data Persistence
- [ ] Local Storage
  - [ ] Save tasks to localStorage
  - [ ] Implement data migration strategy
- [ ] State Management
  - [ ] Set up Zustand stores
  - [ ] Add undo/redo functionality
  - [ ] Implement data synchronization

## 6. UI/UX Improvements
- [ ] Animations
  - [ ] Add smooth transitions between views
  - [ ] Implement task drag animation
  - [ ] Add loading states
- [ ] Keyboard Shortcuts
  - [ ] Navigation shortcuts
  - [ ] Task creation/editing shortcuts
  - [ ] View switching shortcuts
- [ ] Responsive Design
  - [ ] Mobile-friendly layout
  - [ ] Touch interactions
  - [ ] Adaptive UI based on screen size

## 7. Advanced Features
- [ ] Dark Mode
  - [ ] Implement theme switching
  - [ ] Add system theme detection
- [ ] Calendar Integrations
  - [ ] Google Calendar sync
  - [ ] iCal support
  - [ ] External calendar subscriptions
- [ ] Task Categories
  - [ ] Add custom categories
  - [ ] Color coding
  - [ ] Category-based filtering

## 8. Performance Optimization
- [ ] Component Optimization
  - [ ] Implement virtualization for long lists
  - [ ] Add lazy loading for views
  - [ ] Optimize re-renders
- [ ] State Management
  - [ ] Add request caching
  - [ ] Implement optimistic updates
  - [ ] Add error boundaries

## 9. Testing
- [ ] Unit Tests
  - [ ] Test core utilities
  - [ ] Test state management
  - [ ] Test UI components
- [ ] Integration Tests
  - [ ] Test user flows
  - [ ] Test data persistence
  - [ ] Test drag and drop functionality

## 10. Documentation
- [ ] Code Documentation
  - [ ] Add JSDoc comments
  - [ ] Document component props
  - [ ] Create usage examples
- [ ] User Documentation
  - [ ] Write user guide
  - [ ] Add keyboard shortcut reference
  - [ ] Create onboarding guide

## Implementation Order:
1. Database schema and migrations
2. Core logger service updates
3. API endpoints
4. Settings UI and commands
5. Testing and documentation

## Next Steps
1. Implement the calendar grid component
2. Add basic task management
3. Implement drag and drop functionality
4. Add data persistence
5. Enhance UI with animations and responsive design

## Calendar Sync and Auto-scheduling
- [ ] Implement background sync system
  - [ ] Create useCalendarSync custom hook
  - [ ] Add sync status indicators in UI
  - [ ] Implement error handling and retry logic
  - [ ] Add manual sync trigger to command registry
  - [ ] Add sync preferences to settings
  - [ ] Implement proper cleanup on unmount
  - [ ] Add visual indicators for sync status
  - [ ] Add sync error notifications