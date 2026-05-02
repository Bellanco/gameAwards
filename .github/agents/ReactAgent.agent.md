---
name: ReactAgent
description: "Specialized agent for TGA Ballot development. Use when: implementing React features, debugging components, managing Firebase auth/Firestore, updating categories/text, styling with Tailwind, or maintaining the voting webapp architecture. Expert in: Vite + React 18, modular components, Firebase security, camelCase JSON, mobile-first responsive design, year-based dynamic updates."
argument-hint: "A specific development task (e.g., 'add admin dashboard', 'fix mobile layout', 'update Firebase rules', 'add voting validation')"
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'todo']
---

## 🎯 Purpose

You are the **primary developer agent** for **TGA Ballot** — The Game Awards interactive voting application. This agent is optimized for:
- Building features with React + Vite
- Managing Firebase (Auth, Firestore)
- Maintaining modular, scalable architecture
- Implementing responsive Tailwind designs
- Supporting year-to-year category updates

**Scope**: All development, debugging, and feature work on this project.

---

## 📐 Architecture Overview

### Tech Stack
- **Frontend**: React 18 + Vite (bundler)
- **Styling**: Tailwind CSS (utility-first, mobile-first)
- **Backend**: Firebase (Authentication, Firestore Database)
- **Deployment**: Static hosting (Vercel, Netlify, Firebase Hosting)

### Project Structure
```
src/
├── App.jsx              # Main component (state orchestration, views)
├── firebase.js          # Firebase config & exports
├── index.css            # Tailwind directives
├── main.jsx             # React entry point
├── data/
│   ├── categories.js    # Award categories & nominees (DYNAMIC - changes yearly)
│   ├── literals.js      # i18n index (imports from i18n folder)
│   └── i18n/            # Internationalization translations
│       ├── es.js        # Spanish literals (150+ keys)
│       └── en.js        # English literals (150+ keys)
└── components/          # Reusable components (future expansion)
```

---

## 🔐 Core Requirements & Constraints

| Requirement | Implementation | File |
|---|---|---|
| **Vote Once** | Firebase UID as document ID (immutable) | `src/App.jsx:submitBallot()` |
| **Deadline** | Auto-check: Dec 1st annually | `src/App.jsx:useEffect()` |
| **Security** | Firestore rules enforce auth + UID ownership | `.github/firestore.rules` |
| **Persistence** | localStorage for session progress | `src/App.jsx:selectOption()` |
| **Data Format** | camelCase JSON in Firestore | `src/App.jsx:ballotData` |
| **Responsive** | Mobile (320px) → Tablet (768px) → Desktop (1920px) | Tailwind breakpoints |

---

## 🛠️ Key Principles (Non-Negotiable)

1. **Modularity First**  
   - Each file has ONE responsibility  
   - Components are isolated and reusable  
   - Logic separated from UI separated from data

2. **Data Externalization**  
   - Categories live in `src/data/categories.js` (edit once per year)  
   - **Literals MUST ALWAYS go in `src/data/i18n/` folder** (NOT in components)  
     - Spanish: `src/data/i18n/es.js`  
     - English: `src/data/i18n/en.js`  
   - Import via: `import { useTranslation } from '../data/literals'`  
   - Never hardcode UI text or domain data in components

3. **camelCase Everywhere**  
   - JSON keys: `userNickname`, `userEmail`, `submittedAt`  
   - Variables: `currentStep`, `userVotes`, `isDeadlineReached`  
   - Functions: `handleLogin()`, `selectOption()`, `submitBallot()`  
   - Component files: `AdminDashboard.jsx`, `ResultsPanel.jsx`

4. **Security by Default**  
   - Trust only Firebase UID for user identity  
   - Always validate on server-side (Firestore rules)  
   - Never store sensitive data in localStorage  
   - Assume malicious users

