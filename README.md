# FeliGo : Felicity Event Management System

## Project Overview

Felicity's club events have traditionally been managed through a chaotic mix of Google Forms, spreadsheets, and WhatsApp groups, leaving participants unsure if they're registered, organizers unsure who's attending, and payments perpetually stuck in "screenshot limbo."

FeliGo is a centralized MERN stack platform built to fix this. It provides role-based workflows for admins, organizers, and participants, covering event creation, custom registration forms, merchandise purchasing with payment proof, QR-based attendance, and real-time discussion forums.

---

## Libraries & Frameworks

### Frontend

| Library | Justification |
|---|---|
| **React (Vite)** | Component-based UI with fast HMR via Vite; eliminates slow CRA build times |
| **Tailwind CSS** | Utility-first CSS, no separate stylesheet files, consistent design, responsive by default |
| **React Router v6** | Client-side routing with nested routes and role-based `PrivateRoute` guards |
| **Axios** | Promise-based HTTP client with interceptors for attaching JWT to every request |
| **Socket.io-client** | Real-time bidirectional events for live notifications and the discussion forum |
| **Fuse.js** | Lightweight client-side fuzzy search, avoids a backend search endpoint for event browsing |
| **html5-qrcode** | In-browser camera access for QR code scanning without a native app |
| **react-hot-toast** | Non-blocking toast notifications; used for live notification popups |
| **react-icons** | Tree-shakeable icon set; keeps the bundle small vs. importing full icon libraries |

### Backend

| Library | Justification |
|---|---|
| **Express.js** | Minimal, unopinionated Node.js framework; fast to set up REST routes with middleware |
| **Mongoose** | ODM for MongoDB. Schema validation, virtuals, and query helpers reduce boilerplate |
| **jsonwebtoken** | Stateless JWT auth; no server-side session storage needed |
| **bcryptjs** | Password hashing; pure-JS build avoids native compilation issues on deployment |
| **Socket.io** | Manages WebSocket rooms per event and per user for targeted real-time delivery |
| **dotenv** | Loads `.env` variables; keeps secrets out of source code |
| **Axios** | Used server-side to call the Brevo email API via HTTP |
| **qrcode** | Generates QR code data URIs embedded in approval emails for attendance scanning |
| **cors** | Configures cross-origin policy to allow the Vercel frontend to call the Render backend |

### Database & Services

| Service | Justification |
|---|---|
| **MongoDB Atlas** | Flexible document model suits varied event registration forms; free tier for deployment |
| **Brevo (email)** | HTTP-based transactional email API, no SMTP setup, generous free tier |

---

## Local Setup

### Prerequisites
Node.js (v18+), npm, MongoDB Atlas account (or local MongoDB)

### 1. Clone & configure environment

```bash
git clone https://github.com/meet2701/FeliGo.git
cd FeliGo
```

