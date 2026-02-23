# FeliGo — Felicity Event Management System

## Project Overview
A comprehensive MERN stack application designed to manage university events, clubs, and participants. This system streamlines the chaos of fest organization by providing a centralized platform for event creation, registration, and tracking.

## Technology Stack
- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **Authentication:** JWT, Bcrypt
- **Email:** Brevo HTTP API
- **Real-time:** Socket.io
- **Search:** Fuse.js (client-side fuzzy matching)

---

## Assumptions & Design Decisions

- **Cancelled/Rejected (Section 9.2):** "Cancelled" refers to events cancelled by the organizer. A participant cannot cancel their own registration once registered.
- **Merchandise Payment Approval (Tier A):** This feature replaces the instant-purchase flow. All merchandise events now require payment proof upload before the organizer approves and issues a ticket.
- **Discussion Forum (Tier B):** Only registered participants (non-rejected payment status) and the event's organizer can access the forum. The forum is scoped **per event** — each event has its own isolated forum room. Threading is limited to **one level only**: you can reply to a top-level message, but you cannot reply to a reply. This prevents deep nesting and keeps the UI clean. Notification rules: organizer top-level messages notify all registered participants; replies notify the parent message author and all previous repliers in that thread; reactions notify the message author. All notifications are in-app only (no email).
- **Password Reset (Tier B):** Organizers submit a reset request; admin approves it from the admin panel; a new auto-generated password is shown to the admin for sharing. This keeps the no-self-registration constraint intact.
- **Cancelled Events:** Once an event is cancelled (by the organizer), it becomes fully immutable — no further edits or status changes are allowed.
- **Registration Deadline:** The registration deadline must be on or before the event start date. Registrations are only open while the event is in Published status — participants cannot register for Ongoing or Completed events.
- **Form Builder Locking:** The custom registration form can be edited freely on Draft events and on Published events with zero registrations. Once the first registration is received, the form is permanently locked — no questions can be added, removed, or reordered.

---

## Advanced Features Implemented

### Tier A (Choose 2 — 8 marks each)
- **Feature 2: Merchandise Payment Approval Workflow** — Payment proof upload, Pending/Approved/Rejected states, organizer approval panel, ticket + email on approval, stock decrement on approval only.
- **Feature 3: QR Scanner & Attendance Tracking** — In-browser camera QR scanner, duplicate scan rejection, live attendance dashboard, CSV export, manual override with audit log.

### Tier B (Choose 2 — 6 marks each)
- **Feature 2: Organizer Password Reset Workflow** — Organizers submit requests with reason; admin views/approves/rejects; auto-generated password on approval; full request history with status tracking.
- **Feature 1: Real-Time Discussion Forum** — Socket.io-powered forum on Event Details page for registered participants; organizer moderation (delete/pin); message reactions; announcement posts.

### Tier C (Choose 1 — 2 marks)
- **Feature 2: Add to Calendar Integration** — Downloadable `.ics` file + Google Calendar and Microsoft Outlook direct links from the Event Details page.

---

## Known Limitations

- **Real-time Forum on free Render tier:** Render's free plan spins down the backend after 15 minutes of inactivity. When the server restarts, active Socket.io connections are dropped. Participants will see a disconnected state and need to refresh the page. This is a hosting constraint, not a code issue.

---