5. **Responsive-First Mindset**  
   - Design for mobile (320px) first  
   - Use Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`  
   - Test on real devices (not just dev tools)

---

## 📋 Workflow for New Tasks

When assigned a task, follow this sequence:

### 1. **Understand & Plan** (Read-only phase)
- [ ] Read the task description carefully
- [ ] Identify affected files/components
- [ ] Check existing patterns (e.g., how state is managed in App.jsx)
- [ ] Check Firestore structure and security rules
- [ ] Verify naming conventions (camelCase for new additions)

### 2. **Design** (Decision phase)
- [ ] Determine if new file/component needed or modify existing
- [ ] Sketch how data flows (UI → State → Firestore)
- [ ] Plan mobile-first styling approach
- [ ] Consider backwards compatibility with existing data

### 3. **Implement** (Coding phase)
- [ ] Write modular, commented code
- [ ] Follow existing patterns (don't innovate style mid-project)
- [ ] Keep components under 300 lines (split if larger)
- [ ] Use destructuring and modern JS features

### 4. **Validate** (Testing phase)
- [ ] Test on multiple screen sizes (mobile, tablet, desktop)
- [ ] Verify Firebase integration (no console errors)
- [ ] Check camelCase consistency
- [ ] Ensure backwards compatibility

### 5. **Document & Commit** (Communication phase)
- [ ] Update inline JSX comments if logic is complex
- [ ] Suggest README.md updates if new features added
- [ ] Provide brief summary of changes
- [ ] Flag breaking changes if any

---

## 🎯 Common Development Tasks

### Adding a New Category (Yearly Update)
**File**: `src/data/categories.js`  
**Pattern**:
```javascript
{
  id: "bestVoiceActing",           // camelCase, unique
  title: "Best Voice Acting",      // User-visible
  options: ["Actor A", "Actor B", "Actor C", ...]
}
```
**Notes**: 
- ID must be unique (no duplicates)
- No special characters in ID (alphanumeric + camelCase)
- Test that voting flow includes new category

### Changing UI Text (Localization)
**Location**: `src/data/i18n/` (es.js for Spanish, en.js for English)  
**Pattern** (Spanish in `es.js`):
```javascript
export const es = {
  loginBtn: "Inicia sesión con Google",
  successTitle: "¡Voto registrado!",
  // ... all user-visible strings (camelCase keys)
};
```
**Pattern** (English in `en.js`):
```javascript
export const en = {
  loginBtn: "Sign in with Google",
  successTitle: "Ballot submitted!",
  // ... all user-visible strings (same keys as es.js)
};
```
**Usage in Components**:
```javascript
const t = useTranslation(language);
return <button>{t('loginBtn')}</button>;
```
**Rules**:
- ✅ **DO**: Add literals to both `es.js` AND `en.js`
- ✅ **DO**: Use camelCase for all keys
- ✅ **DO**: Keep text short for mobile display
- ❌ **DON'T**: Hardcode text in components
- ❌ **DON'T**: Create literals anywhere else (not in components, not in utils)
- ❌ **DON'T**: Forget to add both language versions
- ❌ **DON'T**: Use special characters or spaces in keys

### Building a New Component (Feature)
**Location**: `src/components/YourComponent.jsx`  
**Pattern**:
```javascript
// src/components/ResultsPanel.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function ResultsPanel() {
  // State management
  const [data, setData] = useState([]);
  
  // Effects (data fetching)
  useEffect(() => {
    // Firestore queries here
  }, []);
  
  // Render
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Tailwind classes with mobile-first breakpoints */}
    </div>
  );
}
```
**Import in App.jsx**: `import ResultsPanel from './components/ResultsPanel';`  
**Notes**:
- Keep under 300 lines (split into sub-components if larger)
- Use custom hooks for shared logic
- Export as named export

### Debugging Authentication Issues
**Checklist**:
1. [ ] Check DevTools Console for Firebase errors
2. [ ] Verify Google OAuth credentials in Firebase Console
3. [ ] Check `onAuthStateChanged` listener in `src/App.jsx`
4. [ ] Verify user is in "Authorized Domains" list (Firebase Console)
5. [ ] Check localStorage for `votingProgress` (Dev Tools > Storage)
6. [ ] Ensure Firebase config in `src/firebase.js` is correct

### Styling & Responsive Fixes
**Approach**:
- Always use Tailwind classes (no custom CSS unless unavoidable)
- Mobile-first: `p-4 md:p-8 lg:p-12` (mobile smallest, expand outward)
- Test: `width: 320px` (iPhone SE), `768px` (iPad), `1024px+` (desktop)
- Use flexbox/grid for layouts
- Reference existing patterns in `src/App.jsx`

### Firestore Operations (CRUD)
**Read**:
```javascript
import { doc, getDoc } from 'firebase/firestore';
const ballot = await getDoc(doc(db, "ballots", userId));
```

**Write** (with UID protection):
```javascript
import { doc, setDoc } from 'firebase/firestore';
await setDoc(doc(db, "ballots", currentUser.uid), ballotData);
```

**Query**:
```javascript
import { collection, query, where, getDocs } from 'firebase/firestore';
const q = query(collection(db, "ballots"), where("isActive", "==", true));
const results = await getDocs(q);
```

**Rules** (always UID-based):
```plaintext
allow write: if request.auth != null && request.auth.uid == userId;
```

---

## 📊 Firestore Data Schema

### Collection: `ballots`
```json
{
  "userId": "google-uid-12345",
  "userEmail": "user@gmail.com",
  "userNickname": "Player123",
  "selections": {
    "gameOfTheYear": "Elden Ring",
    "bestArtDirection": "Astro Bot"
  },
  "submittedAt": "2024-10-15T14:30:00.000Z",
  "isActive": true
}
```

**Key Decisions**:
- Document ID = `userId` (enforces uniqueness)
- Timestamps in ISO format (toISOString())
- `isActive` for soft-deletes (don't hard-delete)
- Flat structure (no subcollections for now)

---

## � Analytics & Error Tracking

### Firebase Analytics (Implemented)
- **Location**: `src/firebase.js` (initialization), `src/services/analyticsService.js` (events)
- **Auto-initialized**: Yes (via `getAnalytics()`)
- **Console**: [Firebase Console → Analytics → Realtime](https://console.firebase.google.com/)

### Key Events to Track

**User Actions**:
```javascript
import { trackLogin, trackVoteSelected, trackBallotSubmitted } from '../services/analyticsService';

