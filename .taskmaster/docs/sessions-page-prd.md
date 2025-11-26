# Sessions Page - Product Requirements Document

## Overview

Create a `/sessions` page that allows therapists to upload, manage, and view therapy session recordings and transcripts. The page will support bulk uploading of audio and text files, manual transcript entry, patient assignment, and transcript generation from audio files.

## User Stories

1. As a therapist, I want to upload multiple audio/text session files at once so I can quickly add sessions to the system
2. As a therapist, I want to manually enter session transcripts when I don't have a recording
3. As a therapist, I want to assign sessions to specific patients for organization
4. As a therapist, I want to generate transcripts from audio files on demand
5. As a therapist, I want to view and edit session transcripts
6. As a therapist, I want to play back audio recordings from within the app
7. As a therapist, I want to create new patients directly from the session assignment flow

## Technical Requirements

### Database Schema Changes

#### Update Patient Model
Add the following optional fields to the existing Patient model:
```prisma
model Patient {
  // ... existing fields ...
  age        Int?
  gender     String?      // "Male", "Female", "Non-binary", "Other", "Prefer not to say"
  diagnosis  String?      @db.Text
  notes      String?      @db.Text
}
```

#### Update Session Model
Add separate date/time fields for user-editable session timing:
```prisma
model Session {
  // ... existing fields ...
  sessionDate    DateTime?    // User-editable session date
  sessionTime    String?      // User-editable session time (HH:mm format)
}
```

### Page Structure: `/sessions`

#### Main Layout
- Page header with title "Sessions" and "Add Session(s)" button
- Sessions table with pagination (25 per page)
- Sorting controls (by date, patient name, created date)
- Filtering controls (by patient, date range, has transcript, has audio)

#### Sessions Table Columns

| Column | Description | Behavior |
|--------|-------------|----------|
| Date | Session date | Editable - click to show date picker |
| Time | Session time | Editable - click to show time picker |
| Audio | Audio indicator/player | Click to open audio player modal |
| Transcript | Transcript preview or Generate button | Click to view/edit full transcript |
| Patient | Assigned patient name | Click to show patient dropdown |

### Add Session(s) Modal

#### Modal Structure
- Tabs at top: "Upload" (default) | "Manual"
- Auto Transcribe toggle (default: off)
- Action buttons: Cancel, Add Session(s)

#### Upload Tab
- FileDropZone component accepting:
  - Audio formats: mp3, wav, m4a, webm, ogg, flac, aac
  - Text formats: txt, md, doc, docx, pdf
- Maximum 5 files at a time
- Maximum 100MB per file
- Each file creates a separate session record
- Progress indicators for each file upload

#### Manual Tab
- Large TextArea for transcript/summary entry
- Optional date/time pickers
- Optional patient selector
- Creates single session record

### Audio Player Modal
- Audio player with play/pause, seek, volume controls
- Download button
- File name display
- Duration display

### Transcript Modal
- Full transcript display
- Edit mode toggle
- Save changes button
- Cancel button

### Patient Assignment Dropdown
- List of current patients (filtered by current therapist)
- Sorted alphabetically
- Last item: "+ Create New Patient"
- Clicking "Create New Patient" opens patient creation modal

### Create Patient Modal
Required fields:
- Name (text input)

Optional fields:
- Age (number input)
- Gender (select: Male, Female, Non-binary, Other, Prefer not to say)
- Diagnosis (textarea)
- Notes (textarea)

Action buttons: Cancel, Create Patient

## File Processing Flow

### Audio File Upload
1. User selects audio file(s)
2. Generate presigned URL via `/api/upload-url`
3. Upload file to S3
4. Create session record with `s3Key` and `audioUrl`
5. If Auto Transcribe enabled:
   - Call `/api/transcribe` with s3Key
   - Update session record with transcript
6. Display in sessions table

### Text File Upload
1. User selects text file(s)
2. Read file contents client-side (for txt, md) or via API (for doc, docx, pdf)
3. Create session record with transcript content
4. Display in sessions table

