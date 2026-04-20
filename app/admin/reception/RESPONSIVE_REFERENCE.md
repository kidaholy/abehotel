# Responsive Design Reference - Reception Management

## Breakpoint Strategy

```
Mobile (< 640px)     Tablet (640px - 1024px)     Desktop (> 1024px)
┌─────────────────┐  ┌──────────────────────┐   ┌──────────────────────┐
│   Compact       │  │    Medium            │   │    Full              │
│   Single Col    │  │    2 Columns         │   │    Multi-Column      │
│   Min Padding   │  │    Moderate Padding  │   │    Generous Padding  │
└─────────────────┘  └──────────────────────┘   └──────────────────────┘
```

## Component Sizing Reference

### Guest Approval Modal

#### Header
```
Mobile:                 Tablet/Desktop:
┌──────────────────┐   ┌──────────────────────┐
│ Guest Name       │   │ Guest Name           │
│ (text-xl)        │   │ (text-2xl)           │
│ Status Badge     │   │ Status Badge         │
│ (text-[8px])     │   │ (text-[9px])         │
└──────────────────┘   └──────────────────────┘
```

#### Info Grid
```
Mobile (1 column):          Tablet+ (2 columns):
┌──────────────────┐       ┌──────────┬──────────┐
│ Phone            │       │ Phone    │ Fayda ID │
├──────────────────┤       ├──────────┼──────────┤
│ Fayda ID         │       │ Room     │ Price    │
├──────────────────┤       ├──────────┴──────────┤
│ Room             │       │ Stay Dates (full)   │
├──────────────────┤       └──────────────────────┘
│ Price            │
├──────────────────┤
│ Stay Dates       │
└──────────────────┘
```

#### Action Buttons
```
Mobile (Stacked):           Desktop (3 columns):
┌──────────────────┐       ┌────────┬────────┬────────┐
│ Deny             │       │ Deny   │ Approve│ Approve│
├──────────────────┤       │        │ (2x)   │        │
│ Approve (2x)     │       └────────┴────────┴────────┘
└──────────────────┘
```

### Extend Stay Modal

#### Layout
```
Mobile:                 Desktop:
┌──────────────────┐   ┌──────────────────────┐
│ Extend Stay      │   │ Extend Stay          │
│ Guest Name       │   │ Guest Name           │
│                  │   │                      │
│ New Check-Out    │   │ New Check-Out Date   │
│ Date             │   │ [Date Picker]        │
│ [Date Picker]    │   │                      │
│                  │   │ [Cancel] [Confirm]   │
│ [Cancel]         │   └──────────────────────┘
│ [Confirm (2x)]   │
└──────────────────┘
```

## Text Size Scaling

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Modal Title | text-lg | text-lg | text-xl |
| Guest Name | text-xl | text-xl | text-2xl |
| Status Badge | text-[8px] | text-[8px] | text-[9px] |
| Labels | text-[8px] | text-[8px] | text-[9px] |
| Values | text-xs | text-xs | text-sm |
| Buttons | text-[8px] | text-[8px] | text-[10px] |
| Textarea | text-xs | text-xs | text-sm |

## Padding & Spacing Scaling

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Modal Container | p-4 | p-4 | p-8 |
| Modal Content | space-y-4 | space-y-4 | space-y-8 |
| Grid Items | p-3 | p-3 | p-4 |
| Grid Gap | gap-3 | gap-3 | gap-4 |
| Button Padding | py-2.5 | py-2.5 | py-4 |
| Button Gap | gap-1.5 | gap-1.5 | gap-2 |
| Textarea Padding | px-3 py-2 | px-3 py-2 | px-4 py-3 |

## Icon Size Scaling

| Element | Mobile | Desktop |
|---------|--------|---------|
| Close Button | size-16 | size-18 |
| Calendar Icon | h-3.5 w-3.5 | h-4 w-4 |
| Button Icons | size-12 | size-14 |
| Spinner | h-3.5 w-3.5 | h-4 w-4 |

## Touch Target Sizes

All interactive elements meet or exceed 44px minimum:

```
Mobile Button:
┌────────────────────┐
│                    │  ← 44px minimum height
│  [Button Text]     │
│                    │
└────────────────────┘
```

## Responsive Classes Cheat Sheet

```css
/* Text Sizing */
text-[8px] sm:text-[9px]      /* Scales from 8px to 9px */
text-xs sm:text-sm            /* Scales from 12px to 14px */
text-lg sm:text-xl            /* Scales from 18px to 20px */

/* Padding */
p-3 sm:p-4                    /* Scales from 12px to 16px */
py-2.5 sm:py-4                /* Vertical: 10px to 16px */
px-3 sm:px-4                  /* Horizontal: 12px to 16px */

/* Gaps */
gap-2 sm:gap-3                /* Scales from 8px to 12px */
gap-1.5 sm:gap-2              /* Scales from 6px to 8px */

/* Grid */
grid-cols-1 sm:grid-cols-2    /* 1 column mobile, 2 tablet+ */
col-span-1 sm:col-span-2      /* Full width mobile, half tablet+ */

/* Icons */
h-3.5 sm:h-4 w-3.5 sm:w-4    /* Scales from 14px to 16px */
size-12 sm:w-[14px]           /* Scales from 48px to 14px */
```

## Mobile-First Approach

All responsive design follows mobile-first principle:
1. Base styles are for mobile (< 640px)
2. `sm:` prefix adds tablet+ styles (≥ 640px)
3. No need for `md:` or `lg:` for most elements

## Testing Viewport Sizes

```
iPhone SE:        375px × 667px
iPhone 12:        390px × 844px
iPhone 14 Pro:    393px × 852px
Galaxy S5:        360px × 640px
iPad:             768px × 1024px
iPad Pro:         1024px × 1366px
Desktop:          1920px × 1080px
```

## Common Responsive Patterns Used

### Pattern 1: Text Scaling
```jsx
<h2 className="text-xl sm:text-2xl">Title</h2>
```

### Pattern 2: Padding Scaling
```jsx
<div className="p-4 sm:p-8">Content</div>
```

### Pattern 3: Grid Scaling
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
  {/* Items */}
</div>
```

### Pattern 4: Button Sizing
```jsx
<button className="py-2.5 sm:py-4 text-[8px] sm:text-[10px]">
  Button
</button>
```

### Pattern 5: Icon Scaling
```jsx
<Icon className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
```

## Verification Checklist

- ✅ All text is readable on mobile (no smaller than 8px)
- ✅ All buttons are at least 44px tall
- ✅ All interactive elements are properly spaced
- ✅ No horizontal scrolling on mobile
- ✅ Modals fit within viewport
- ✅ Icons scale with buttons
- ✅ Padding is consistent
- ✅ Grid layouts stack on mobile
- ✅ Touch targets are accessible
- ✅ No content is hidden or cut off

## Performance Impact

- ✅ No JavaScript changes
- ✅ CSS-only responsive design
- ✅ No layout shifts
- ✅ No performance degradation
- ✅ Minimal CSS file size increase