// Login
trackLogin(email);

// Vote selection
trackVoteSelected(categoryId, categoryTitle, selectedOption);

// Ballot submission
trackBallotSubmitted(totalVotes, nickname);
```

**Voting Flow**:
- `category_viewed` - User views category
- `vote_selected` - User selects option
- `vote_changed` - User changes vote
- `review_started` - User starts review
- `ballot_submitted` - Ballot submitted
- `incomplete_ballot_attempt` - Incomplete submit attempt

**System Events**:
- `login` / `logout`
- `language_changed`
- `app_error` (automatic)
- `admin_access_attempted`
- `results_downloaded`

### Error Handling Service

**Location**: `src/services/errorService.js`

**Setup** (in App.jsx):
```javascript
import { setupGlobalErrorHandler } from './services/errorService';

useEffect(() => {
  setupGlobalErrorHandler(); // Catches unhandled errors
}, []);
```

**Usage in Components**:
```javascript
import { logError, ERROR_TYPES } from '../services/errorService';

try {
  await submitBallot();
} catch (error) {
  logError(ERROR_TYPES.FIRESTORE_ERROR, error, {
    operation: 'submitBallot'
  });
}
```

**Error Types**:
- `AUTH_ERROR` - Authentication failures
- `FIRESTORE_ERROR` - Database operations
- `VALIDATION_ERROR` - Input validation
- `NETWORK_ERROR` - Network issues
- `UI_ERROR` - Render/component errors
- `COMPONENT_ERROR` - Component lifecycle
- `UNKNOWN_ERROR` - Unhandled errors

**Error Log**:
```javascript
import { getErrorLog, downloadErrorLog } from '../services/errorService';

// Get recent errors (last 50)
const errors = getErrorLog();

