---
description: How to define and document user flows before building any feature
---

# Feature Flow Specification Workflow

Before implementing ANY feature, create a flow specification using this exact format.

## Required Flow Format

Every feature must be documented with the following structure:

### 1. User Role
Who is performing this action?
- Owner
- Manager
- Staff/Employee
- Customer
- Provider (admin)

### 2. Trigger
What initiates the flow?
- Button click
- Menu selection
- URL navigation
- Scheduled event
- External event (SMS received, payment processed, etc.)

### 3. Navigation / Route
Where does the user land?
- Specific URL path (e.g., `/dashboard/bookings`)
- Modal that opens
- New page or tab

### 4. Pre-Checks
What must be validated BEFORE showing the screen?
- Authentication (logged in?)
- Authorization (role allowed?)
- Location/franchise context
- Feature toggle enabled?
- Required data exists?
- License/subscription valid?

### 5. Data Loaded
What APIs or data are fetched automatically when the page loads?
- List all API endpoints called
- What query parameters are used?
- What's cached vs fresh?

### 6. User Actions
What can the user DO on this screen?
- Buttons they can click
- Forms they can fill
- Filters they can apply
- Items they can select

### 7. System Actions
What happens automatically in the background?
- Validations performed
- Calculations made
- Related records updated
- Notifications triggered
- External APIs called

### 8. Success Outcome
What does the user see when it works?
- Confirmation message
- Redirect to another page
- Updated data on screen
- Email/SMS sent confirmation

### 9. Failure Handling
What happens when something goes wrong?
- Form validation errors
- Permission denied
- Network/server errors
- Business logic failures (e.g., "slot no longer available")

### 10. Audit / Logs
What must be recorded?
- User action logged
- Timestamp captured
- Before/after values stored
- Compliance records created

---

## Example Flow Specification

```markdown
## Feature: Staff Time Block

### 1. User Role
Staff, Manager, or Owner

### 2. Trigger
Click "Block Time" button on schedule page

### 3. Navigation / Route
Opens modal overlay on `/dashboard/schedule`

### 4. Pre-Checks
- User authenticated
- User has EMPLOYEE, MANAGER, or OWNER role
- User belongs to a franchise
- enableTimeBlocking feature toggle is ON

### 5. Data Loaded
- GET /api/schedule?date={today} - current schedule
- GET /api/schedule/blocks?userId={self} - existing blocks

### 6. User Actions
- Select start date/time
- Select end date/time
- Enter reason/title
- Toggle "Repeat weekly"
- Click "Save Block"

### 7. System Actions
- Validate no overlapping appointments
- Create TimeBlock record in database
- Recalculate available booking slots
- If recurring, create entries for next 12 weeks

### 8. Success Outcome
- Modal closes
- Toast: "Time blocked successfully"
- Calendar refreshes to show blocked slot
- Booking page excludes those times

### 9. Failure Handling
- "You have an appointment during this time" → Show conflict
- "Invalid time range" → Highlight fields
- Network error → "Failed to save. Try again."

### 10. Audit / Logs
- Log: TimeBlock created by {userId} at {timestamp}
- Record: title, startTime, endTime, isRecurring
```

---

## Process

1. **Before coding**: Write the flow specification
2. **Review with stakeholder**: Confirm flow makes sense
3. **Identify gaps**: Edge cases, permissions, tax implications
4. **Then implement**: Build the feature following the spec
5. **Test against spec**: Verify each step works as documented

---

## Red Flags - Do Not Build If:

- [ ] Can't explain the trigger clearly
- [ ] Don't know what pre-checks are needed
- [ ] Success outcome is vague
- [ ] No failure handling defined
- [ ] Audit requirements unclear

If any of these are true, the feature needs more design work before implementation.