### Manual Transcript Entry
1. User enters transcript in textarea
2. Create session record with transcript content
3. Display in sessions table

## API Endpoints

### New Endpoints Required

#### `POST /api/sessions`
Create new session(s)
```typescript
Request: {
  sessions: Array<{
    transcript?: string
    s3Key?: string
    audioUrl?: string
    patientId?: string
    sessionDate?: string
    sessionTime?: string
  }>
}
Response: {
  sessions: Session[]
}
```

#### `GET /api/sessions`
List sessions with pagination, sorting, filtering
```typescript
Request Query Params: {
  page?: number        // Default: 1
  limit?: number       // Default: 25
  sortBy?: 'date' | 'patient' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  patientId?: string
  dateFrom?: string
  dateTo?: string
  hasTranscript?: boolean
  hasAudio?: boolean
}
Response: {
  sessions: Session[]
  total: number
  page: number
  totalPages: number
}
```

#### `PATCH /api/sessions/[id]`
Update session (date, time, patient, transcript)
```typescript
Request: {
  sessionDate?: string
  sessionTime?: string
  patientId?: string
  transcript?: string
}
Response: {
  session: Session
}
```

#### `GET /api/sessions/[id]/audio-url`
Get presigned URL for audio playback
```typescript
Response: {
  url: string
  expiresIn: number
}
```

### Existing Endpoints to Reuse
- `POST /api/upload-url` - Generate S3 presigned upload URL
- `POST /api/transcribe` - Transcribe audio from S3 key
- `GET /api/patients` - List patients (may need to create if doesn't exist)
- `POST /api/patients` - Create patient (may need to update for new fields)

## UI Components Required

### New Components
1. `SessionsTable` - Main data table with inline editing
2. `AddSessionModal` - Upload/Manual tabs modal
3. `AudioPlayerModal` - Audio playback modal
4. `TranscriptModal` - View/edit transcript modal
5. `PatientSelector` - Dropdown with create option
6. `CreatePatientModal` - Patient creation form

### Existing Components to Reuse
- `FileDropZone` - File upload with drag & drop
- `Dialog` / `Modal` - shadcn/ui dialog
- `Tabs` - shadcn/ui tabs
- `Table` - shadcn/ui table
- `Button`, `Input`, `Textarea`, `Select` - shadcn/ui primitives
- `DatePicker`, `TimePicker` - Date/time selection

## State Management

Use React Query (TanStack Query) for:
- Sessions list with pagination
- Patient list
- Mutations for create/update operations
- Optimistic updates for better UX

## Error Handling

- File size validation (100MB limit)
- File type validation
- Upload failure recovery
- Transcription failure handling
- Network error handling
- Form validation errors

## Security Considerations

- All endpoints require authentication (NextAuth session)
- Sessions filtered by current therapist's patients only
- S3 keys validated to start with `uploads/`
- Presigned URLs expire after 5 minutes
- Patient assignment restricted to therapist's own patients

## Accessibility

- Keyboard navigation for all interactive elements
- Screen reader announcements for upload progress
- ARIA labels on all controls
- Focus management in modals
- Error messages linked to form fields

## Performance Considerations

- Pagination to limit data loaded
- Virtual scrolling for large file lists
- Lazy loading of audio player
- Optimistic UI updates
- Debounced search/filter inputs

## Success Criteria

1. Therapist can upload up to 5 audio/text files simultaneously
2. Each uploaded file creates a separate session record
3. Audio files are stored in S3 with presigned URLs
4. Transcripts can be generated on-demand or automatically
5. Sessions table supports sorting, filtering, and pagination
6. Inline editing works for date, time, and patient assignment
7. Audio playback works within the app
8. Transcript viewing and editing works correctly
9. New patients can be created from the assignment flow
10. All operations complete within reasonable time (<5s for uploads, <60s for transcription)