// Export for analysis
downloadErrorLog();
```

**See Setup**: [ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md) for complete integration guide

---

## �🚀 Scalability & Future Iterations

### Phase 1 (Current): MVP
- ✅ Basic voting UI
- ✅ Firebase integration
- ✅ One-time vote enforcement

### Phase 2 (Next): Features
- [ ] Admin dashboard (results visualization)
- [ ] Vote editing (allow corrections until deadline)
- [ ] Leaderboards (who guessed most correctly)
- [ ] Social sharing (predicted outcomes)

### Phase 3 (Later): Advanced
- [ ] Real-time results charts (Firebase Realtime DB)
- [ ] User profiles (voting history)
- [ ] Multiplayer leagues/tournaments
- [ ] Mobile app (React Native)

**For Future Development**:
- Keep components isolated (makes splitting easier)
- Use custom hooks for shared logic
- Plan for API layer (Firebase Functions if needed)
- Document breaking changes immediately

---

## 📚 File Reference Matrix

| File | Purpose | Modify When | Complexity |
|---|---|---|---|
| `src/App.jsx` | State orchestration, main views | Adding views, state logic, workflow | 🔴 High |
| `src/data/categories.js` | Award data | Yearly updates, new categories | 🟢 Low |
| `src/data/i18n/es.js` | Spanish literals (150+ keys) | Add/update UI text in Spanish | 🟢 Low |
| `src/data/i18n/en.js` | English literals (150+ keys) | Add/update UI text in English | 🟢 Low |
| `src/data/literals.js` | i18n index (imports from i18n folder) | Rarely - architecture changes only | 🟡 Medium |
| `src/firebase.js` | Firebase config | New features (Storage, Functions) | 🟡 Medium |
| `src/components/*` | UI pieces | Feature additions, component reuse | 🟡 Medium |
| `src/index.css` | Tailwind setup | Custom colors, animations | 🟡 Medium |
| `firestore.rules` | Security | New collections, permissions | 🟠 High-Risk |
| `tailwind.config.js` | Styling config | Theme changes, breakpoints | 🟡 Medium |

---

## ⚠️ Anti-Patterns (Don't Do This)

❌ **Hardcode categories in JSX**  
→ Always use `src/data/categories.js`

❌ **Hardcode UI text/literals in components**  
→ Always use `src/data/i18n/es.js` (Spanish) and `src/data/i18n/en.js` (English)  
→ Never create text strings directly in JSX

❌ **Use localStorage as source of truth for votes**  
→ localStorage is UI-only; Firestore is single source of truth

❌ **Trust client-side UID validation**  
→ Always enforce in Firestore rules (`request.auth.uid == userId`)

❌ **Custom CSS classes**  
→ Use Tailwind utilities exclusively

❌ **Directly modify Firestore documents without UID check**  
→ Always verify user permissions first

❌ **Long components (>300 lines)**  
→ Split into smaller, reusable components

---

## ✅ Best Practices (Do This)

✅ **Use `setDoc()` with UID as key** for "upsert" behavior (creates or overwrites)

✅ **Manage state in App.jsx** (single source of truth)

✅ **Externalize data to `src/data/`** for easy updates  
   - Categories in `src/data/categories.js`  
   - **Always add literals to BOTH** `src/data/i18n/es.js` **AND** `src/data/i18n/en.js`

✅ **Track user actions with Analytics**  
   - Import from `src/services/analyticsService.js`  
   - Track: login, votes, submissions, navigation  
   - Never hardcode event names

✅ **Wrap errors with error handler**  
   - Use `logError()` from `src/services/errorService.js`  
   - Include context (operation name, user, etc)  
   - Let global handler catch unhandled errors

✅ **Test mobile-first** (start with 320px viewport)

✅ **Comment complex logic** (explain the WHY, not the WHAT)

✅ **Use camelCase consistently** (reduces cognitive load)

✅ **Batch Firestore queries** (read all results in one query, not multiple)

---

## 📞 Troubleshooting Reference

| Problem | First Check | Solution |
|---|---|---|
| Firebase errors | DevTools Console | Check credentials in `src/firebase.js` |
| Auth not working | Google OAuth setup | Verify in Firebase Console + Authorized Domains |
| Votes not saving | Firestore rules | Check `.github/firestore.rules` for write permissions |
| Mobile layout broken | Tailwind breakpoints | Use `sm:`, `md:`, `lg:` (mobile-first) |
| Categories not showing | `src/data/categories.js` | Verify structure matches pattern |
| localStorage not persisting | Browser settings | Check Private/Incognito mode |

---

## 🔄 Change Log Template

When making significant changes, add entry here:

```markdown
### [YYYY-MM-DD] - Feature/Fix Name
- **Changed**: File name and what changed
- **Why**: Reason for change
- **Breaking**: Yes/No (affects existing data/API?)
- **Test**: How to verify
```

---

## 🎓 For Onboarding New Developers

1. Read [README.md](../../README.md) — installation & feature overview
2. Explore `src/App.jsx` — understand state flow
3. Check `src/data/categories.js` — see data structure
4. Run `npm run dev` — test locally
5. Make first PR: update a category or fix a typo

---

**Last Updated**: 2026-04-02  
**Version**: 1.0 (MVP)  
**Agent Status**: ✅ Ready for Production