---
name: TGA Ballot Development Standards
description: "Apply these standards to all development on TGA Ballot project. Ensures consistency, security, and maintainability across years."
applyTo: ["src/**/*.jsx", "src/**/*.js"]
---

# TGA Ballot Development Standards

## 📋 Code Quality Standards

### JavaScript/React
- ✅ Use React 18 hooks (no class components)
- ✅ Destructure props and state at top of function
- ✅ Keep components under 300 lines
- ✅ Use meaningful variable names (no `x`, `tmp`, `data1`)
- ✅ Add JSDoc comments for complex functions
- ✅ Use `.jsx` extension for files with JSX

### Naming Conventions
- **camelCase**: `userNickname`, `isDeadlineReached`, `handleSubmit()`
- **PascalCase**: `ResultsPanel`, `VoteCard`, `AdminDashboard`
- **kebab-case**: Only in CSS classes (Tailwind utilities)
- **CONSTANT_CASE**: Only for magic numbers or constants
  ```javascript
  const DEADLINE_MONTH = 11; // December
  const DEADLINE_DAY = 1;
  ```

### File Organization
```
src/
├── App.jsx                    # Main orchestrator
├── firebase.js                # Config only (no logic)
├── index.css                  # Tailwind directives
├── main.jsx                   # React DOM entry
├── data/
│   ├── categories.js          # DO NOT add logic here
│   └── literals.js            # DO NOT add logic here
└── components/
    ├── YourComponent.jsx      # One component per file
    └── YourComponent.module.css (if custom CSS needed)
```

## 🔒 Security Rules

### Firebase Rules (Non-Negotiable)
Every write operation MUST check UID:
```plaintext
allow write: if request.auth != null && request.auth.uid == userId;
```

### localStorage Usage
- ✅ Use for: UI state, temporary progress, user preferences
- ❌ Never for: Credentials, votes, sensitive data
- Rationale: localStorage survives page refresh but is client-side mutable

### Firestore Data
- ✅ Timestamps: Use ISO format `new Date().toISOString()`
- ✅ Document IDs: Always `userId` (Firebase UID)
- ❌ Never: Store passwords, unencrypted emails in custom fields

## 🎨 Styling Requirements

### Tailwind Only
- ✅ Use Tailwind utilities exclusively
- ❌ Never: Custom CSS classes (except animations)
- ❌ Never: Inline styles (except dynamic values)

### Mobile-First Breakpoints
```javascript
// WRONG (desktop-first):
<div className="p-8 sm:p-4">

// CORRECT (mobile-first):
<div className="p-4 md:p-8">
```

| Breakpoint | Width |
|---|---|
| (none) | Mobile: 320px+ |
| `sm:` | 640px+ |
| `md:` | 768px+ |
| `lg:` | 1024px+ |
| `xl:` | 1280px+ |

### Dark Mode (Already Default)
- Primary dark: `bg-slate-900`
- Secondary dark: `bg-slate-800`
- Accent: `text-yellow-500`
- Muted: `text-slate-400`

## 📊 Data Structure Standards

### Firestore Documents
```javascript
// CORRECT:
{
  userId: "abc123",                    // camelCase
  userEmail: "user@gmail.com",
  userNickname: "Player123",
  selections: {                        // nested but flat structure
    gameOfTheYear: "Elden Ring",
    bestArtDirection: "Astro Bot"
  },
  submittedAt: "2024-10-15T14:30:00Z", // ISO format
  isActive: true                       // boolean for soft-delete
}

// WRONG:
{
  user_id: "abc123",                   // snake_case ❌
  User_Email: "user@gmail.com",        // PascalCase ❌
  "user-nickname": "Player123",        // kebab-case ❌
  Selections: {                        // PascalCase ❌
    Game_Of_The_Year: "Elden Ring"    // snake_case ❌
  }
}
```

### Category Data
```javascript
// CORRECT:
{
  id: "bestNarrative",               // camelCase, unique
  title: "Best Narrative",           // User-facing
  options: ["Option A", "Option B"]  // Simple string array
}

// WRONG:
{
  ID: "bestNarrative",               // CONSTANT_CASE ❌
  name: "Best Narrative",            // Confusing key ❌
  nominees: {                        // Object instead of array ❌
    0: "Option A"
  }
}
```

## 🔄 State Management Pattern

### Single Source of Truth
```javascript
// ✅ CORRECT: State in App.jsx (parent), pass down
function App() {
  const [userVotes, setUserVotes] = useState({});
  
  return (
    <VoteCategory 
      votes={userVotes}
      onSelectOption={(categoryId, option) => {
        setUserVotes({...userVotes, [categoryId]: option});
      }}
    />
  );
}

// ❌ WRONG: State scattered across components
function App() { return <VoteCategory />; }
function VoteCategory() {
  const [votes, setVotes] = useState({});
  const [otherVotes, setOtherVotes] = useState({});
  // Confusing data flow
}
```

## 🧪 Testing Before Commit

### Manual Testing Checklist
- [ ] Works on mobile (320px, real device if possible)
- [ ] Works on tablet (768px)
- [ ] Works on desktop (1024px+)
- [ ] No console errors (F12 > Console)
- [ ] Firebase writes verified (check Firestore)
- [ ] camelCase consistency verified
- [ ] Responsive images/text (no horizontal scroll on mobile)

### Local Test Commands
```bash
npm run dev        # Run locally
npm run build      # Check build succeeds
npm audit          # Check security vulnerabilities
```

## 📝 Commit Message Standards

### Format
```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

### Examples
```
feat(voting): add validation for duplicate votes
fix(auth): resolve Firebase UID mismatch error
refactor(categories): extract category list to constants
style(ui): improve mobile button sizing
docs(setup): add Firebase configuration steps
```

### Types
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring
- `style:` Styling/formatting
- `docs:` Documentation
- `chore:` Build tools, deps

## 🚫 Absolute No-Go's

| Issue | Reason | Fix |
|---|---|---|
| Hardcoded categories in JSX | Unmaintainable | Use `src/data/categories.js` |
| Custom CSS | Inconsistency | Use Tailwind utilities |
| Unencrypted secrets in code | Security breach | Use `.env.local` |
| localStorage as vote source | Data loss risk | Use Firestore |
| Desktop-first Tailwind | Mobile breaks | Use mobile-first breakpoints |
| Skipping Firebase rules | Anyone can hack | Always check UID |
| Promise chains (`.then().then()`) | Hard to read | Use `async/await` |
| Prop drilling >3 levels | Unmaintainable | Use Context API or lift state |

## ✅ Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] No console warnings/errors
- [ ] camelCase verified throughout
- [ ] Mobile tested on real device
- [ ] Firestore rules are correct
- [ ] Environment variables configured
- [ ] `npm run build` succeeds
- [ ] Categories updated for current year
- [ ] Deadline date is correct
- [ ] Backup of Firestore created (if production)

---

**Version**: 1.0  
**Last Updated**: 2024-10-15  
**Applies To**: All TGA Ballot development