Create `backend/.env`:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
BREVO_API_KEY=your_brevo_api_key
FRONTEND_URL=http://localhost:5173
```

Create `frontend/.env`:
```
VITE_BACKEND_URL=http://localhost:5000
```

### 2. Run backend
```bash
cd backend
npm install
node index.js
```

### 3. Run frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. Seed the admin account once with:
```bash
cd backend && node seedAdmin.js
```

---

## Assumptions & Design Decisions

- **Cancelled/Rejected (Section 9.2):** "Cancelled" refers to events cancelled by the organizer. A participant cannot cancel their own registration once registered.
- **Merchandise Payment Approval (Tier A):** This feature replaces the instant-purchase flow. All merchandise events now require payment proof upload before the organizer approves and issues a ticket.
- **Discussion Forum (Tier B):** Only registered participants (non-rejected payment status) and the event's organizer can access the forum. The forum is scoped **per event** — each event has its own isolated forum room. Threading is limited to **one level only**: you can reply to a top-level message, but you cannot reply to a reply. This prevents deep nesting and keeps the UI clean. Notification rules: organizer top-level messages notify all registered participants; replies notify the parent message author and all previous repliers in that thread; reactions notify the message author. All notifications are in-app only (no email).
- **Password Reset (Tier B):** Organizers submit a reset request; admin approves it from the admin panel; a new auto-generated password is shown to the admin for sharing. This keeps the no-self-registration constraint intact.
- **Participant Password Change (Section 9.6):** Section 9.6 requires a "password reset or change mechanism with appropriate authentication and validation." This is implemented as a **change password** flow (requires the user to be logged in and enter their current password before setting a new one). A forgot-password / unauthenticated email-reset flow is **not required** by the spec and has not been implemented. Participants who forget their password must contact the admin.
- **Merchandise Purchase Limit:** Each user can place only one purchase per merchandise event. Re-ordering is only allowed if a previous order was rejected by the organizer.
- **Cancelled Events:** Once an event is cancelled by the organizer, it becomes fully immutable — no further edits or status changes are allowed.
- **Registration Deadline:** The registration deadline must be on or before the event start date. Registrations are only open while the event is in Published status — participants cannot register for Ongoing or Completed events.
- **Form Builder Locking:** The custom registration form can be edited freely on Draft events and on Published events with zero registrations. Once the first registration is received, the form is permanently locked — no questions can be added, removed, or reordered.

---

## Advanced Features Implemented

### Tier A — Feature 2: Merchandise Payment Approval Workflow

**Why chosen:** The spec's "instant buy" model is unrealistic for fest merch where payment is done via UPI/cash and needs verification. This feature replaces it with a realistic approval loop.

**Design & Implementation:**
- Participants upload a payment proof image (base64, stored in MongoDB) when placing an order.
- Order enters `Pending` state; organizer sees all pending orders in an approval panel with the proof image inline.
- On approval: stock is decremented, a ticket is generated, and an email is sent via Brevo with variant details (size, color, etc.) and a QR code for the ticket.
- On rejection: participant is notified in-app and can re-upload.
- Stock is only decremented on approval — not on order placement — to prevent phantom stock holds.
- One purchase per user per event; re-order allowed only after rejection.

---

### Tier A — Feature 3: QR Scanner & Attendance Tracking

**Why chosen:** QR-based attendance is the most realistic replacement for manual roll-calls at a large fest. Pairs naturally with Feature 2 (ticket QR codes).

**Design & Implementation:**
- Each approved registration generates a unique QR code (UUID embedded, created with the `qrcode` library) sent in the approval email.
- Organizer opens the scanner on the Event Details page; `html5-qrcode` accesses the camera, decodes the QR, and POSTs the token to the backend.
- Backend validates the token, checks for duplicates (rejects double-scans), and marks attendance.
- Live attendance count updates via Socket.io — all open organizer scanner tabs reflect the change instantly.
- CSV export of the attendance list is available for record-keeping.
- Manual override: organizer can mark/unmark attendance by name, with an audit log entry recording who made the change and when.

---

### Tier B — Feature 1: Real-Time Discussion Forum

**Why chosen:** WhatsApp groups are the current "forum", a per-event in-app forum directly solves the spec's stated problem of information vanishing into chat groups.

**Design & Implementation:**
- Forum is scoped per event; implemented as Socket.io rooms (`forum:<eventId>`).
- Access gated: only registered participants (non-rejected status) and the event organizer can join.
- Threading is one level deep (reply to top-level only) — prevents infinite nesting without a recursive UI.
- Organizer can pin and delete messages; pinned messages float to the top.
- Reactions (emoji) send a targeted socket event to update the reaction count without re-fetching the thread.
- Notification rules: organizer announcements → all registered participants; replies → parent author + previous repliers in thread; reactions → message author.
- All notifications delivered in-app via the live notification system (Socket.io `live_notification` event to the user's personal room).

---

### Tier B — Feature 2: Organizer Password Reset Workflow

**Why chosen:** Organizers are created by admin (no self-registration), so a standard "forgot password" email link would bypass the admin-controlled onboarding. This workflow keeps the admin in control.

**Design & Implementation:**
- Organizer submits a reset request with a reason from their profile page.
- Admin sees all requests in the admin panel with status (`Pending / Approved / Rejected`).
- On approval: a secure random password is auto-generated (crypto), hashed and stored, and the plaintext is shown **once** to the admin for out-of-band sharing.
- Full request history is preserved with timestamps and admin notes.

---

### Tier C — Feature 2: Add to Calendar Integration

**Why chosen:** Single-file implementation with no external dependencies; high user value for participants managing multiple event schedules.

**Design & Implementation:**
- Backend generates a `.ics` file (RFC 5545) with event title, description, start/end times, and location.
- Frontend provides three options: download `.ics`, open Google Calendar URL (pre-filled via URL params), open Outlook Web URL.
- No third-party calendar library used — the `.ics` format is simple enough to build with a template string.

---

---

## Known Limitations

- **Real-time Forum on free Render tier:** Render's free plan spins down the backend after 15 minutes of inactivity. When the server restarts, active Socket.io connections are dropped. Participants will see a disconnected state and need to refresh the page. This is a hosting constraint, not a code issue.

---
