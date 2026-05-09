# SFDS Assessment App — Project Status

## School
St. Francis De Sales Sec. School

## Architecture
Standalone mobile-first progressive web app.
Modular ES6 modules. No framework dependencies except Chart.js for graphs.

## Completed Stages

### Stage 1 — Student Data Layer
- Student JSON structure
- Class-based student files (`/data/students/`)
- Student loader service

### Stage 2 — Dynamic Subject System
- Dynamic subject registry (`/data/subjects.json`)
- Criteria JSON files per subject (`/data/criteria/`)
- Criteria loader service
- Subject selector component

### Stage 3 — Assessment Sessions
- Teacher session workflow
- Tap-to-fill mark entry (0–5)
- Session persistence (localStorage)
- Autosave support
- Session reload / resume
- Duplicate session detection

### Combined Stage 4–6 — Admin & Intelligence
- Admin session dashboard
- Session status workflow (draft → submitted → reviewed → locked)
- Session locking system
- Monthly aggregation engine
- Class / subject / student averages
- Weak student detection engine with configurable rules
- Weak student admin view

### Stage 7 — Analytics & Visualization
- Analytics engine (student, class, subject, school-wide)
- Graph data engine (line, bar, doughnut, horizontal bar)
- Chart.js integration
- Admin analytics dashboard (Overview, Student, Class, Subject, Completion)
- Responsive chart containers

### Current Stage — Auth, Roles, Profiles, Fast Entry
- Authentication service (mock users, ready for Firebase)
- Teacher / admin role separation
- Protected navigation (teachers see only assessment; admins see admin panel)
- Login / logout system
- Student monthly profile view with progress graphs and subject breakdown
- Default score workflow (default = 4)
- Quick entry mode (criterion-centric grid for fast batch grading)
- Firestore-compatible persistence service (currently backed by localStorage)

## Project Structure

```
/data
  /criteria
  /students
  subjects.json
/services
  analytics-engine.js
  assessment-engine.js
  auth-service.js
  criteria-loader.js
  fast-entry-engine.js
  firebase-config.js
  firestore-service.js
  graph-data-engine.js
  aggregation-engine.js
  session-review-engine.js
  session-storage.js
  student-loader.js
  student-profile-engine.js
  subject-loader.js
  totals-engine.js
  weak-student-engine.js
/components
  analytics-dashboard.js
  assessment-card.js
  criteria-list.js
  login-form.js
  monthly-summary.js
  quick-entry-grid.js
  session-list.js
  session-review.js
  session-setup.js
  session-toolbar.js
  student-profile.js
  subject-selector.js
  weak-student-list.js
index.html
main.js
styles.css
PROJECT_STATUS.md
```

## Active Classes
- Class I
- Class II

## Future-Ready Support
- LKG
- SKG

## Firebase Migration Status
- `firebase-config.js` placeholder created
- `auth-service.js` uses mock users; replace with Firebase Auth
- `firestore-service.js` uses localStorage; replace with Firestore SDK
- All existing data structures remain compatible

## Default Score
- Hard-set to 4
- Represents realistic "good/normal" performance
- Teachers can override any mark

## Authentication (Mock)
| Email | Password | Role |
|-------|----------|------|
| teacher@sfds.com | sfds123 | teacher |
| admin@sfds.com | sfds123 | admin |

## Remaining Roadmap
- Stage 8: Report Card Generation (after separate design phase)
- Firebase integration (replace mock auth + localStorage)
- Cloud sync for multi-device access

## Key Design Principles
- Mobile-first, low-end Android compatible
- Minimal typing, large tap targets
- Modular architecture — no hardcoding
- student_id is the permanent primary key
- Reusable components and services
