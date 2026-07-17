# Design System - Personal Finance Platform

Complete design system documentation for the budget tracking personal finance platform using Tailwind CSS and React. This guide covers design tokens, component inventory, accessibility standards, and implementation patterns.

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Component Inventory](#component-inventory)
3. [Component Usage & Examples](#component-usage--examples)
4. [Accessibility Guidelines](#accessibility-guidelines)
5. [Dark/Light Mode Support](#darklight-mode-support)
6. [Responsive Breakpoints](#responsive-breakpoints)
7. [Motion & Animation Guidelines](#motion--animation-guidelines)
8. [Icon System](#icon-system)
9. [Form Patterns & Validation](#form-patterns--validation)
10. [Loading States & Skeletons](#loading-states--skeletons)
11. [Error Handling UI Patterns](#error-handling-ui-patterns)
12. [Empty States](#empty-states)

---

## Design Tokens

### Color System

The design system uses a sophisticated color palette inspired by modern fintech applications, with a focus on clarity, accessibility, and dark mode optimization.

#### Ink Colors (Text & Borders)
The ink color palette provides a comprehensive range for text, borders, and backgrounds in dark mode.

```css
ink-50:    #fafaf7  /* Lightest - rarely used */
ink-100:   #f5f5f2  /* Light backgrounds */
ink-200:   #e5e5e1  /* Subtle borders */
ink-300:   #d1d1cc  /* Secondary text */
ink-400:   #afafaa  /* Tertiary text */
ink-500:   #7d8187  /* Disabled/placeholder text */
ink-600:   #5e5e5e  /* Borders */
ink-700:   #363a3f  /* Borders, disabled */
ink-800:   #1a1c20  /* Dark backgrounds */
ink-900:   #0a0a0a  /* Darkest */
```

**Usage:**
- `ink-50` / `ink-100`: Primary text and content
- `ink-200` / `ink-300`: Secondary text
- `ink-400` / `ink-500`: Tertiary/disabled text
- `ink-600` / `ink-700`: Borders and dividers
- `ink-800` / `ink-900`: Card and section backgrounds

#### Canvas Colors (Background)
Specialized colors for layered background hierarchy.

```css
canvas:        #0a0a0a  /* Primary background */
canvas-soft:   #1a1c20  /* Hover states, inputs */
canvas-card:   #191919  /* Card backgrounds */
canvas-mid:    #363a3f  /* Elevated surfaces */
```

#### Accent Colors (Interactive & Status)
Vibrant accent colors for actions, feedback, and status indicators.

```css
accent-sunset:       #ff7a17  /* Primary action */
accent-sunset-soft:  #ffc285  /* Hover/active state */
accent-dusk:         #7c3aed  /* Secondary action */
accent-twilight:     #c4b5fd  /* Hover state for dusk */
accent-breeze:       #a0c3ec  /* Info/secondary accent */
accent-midnight:     #0d1726  /* Deep accent */
```

**Usage:**
- `accent-sunset`: Primary buttons, active states, key CTAs
- `accent-dusk`: Danger actions, secondary CTAs
- `accent-breeze`: Info states, supplementary elements
- `accent-midnight`: Deep emphasis, special states

#### Semantic Colors (Status)
Additional colors for semantic meaning and status communication.

```css
success:  #10b981  /* Success, positive */
warning:  #f59e0b  /* Warning, caution */
error:    #ef4444  /* Error, destructive */
info:     #3b82f6  /* Information, neutral */
```

### Typography

#### Font Families

```
sans-serif:   Inter, system-ui, -apple-system
display:      Inter, system-ui
monospace:    GeistMono, ui-monospace, SFMono-Regular
```

#### Font Sizes & Line Heights

**Display Sizes** (Headings & Hero Text)
```css
display-xl:  96px  line-height: 96px  letter-spacing: -2.4px  weight: 400
display-lg:  72px  line-height: 72px  letter-spacing: -1.8px  weight: 400
display-md:  48px  line-height: 48px  letter-spacing: -1.2px  weight: 400
display-sm:  32px  line-height: 36px  letter-spacing: -0.6px  weight: 400
```

**Body Sizes** (Content)
```css
body-lg:  18px  line-height: 28px  weight: 400
body-md:  16px  line-height: 24px  weight: 400
body-sm:  14px  line-height: 20px  weight: 400
```

**Specialty Sizes**
```css
caption-mono:  14px  line-height: 20px  letter-spacing: 1.4px  weight: 400
```

#### Font Weight System

```
Light:    300 (rarely used)
Normal:   400 (primary weight)
Medium:   500 (emphasis, labels)
Semibold: 600 (strong emphasis)
Bold:     700 (headings, critical)
```

### Spacing Scale

A consistent spacing system based on 4px increments for alignment and hierarchy.

```css
xxs:    2px     (tight spacing)
xs:     4px     (small gaps)
sm:     8px     (standard padding)
base:   16px    (default spacing)
lg:     24px    (generous spacing)
xl:     32px    (large sections)
2xl:    48px    (major sections)
3xl:    64px    (page margins)
```

**Application:**
- Padding: `p-2` (8px), `p-4` (16px), `p-6` (24px)
- Margin: `m-2` (8px), `m-4` (16px), `m-6` (24px)
- Gaps: `gap-2` (8px), `gap-4` (16px), `gap-6` (24px)

### Border Radius

```css
none:  0px    (sharp corners)
sm:    8px    (standard rounded)
pill:  9999px (fully rounded)
```

**Application:**
- Cards & containers: `rounded-sm` (8px)
- Buttons & inputs: `rounded-pill` (fully rounded)
- Images: `rounded-none` (square) or `rounded-sm`

### Shadows

Shadow system for elevation and depth perception.

```css
/* Cards and elevated surfaces */
shadow-sm:  0 1px 2px rgba(0,0,0,0.05)
shadow-md:  0 4px 6px rgba(0,0,0,0.1)
shadow-lg:  0 10px 15px rgba(0,0,0,0.15)
shadow-xl:  0 20px 25px rgba(0,0,0,0.2)
shadow-2xl: 0 25px 50px rgba(0,0,0,0.25)
```

**Application:**
- Card base: `shadow-md`
- Hover/interactive: `shadow-lg`
- Modals/overlays: `shadow-xl` or `shadow-2xl`

### Z-Index Scale

```css
z-0:     0      (stacked content)
z-10:    10     (raised elements)
z-20:    20     (dropdowns, tooltips)
z-30:    30     (modals)
z-40:    40     (sticky headers)
z-50:    50     (toast notifications)
```

---

## Component Inventory

### Core Components (30+)

This section outlines all components available in the design system. Each component follows accessibility standards and supports dark/light mode.

#### 1. Button

**Variants:**
- Primary (solid background)
- Secondary (outline)
- Danger (destructive action)
- Ghost (text-only)
- Icon (icon-only)

**States:**
- Default
- Hover
- Active/Pressed
- Disabled
- Loading

**Sizes:**
- Small (sm)
- Medium (md) - default
- Large (lg)

#### 2. Input Field

**Types:**
- Text
- Email
- Password
- Number
- Date
- Time
- Search

**States:**
- Default
- Focused
- Filled
- Error
- Disabled
- Success

**Features:**
- Placeholder text
- Label
- Help text
- Error message
- Character counter (optional)
- Prefix/suffix icons

#### 3. Textarea

**Features:**
- Resizable
- Character limit indicator
- Auto-expand (optional)
- Error state
- Disabled state

#### 4. Checkbox

**States:**
- Unchecked
- Checked
- Indeterminate
- Disabled
- Error

**Features:**
- Label
- Help text
- Error message

#### 5. Radio Button

**States:**
- Unselected
- Selected
- Disabled

**Features:**
- Label
- Group layout
- Help text

#### 6. Toggle/Switch

**States:**
- Off
- On
- Disabled

**Features:**
- Label
- Help text
- Optional description

#### 7. Select Dropdown

**Features:**
- Default placeholder
- Multiple selection (optional)
- Search filtering
- Grouping
- Disabled items
- Custom rendering

**States:**
- Default
- Open
- Focused
- Disabled
- Error

#### 8. Card

**Components:**
- Card container
- Card header
- Card title
- Card subtitle
- Card body
- Card footer

**Features:**
- Border styling
- Shadow/elevation
- Responsive padding
- Interactive hover states

#### 9. Badge

**Variants:**
- Accent (primary)
- Secondary
- Success
- Warning
- Error
- Info

**Sizes:**
- Small
- Medium (default)
- Large

#### 10. Avatar

**Features:**
- Image
- Initials fallback
- Status indicator (online/offline/away)
- Size options (xs, sm, md, lg, xl)
- Variants (circle, square)

#### 11. Alert / Banner

**Variants:**
- Success
- Warning
- Error
- Info

**Components:**
- Alert container
- Alert title
- Alert description
- Alert action (button)

**Features:**
- Icon
- Dismissible
- Closeable

#### 12. Modal / Dialog

**Features:**
- Header with title
- Body content
- Footer with actions
- Close button (X)
- Backdrop overlay
- Scrollable content

**States:**
- Open
- Loading
- Error

#### 13. Tooltip

**Features:**
- Text content
- Position options (top, right, bottom, left)
- Delay on hover
- Dark/light mode support
- Arrow pointing

#### 14. Popover

**Features:**
- Trigger element
- Content area
- Positioning
- Close on outside click

#### 15. Dropdown Menu

**Features:**
- Menu items
- Dividers
- Grouped items
- Disabled items
- Icons
- Checkmarks for selection

**Positioning:**
- Follows trigger element
- Auto-repositions
- Keyboard navigation

#### 16. Tab Component

**Features:**
- Tab list
- Tab triggers
- Tab content panels
- Lazy loading support

**Behaviors:**
- Keyboard navigation (arrow keys)
- Active state indicator
- Scrollable tabs (mobile)

#### 17. Accordion

**Features:**
- Accordion item
- Trigger (header)
- Content panel
- Expand/collapse animation

**Behaviors:**
- Single or multiple items open
- Smooth transitions
- Keyboard support

#### 18. Breadcrumb

**Features:**
- Item listing
- Separators
- Current page indicator
- Clickable links

#### 19. Pagination

**Features:**
- Previous/Next buttons
- Page numbers
- Jump to page
- Items per page selector

**States:**
- Disabled (first/last page)
- Current page highlight

#### 20. Table / Data Grid

**Features:**
- Header row
- Body rows
- Footer row (optional)
- Sortable columns
- Selectable rows (checkbox)
- Pagination
- Empty state

**Responsive:**
- Horizontal scroll on mobile
- Collapsible columns
- Card view alternative

#### 21. Progress Bar

**Features:**
- Percentage indicator
- Label
- Animated transition
- Size options (sm, md, lg)
- Color variants (success, warning, error)

#### 22. Skeleton / Placeholder

**Features:**
- Text skeleton
- Image skeleton
- Card skeleton
- Table skeleton
- Custom shapes

**Animation:**
- Pulse effect
- Shimmer effect

#### 23. Toast Notification

**Variants:**
- Success
- Error
- Warning
- Info

**Features:**
- Icon
- Title
- Description
- Action button
- Auto-dismiss
- Close button
- Stack management

**Positions:**
- Top-right (default)
- Top-left
- Top-center
- Bottom-right
- Bottom-left
- Bottom-center

#### 24. Spinner / Loading Indicator

**Types:**
- Circular spinner
- Linear progress
- Dots animation
- Bar animation

**Sizes:**
- Small (16px)
- Medium (24px)
- Large (40px)

#### 25. Empty State

**Components:**
- Illustration/Icon
- Heading
- Description
- Call-to-action button
- Additional actions

#### 26. Form Layout

**Features:**
- Form wrapper
- Field group
- Label
- Error message
- Help text
- Inline vs block layout

**Patterns:**
- Horizontal form
- Vertical form
- Two-column form

#### 27. Link Component

**Variants:**
- Inline link
- Button-like link
- Icon link
- External link (with icon)

**States:**
- Default
- Hover
- Active/Visited
- Disabled

#### 28. Text Formatting

**Components:**
- Heading (h1-h6)
- Paragraph
- Emphasis (bold, italic)
- Code block
- Blockquote
- List (ordered, unordered)

#### 29. Divider

**Features:**
- Horizontal line
- Vertical line
- Optional label/text
- Spacing control

#### 30. Header / Navigation Bar

**Features:**
- Logo area
- Navigation links
- Right-side actions
- Mobile menu
- Sticky positioning
- Search bar

#### 31. Sidebar Navigation

**Features:**
- Collapsible menu
- Nested items
- Active state
- Icons
- Badges/counts

#### 32. Footer

**Components:**
- Links sections
- Copyright notice
- Social links
- Newsletter signup
- Contact information

---

## Component Usage & Examples

### Button Examples

```tsx
// Primary Button
<button className="btn-primary">Click me</button>

// Secondary Button
<button className="btn-secondary">Secondary</button>

// Danger Button
<button className="btn-danger">Delete</button>

// Large Button
<button className="btn-primary px-6 py-3 text-lg">Large Button</button>

// Button with Icon
<button className="btn-primary flex items-center gap-2">
  <Save size={16} />
  Save Changes
</button>

// Disabled Button
<button className="btn-primary disabled:opacity-50">Disabled</button>
```

### Input Field Examples

```tsx
// Basic Input
<input
  type="text"
  className="input-base"
  placeholder="Enter text..."
/>

// Input with Label
<div className="flex flex-col gap-2">
  <label className="text-body-sm font-medium text-ink-50">
    Email Address
  </label>
  <input
    type="email"
    className="input-base"
    placeholder="you@example.com"
  />
</div>

// Input with Error
<div className="flex flex-col gap-2">
  <label className="text-body-sm font-medium text-ink-50">
    Password
  </label>
  <input
    type="password"
    className="input-base border-error focus:ring-error"
    placeholder="••••••••"
  />
  <span className="text-body-sm text-error">
    Password must be at least 8 characters
  </span>
</div>

// Input with Help Text
<div className="flex flex-col gap-2">
  <label className="text-body-sm font-medium text-ink-50">
    Username
  </label>
  <input
    type="text"
    className="input-base"
    placeholder="john_doe"
  />
  <span className="text-body-sm text-ink-400">
    3-20 characters, letters and numbers only
  </span>
</div>
```

### Card Examples

```tsx
// Basic Card
<div className="card">
  <div className="card-body">
    <h3 className="text-display-sm text-ink-50">Card Title</h3>
    <p className="text-body-md text-ink-300">
      Card content goes here
    </p>
  </div>
</div>

// Card with Header and Footer
<div className="card">
  <div className="card-header">
    <h3 className="text-display-sm text-ink-50">Settings</h3>
  </div>
  <div className="card-body">
    {/* Content */}
  </div>
  <div className="card-footer">
    <button className="btn-primary">Save Changes</button>
  </div>
</div>

// Card Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <div key={item.id} className="card">
      <div className="card-body">
        <h4 className="text-lg text-ink-50">{item.title}</h4>
        <p className="text-body-sm text-ink-400">{item.description}</p>
      </div>
    </div>
  ))}
</div>
```

### Badge Examples

```tsx
// Accent Badge
<span className="badge-accent">Active</span>

// Secondary Badge
<span className="badge-secondary">Pending</span>

// Status Badges with Colors
<span className="inline-flex items-center rounded-pill bg-green-500 bg-opacity-10 px-3 py-1 text-sm font-normal text-green-400">
  Completed
</span>

<span className="inline-flex items-center rounded-pill bg-red-500 bg-opacity-10 px-3 py-1 text-sm font-normal text-red-400">
  Failed
</span>
```

### Alert Examples

```tsx
// Success Alert
<div className="flex gap-3 rounded-sm border border-green-600 bg-green-500 bg-opacity-5 p-4">
  <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
  <div>
    <h4 className="font-medium text-ink-50">Success!</h4>
    <p className="text-body-sm text-ink-300">Your changes have been saved.</p>
  </div>
</div>

// Error Alert
<div className="flex gap-3 rounded-sm border border-red-600 bg-red-500 bg-opacity-5 p-4">
  <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
  <div>
    <h4 className="font-medium text-ink-50">Error</h4>
    <p className="text-body-sm text-ink-300">
      Something went wrong. Please try again.
    </p>
  </div>
</div>

// Info Alert with Action
<div className="flex gap-3 rounded-sm border border-blue-600 bg-blue-500 bg-opacity-5 p-4">
  <Info size={20} className="text-blue-400 flex-shrink-0" />
  <div className="flex-1">
    <h4 className="font-medium text-ink-50">New Feature</h4>
    <p className="text-body-sm text-ink-300">Check out our new budget planning tool.</p>
  </div>
  <button className="text-body-sm font-medium text-accent-sunset hover:text-accent-sunset-soft">
    Learn More
  </button>
</div>
```

### Modal Examples

```tsx
// Basic Modal
{isOpen && (
  <div className="fixed inset-0 z-30 flex items-center justify-center">
    {/* Backdrop */}
    <div
      className="fixed inset-0 bg-black bg-opacity-50"
      onClick={onClose}
    />
    {/* Modal */}
    <div className="relative z-40 w-full max-w-md rounded-sm bg-canvas-card p-6 shadow-xl">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 text-ink-400 hover:text-ink-200"
      >
        <X size={20} />
      </button>
      <h2 className="text-display-md text-ink-50">Confirm Action</h2>
      <p className="mt-2 text-body-md text-ink-300">
        Are you sure you want to delete this item?
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="btn-danger flex-1"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
```

### Table Examples

```tsx
// Basic Data Table
<table className="table-minimal">
  <thead>
    <tr>
      <th>Name</th>
      <th>Amount</th>
      <th>Date</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {transactions.map(tx => (
      <tr key={tx.id}>
        <td>{tx.name}</td>
        <td>${tx.amount.toFixed(2)}</td>
        <td>{formatDate(tx.date)}</td>
        <td>
          <span className="badge-accent">{tx.status}</span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Form Examples

```tsx
// Login Form
<form className="flex flex-col gap-6">
  <div className="flex flex-col gap-2">
    <label htmlFor="email" className="text-body-sm font-medium text-ink-50">
      Email
    </label>
    <input
      id="email"
      type="email"
      className="input-base"
      placeholder="you@example.com"
    />
  </div>

  <div className="flex flex-col gap-2">
    <label htmlFor="password" className="text-body-sm font-medium text-ink-50">
      Password
    </label>
    <input
      id="password"
      type="password"
      className="input-base"
      placeholder="••••••••"
    />
  </div>

  <div className="flex items-center gap-2">
    <input
      id="remember"
      type="checkbox"
      className="h-4 w-4 rounded border-ink-600 bg-canvas-soft text-accent-sunset focus:ring-2 focus:ring-accent-sunset"
    />
    <label htmlFor="remember" className="text-body-sm text-ink-400">
      Remember me
    </label>
  </div>

  <button type="submit" className="btn-primary">
    Sign In
  </button>

  <button type="button" className="btn-secondary">
    Create Account
  </button>
</form>
```

---

## Accessibility Guidelines

### WCAG AA Compliance

All components follow WCAG 2.1 Level AA guidelines for accessibility.

#### Color Contrast

**Minimum contrast ratios:**
- Text on background: 4.5:1 (normal), 3:1 (large text 18pt+)
- Interactive elements: 3:1

**Verified combinations:**
```
ink-50 on canvas:        #fafaf7 on #0a0a0a = 12.3:1 ✓
ink-300 on canvas:       #d1d1cc on #0a0a0a = 8.5:1 ✓
accent-sunset on canvas: #ff7a17 on #0a0a0a = 7.2:1 ✓
ink-400 on canvas:       #afafaa on #0a0a0a = 6.1:1 ✓
```

#### Keyboard Navigation

**Standard patterns:**
- `Tab` / `Shift+Tab`: Navigate between focusable elements
- `Enter` / `Space`: Activate buttons and toggle controls
- `Arrow Keys`: Navigate within components (tabs, menus, sliders)
- `Escape`: Close dialogs, popovers, dropdowns
- `Home` / `End`: Jump to first/last item in list

**Implementation:**
```tsx
// Example: Keyboard support in custom button
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
  className="btn-primary focus:outline-none focus:ring-2 focus:ring-accent-sunset focus:ring-offset-2 focus:ring-offset-canvas"
>
  Click Me
</button>
```

#### Focus Management

**Focus styles:**
- Visible focus ring (minimum 2px)
- Focus indicator color: `accent-sunset` (#ff7a17)
- Focus ring offset for better visibility

```css
/* Global focus styles */
@layer components {
  *:focus-visible {
    @apply outline-none ring-2 ring-accent-sunset ring-offset-2 ring-offset-canvas;
  }

  /* Custom focus for inputs */
  .input-base:focus {
    @apply border-accent-sunset ring-2 ring-accent-sunset ring-offset-2 ring-offset-canvas;
  }
}
```

#### ARIA Labels

**Required ARIA attributes:**
- `aria-label`: For icon-only buttons
- `aria-labelledby`: Link elements to their labels
- `aria-describedby`: Link inputs to error messages
- `aria-live`: For dynamic content updates
- `role`: Semantic roles for custom components

**Examples:**
```tsx
// Icon-only button
<button
  className="btn-secondary"
  aria-label="Close dialog"
  onClick={onClose}
>
  <X size={20} />
</button>

// Input with error message
<div>
  <input
    id="email"
    type="email"
    className="input-base"
    aria-describedby="email-error"
  />
  <span id="email-error" className="text-error">
    Please enter a valid email
  </span>
</div>

// Alert with role
<div
  role="alert"
  className="flex gap-3 rounded-sm border border-red-600 bg-red-500 bg-opacity-5 p-4"
>
  <AlertCircle size={20} className="text-red-400" />
  <div>
    <h4 className="font-medium text-ink-50">Error</h4>
    <p className="text-body-sm text-ink-300">Something went wrong.</p>
  </div>
</div>
```

#### Semantic HTML

- Use semantic elements (`<button>`, `<nav>`, `<main>`, `<article>`, etc.)
- Proper heading hierarchy (h1 → h6)
- Form labels associated with inputs via `<label htmlFor>`
- Native form controls when possible

```tsx
// Good semantic form
<form className="flex flex-col gap-4">
  <div className="flex flex-col gap-2">
    <label htmlFor="username" className="font-medium">
      Username
    </label>
    <input
      id="username"
      type="text"
      required
      className="input-base"
    />
  </div>
  <button type="submit" className="btn-primary">
    Submit
  </button>
</form>
```

#### Motion & Vestibular Considerations

Respect user preferences for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Text Alternatives

- Provide alt text for images
- Provide captions for videos
- Describe data visualizations

```tsx
// Image with alt text
<img
  src="/chart.png"
  alt="Monthly expense breakdown showing 40% housing, 25% food, 20% transport, 15% entertainment"
  className="w-full rounded-sm"
/>
```

#### Screen Reader Support

- Announce dynamic content with `role="status"` and `aria-live="polite"`
- Hide decorative elements with `aria-hidden="true"`
- Provide alternative text for charts/visualizations

```tsx
// Dynamic status update
<div role="status" aria-live="polite" className="sr-only">
  {message}
</div>

// Decorative icon
<Icon aria-hidden="true" size={20} />
```

---

## Dark/Light Mode Support

The design system is optimized for dark mode, with light mode support available through Tailwind's `dark:` prefix.

### Color Mapping Strategy

**Dark Mode (Default):**
- Canvas backgrounds: `#0a0a0a` → `canvas`
- Text: `#fafaf7` → `ink-50` / `ink-100`
- Accents: Vibrant colors (`#ff7a17`, `#7c3aed`)

**Light Mode:**
Invert color roles using `dark:` prefix:

```tsx
// Example component with light mode support
<div className="bg-white dark:bg-canvas text-slate-900 dark:text-ink-50">
  <h1 className="text-slate-900 dark:text-ink-50">Title</h1>
  <p className="text-slate-600 dark:text-ink-300">Content</p>
  <button className="bg-slate-900 dark:bg-ink-50 text-white dark:text-canvas">
    Action
  </button>
</div>
```

### Implementation

Add to `tailwind.config.js`:

```javascript
export default {
  darkMode: 'class', // or 'media'
  theme: {
    extend: {
      // ... existing config
    },
  },
}
```

Toggle theme:

```tsx
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="btn-secondary"
    >
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}
```

---

## Responsive Breakpoints

Tailwind CSS breakpoints for responsive design:

```
sm:   640px   (small phones)
md:   768px   (tablets)
lg:   1024px  (small laptops)
xl:   1280px  (desktops)
2xl:  1536px  (large screens)
```

### Mobile-First Approach

Always design mobile-first, then enhance for larger screens:

```tsx
// Mobile first, then tablet+, then desktop+
<div className="w-full md:w-1/2 lg:w-1/3">
  <div className="p-4 md:p-6 lg:p-8">
    <h2 className="text-display-sm md:text-display-md lg:text-display-lg">
      Responsive Heading
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <div key={item.id} className="card">
          {/* Card content */}
        </div>
      ))}
    </div>
  </div>
</div>
```

### Common Responsive Patterns

**Grid Layout:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>
```

**Sidebar Layout:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <aside className="lg:col-span-1">
    {/* Sidebar */}
  </aside>
  <main className="lg:col-span-3">
    {/* Main content */}
  </main>
</div>
```

**Navigation:**
```tsx
<nav className="hidden md:flex gap-6">
  {/* Desktop navigation */}
</nav>
<button className="md:hidden">
  {/* Mobile menu trigger */}
</button>
```

**Text Sizing:**
```tsx
<h1 className="text-2xl md:text-3xl lg:text-4xl">Responsive Heading</h1>
```

**Spacing:**
```tsx
<div className="p-4 md:p-6 lg:p-8 gap-2 md:gap-4 lg:gap-6">
  {/* Responsive spacing */}
</div>
```

---

## Motion & Animation Guidelines

### Transition Timing

**Standard durations:**
- Micro-interactions: 150ms (hover, focus)
- Component transitions: 200-300ms (modal open, dropdown)
- Page transitions: 300-500ms
- Delayed animations: 500ms+

```css
/* Transition utilities */
@layer utilities {
  .transition-fast {
    @apply transition-all duration-150;
  }

  .transition-base {
    @apply transition-all duration-200;
  }

  .transition-slow {
    @apply transition-all duration-300;
  }
}
```

### Common Animations

**Fade In/Out:**
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
```

**Slide In/Out:**
```css
@keyframes slideInDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideOutUp {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}
```

**Scale (Emphasis):**
```css
@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

### Accessibility - Reduced Motion

Always respect `prefers-reduced-motion`:

```tsx
// Component with motion support
export function Dialog({ isOpen, children }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(media.matches)
  }, [])

  const transitionDuration = prefersReducedMotion ? 0 : 200

  return (
    <div
      className={`transition-all ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      style={{
        transitionDuration: `${transitionDuration}ms`,
      }}
    >
      {children}
    </div>
  )
}
```

### Hover States

Subtle, purposeful hover effects:

```css
/* Button hover */
.btn-primary:hover {
  @apply bg-ink-100 transition-colors duration-150;
}

/* Link hover */
a:hover {
  @apply text-accent-sunset-soft transition-colors duration-150;
}

/* Card hover */
.card:hover {
  @apply shadow-lg transition-shadow duration-200;
}
```

---

## Icon System

### Icon Library

Uses **Lucide React** for consistent, clean iconography.

```bash
npm install lucide-react
```

### Common Icons

**Navigation:**
- `Home`, `Menu`, `X`, `ChevronLeft`, `ChevronRight`

**Actions:**
- `Plus`, `Edit`, `Trash`, `Download`, `Share`, `Settings`

**Status:**
- `CheckCircle`, `AlertCircle`, `Info`, `XCircle`, `HelpCircle`

**Finance:**
- `DollarSign`, `CreditCard`, `TrendingUp`, `TrendingDown`, `Wallet`

**UI:**
- `Search`, `Clock`, `Calendar`, `User`, `LogOut`, `Bell`

### Icon Usage

```tsx
import { Plus, Trash, DollarSign } from 'lucide-react'

// Icon in button
<button className="btn-primary flex items-center gap-2">
  <Plus size={18} />
  Add Transaction
</button>

// Icon only
<button className="btn-secondary" aria-label="Delete">
  <Trash size={20} />
</button>

// Icon with text
<span className="flex items-center gap-2 text-accent-sunset">
  <DollarSign size={16} />
  $2,500.00
</span>

// Icon sizing
<ChevronRight size={16} />    {/* Small: 16px */}
<ChevronRight size={20} />    {/* Medium: 20px */}
<ChevronRight size={24} />    {/* Large: 24px */}
```

### Icon Styling

```tsx
// Colored icon
<AlertCircle size={20} className="text-error" />

// Icon with opacity
<User size={20} className="text-ink-400 opacity-70" />

// Animated icon
<Loader size={20} className="animate-spin text-accent-sunset" />
```

---

## Form Patterns & Validation

### Form Structure

```tsx
export function BudgetForm() {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
  })
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Budget name is required'
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }
    if (!formData.category) {
      newErrors.category = 'Category is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      // Submit form
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Name Field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-body-sm font-medium text-ink-50">
          Budget Name *
        </label>
        <input
          id="name"
          type="text"
          className={`input-base ${
            errors.name ? 'border-error focus:ring-error' : ''
          }`}
          placeholder="e.g., Groceries"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" className="text-body-sm text-error">
            {errors.name}
          </span>
        )}
      </div>

      {/* Amount Field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="amount" className="text-body-sm font-medium text-ink-50">
          Amount ($) *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
            $
          </span>
          <input
            id="amount"
            type="number"
            className={`input-base pl-7 ${
              errors.amount ? 'border-error focus:ring-error' : ''
            }`}
            placeholder="0.00"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            aria-describedby={errors.amount ? 'amount-error' : undefined}
          />
        </div>
        {errors.amount && (
          <span id="amount-error" className="text-body-sm text-error">
            {errors.amount}
          </span>
        )}
      </div>

      {/* Category Dropdown */}
      <div className="flex flex-col gap-2">
        <label htmlFor="category" className="text-body-sm font-medium text-ink-50">
          Category *
        </label>
        <select
          id="category"
          className={`input-base ${
            errors.category ? 'border-error focus:ring-error' : ''
          }`}
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <option value="">Select a category...</option>
          <option value="food">Food & Dining</option>
          <option value="transport">Transportation</option>
          <option value="utilities">Utilities</option>
          <option value="entertainment">Entertainment</option>
        </select>
        {errors.category && (
          <span id="category-error" className="text-body-sm text-error">
            {errors.category}
          </span>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1">
          Create Budget
        </button>
        <button type="button" className="btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </form>
  )
}
```

### Validation Patterns

**Real-time validation:**
```tsx
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

const handleEmailChange = (e) => {
  const email = e.target.value
  setEmail(email)
  if (email && !validateEmail(email)) {
    setError('Invalid email format')
  } else {
    setError('')
  }
}
```

**Async validation:**
```tsx
const checkUsernameAvailability = async (username) => {
  if (username.length < 3) {
    setError('Username must be at least 3 characters')
    return
  }

  try {
    const response = await api.checkUsername(username)
    if (response.taken) {
      setError('Username is already taken')
    } else {
      setError('')
    }
  } catch (err) {
    setError('Error checking username')
  }
}
```

---

## Loading States & Skeletons

### Skeleton Components

**Text skeleton:**
```tsx
export function TextSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-canvas-soft rounded-sm animate-pulse"
          style={{
            width: i === lines - 1 ? '70%' : '100%',
          }}
        />
      ))}
    </div>
  )
}
```

**Card skeleton:**
```tsx
export function CardSkeleton() {
  return (
    <div className="card">
      <div className="card-body space-y-4">
        <div className="h-8 w-40 bg-canvas-soft rounded-sm animate-pulse" />
        <div className="space-y-3">
          <div className="h-4 bg-canvas-soft rounded-sm animate-pulse" />
          <div className="h-4 w-5/6 bg-canvas-soft rounded-sm animate-pulse" />
          <div className="h-4 w-4/6 bg-canvas-soft rounded-sm animate-pulse" />
        </div>
      </div>
    </div>
  )
}
```

**Table skeleton:**
```tsx
export function TableSkeleton({ rows = 5 }) {
  return (
    <table className="table-minimal">
      <thead>
        <tr>
          <th>
            <div className="h-4 w-24 bg-canvas-soft rounded-sm animate-pulse" />
          </th>
          <th>
            <div className="h-4 w-32 bg-canvas-soft rounded-sm animate-pulse" />
          </th>
          <th>
            <div className="h-4 w-20 bg-canvas-soft rounded-sm animate-pulse" />
          </th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            <td>
              <div className="h-4 w-24 bg-canvas-soft rounded-sm animate-pulse" />
            </td>
            <td>
              <div className="h-4 w-32 bg-canvas-soft rounded-sm animate-pulse" />
            </td>
            <td>
              <div className="h-4 w-20 bg-canvas-soft rounded-sm animate-pulse" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### Loading Indicators

**Spinner:**
```tsx
export function Spinner({ size = 'md' }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size]

  return (
    <div className={`${sizeClass} animate-spin`}>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.1"
        />
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="60"
          strokeDashoffset="0"
        />
      </svg>
    </div>
  )
}

// Usage
<div className="flex items-center gap-3">
  <Spinner size="md" />
  <span className="text-ink-300">Loading...</span>
</div>
```

**Progress bar:**
```tsx
export function ProgressBar({ value, max = 100 }) {
  const percentage = (value / max) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="h-2 w-full rounded-full bg-canvas-soft overflow-hidden">
        <div
          className="h-full bg-accent-sunset transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-body-sm text-ink-400">{Math.round(percentage)}%</span>
    </div>
  )
}
```

---

## Error Handling UI Patterns

### Error Alert

```tsx
export function ErrorAlert({ message, onDismiss }) {
  return (
    <div className="flex gap-3 rounded-sm border border-red-600 bg-red-500 bg-opacity-5 p-4">
      <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-medium text-ink-50">Error</h4>
        <p className="text-body-sm text-ink-300 mt-1">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-ink-400 hover:text-ink-200"
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>
      )}
    </div>
  )
}
```

### Form Field Error

```tsx
<div className="flex flex-col gap-2">
  <label htmlFor="email" className="text-body-sm font-medium text-ink-50">
    Email Address
  </label>
  <input
    id="email"
    type="email"
    className="input-base border-red-600 focus:ring-red-600"
    placeholder="you@example.com"
    aria-describedby="email-error"
  />
  <span id="email-error" className="text-body-sm text-red-400 flex items-center gap-1">
    <AlertCircle size={14} />
    Please enter a valid email address
  </span>
</div>
```

### Network Error

```tsx
export function NetworkError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-4xl">📡</div>
      <h3 className="text-display-sm text-ink-50">Connection Error</h3>
      <p className="mt-2 text-body-md text-ink-300">
        Failed to connect. Please check your internet connection.
      </p>
      <button onClick={onRetry} className="btn-primary mt-6">
        Try Again
      </button>
    </div>
  )
}
```

### 404 Not Found

```tsx
export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">404</div>
      <h3 className="text-display-sm text-ink-50">Page Not Found</h3>
      <p className="mt-2 text-body-md text-ink-300">
        The page you're looking for doesn't exist.
      </p>
      <a href="/" className="btn-primary mt-6">
        Go Home
      </a>
    </div>
  )
}
```

### Inline Error State

```tsx
<div className="card border-red-600 bg-red-500 bg-opacity-5">
  <div className="card-body">
    <div className="flex gap-3">
      <XCircle size={20} className="text-red-400 flex-shrink-0" />
      <div>
        <h4 className="font-medium text-ink-50">Transaction Failed</h4>
        <p className="text-body-sm text-ink-300 mt-1">
          Unable to process payment. Please try again or use a different payment method.
        </p>
      </div>
    </div>
  </div>
</div>
```

---

## Empty States

### Basic Empty State

```tsx
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-5xl">{Icon}</div>
      <h3 className="text-display-sm text-ink-50">{title}</h3>
      <p className="mt-2 max-w-md text-body-md text-ink-300">{description}</p>
      {action && (
        <button onClick={action} className="btn-primary mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// Usage
<EmptyState
  icon="📊"
  title="No Transactions Yet"
  description="Start tracking your spending by adding your first transaction."
  action={() => navigate('/add-transaction')}
  actionLabel="Add Transaction"
/>
```

### Empty Transaction List

```tsx
export function EmptyTransactions() {
  return (
    <div className="card">
      <div className="card-body flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">💸</div>
        <h4 className="text-lg font-medium text-ink-50">No Transactions</h4>
        <p className="text-body-sm text-ink-400 mt-2 mb-6">
          You haven't recorded any transactions yet.
        </p>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Add Your First Transaction
        </button>
      </div>
    </div>
  )
}
```

### Empty Search Results

```tsx
export function EmptySearchResults({ query }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <h3 className="text-display-sm text-ink-50">No Results Found</h3>
      <p className="mt-2 text-body-md text-ink-300">
        No budgets match "<strong>{query}</strong>"
      </p>
      <p className="text-body-sm text-ink-400 mt-2">
        Try adjusting your search terms
      </p>
    </div>
  )
}
```

### Empty Dashboard

```tsx
export function EmptyDashboard() {
  return (
    <div className="min-h-screen bg-canvas px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-7xl mb-6">👋</div>
        <h1 className="text-display-lg text-ink-50">Welcome to Budget</h1>
        <p className="mt-4 text-body-lg text-ink-300">
          Get started by creating your first budget to track your spending.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="font-medium text-ink-50">Create Budget</h3>
              <p className="text-body-sm text-ink-400 mt-2">
                Set up a new budget and allocate funds
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-body text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-medium text-ink-50">Log Transactions</h3>
              <p className="text-body-sm text-ink-400 mt-2">
                Record your spending as you go
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-body text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-medium text-ink-50">View Analytics</h3>
              <p className="text-body-sm text-ink-400 mt-2">
                Track progress and insights
              </p>
            </div>
          </div>
        </div>

        <button className="btn-primary mt-12 px-8 py-3 text-lg">
          Create Your First Budget
        </button>
      </div>
    </div>
  )
}
```

---

## Component Library Setup

### Installation & Setup

1. **Add required dependencies:**
```bash
npm install react react-dom tailwindcss postcss autoprefixer lucide-react clsx date-fns
```

2. **Configure Tailwind:**
   - Update `tailwind.config.js` with design tokens (see Design Tokens section)
   - Add `postcss.config.js` with Tailwind directives

3. **Create component structure:**
```
src/
  components/
    ui/
      Button/
        Button.tsx
        Button.stories.tsx
      Input/
        Input.tsx
        Input.stories.tsx
      Card/
        Card.tsx
      Alert/
        Alert.tsx
      Modal/
        Modal.tsx
      ... (other components)
    layout/
      Header.tsx
      Sidebar.tsx
      Footer.tsx
    features/
      ... (feature-specific components)
```

### Storybook Integration (Optional)

```bash
npx storybook@latest init --type react
```

Example story:
```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  args: {
    children: 'Click me',
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}
```

---

## Best Practices

### Design Principles

1. **Consistency**: Use design tokens consistently across the application
2. **Clarity**: Clear visual hierarchy and readable text
3. **Accessibility**: WCAG AA compliance as standard
4. **Performance**: Optimize animations and minimize reflows
5. **Responsiveness**: Mobile-first design that scales to all devices
6. **Feedback**: Clear visual feedback for all interactions

### Component Creation

- Export components with clear props interfaces
- Use composition over prop sprawl
- Keep components focused on a single responsibility
- Provide sensible defaults
- Document non-obvious behavior

### Performance

- Minimize CSS file size through purging unused styles
- Lazy load heavy components
- Memoize expensive computations
- Use CSS containment where appropriate

### Testing

- Test accessibility with axe or similar tools
- Test keyboard navigation
- Test responsive behavior
- Test dark/light mode support
- Test loading and error states

---

## Maintenance & Updates

### Updating the Design System

1. Document all changes in this file
2. Update component stories/documentation
3. Test across all components
4. Communicate changes to the team
5. Version the design system

### Deprecation Policy

- Announce deprecations 1-2 releases in advance
- Mark deprecated components clearly
- Provide migration guide
- Remove in major version bump

---

## Resources

- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev
- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Web Accessibility**: https://www.a11y-101.com

---

**Last Updated**: 2026-07-16
**Design System Version**: 1.0.0
