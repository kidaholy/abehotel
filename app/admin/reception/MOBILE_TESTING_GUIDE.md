# Mobile Testing Guide - Reception Management

## Quick Test Checklist

### Desktop View (1024px+)
- [ ] All buttons display with full text and icons
- [ ] Modals have generous padding and spacing
- [ ] Grid layouts show 2 columns for info items
- [ ] Text sizes are large and readable

### Tablet View (768px - 1024px)
- [ ] Buttons are properly sized and clickable
- [ ] Modals fit within viewport
- [ ] Grid layouts show 2 columns
- [ ] Text remains readable

### Mobile View (320px - 480px)
- [ ] All buttons are at least 44px tall (touch-friendly)
- [ ] Button text is readable (not truncated)
- [ ] Modals don't overflow screen edges
- [ ] Grid layouts stack to single column
- [ ] Icons scale appropriately with buttons
- [ ] Close button (X) is easily clickable
- [ ] No horizontal scrolling needed

## Testing Steps

### 1. Test Guest Approval Modal
1. Open Reception Management page
2. Click "REVIEW" button on any guest card
3. Verify modal opens and displays correctly
4. Check on mobile:
   - Guest name is readable
   - Status badge is visible
   - Info grid items stack vertically
   - Buttons are properly sized
   - Textarea is usable
   - Action buttons are clickable

### 2. Test Extend Stay Modal
1. Find a guest with status "GUESTS"
2. Click "Extend" button
3. Verify modal opens correctly
4. Check on mobile:
   - Title is readable
   - Date picker button is clickable
   - Cancel and Confirm buttons are properly sized
   - No overflow on screen

### 3. Test Button Responsiveness
1. Resize browser window to mobile size (375px width)
2. Verify:
   - All buttons remain clickable
   - Text doesn't overflow
   - Icons scale with buttons
   - Padding is appropriate

### 4. Test on Real Devices
- iPhone (375px width)
- iPhone Plus (414px width)
- iPad (768px width)
- Android phone (360px width)

## Browser DevTools Testing

### Chrome/Edge DevTools
1. Press F12 to open DevTools
2. Click device toggle (Ctrl+Shift+M)
3. Select device from dropdown:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Galaxy S5 (360px)

### Firefox DevTools
1. Press F12 to open DevTools
2. Click responsive design mode (Ctrl+Shift+M)
3. Set custom dimensions:
   - Mobile: 375px × 667px
   - Tablet: 768px × 1024px

## Common Issues to Check

❌ **Buttons overflow container** → Check padding and text size
❌ **Text is truncated** → Verify text-size breakpoints
❌ **Modal goes off-screen** → Check modal padding and max-width
❌ **Icons too small** → Verify icon size breakpoints
❌ **Buttons not clickable** → Check button height (should be ≥44px)
❌ **Horizontal scrolling** → Check container widths and overflow

## Performance Notes

- All responsive changes use Tailwind CSS breakpoints (sm:, md:, lg:)
- No JavaScript changes needed for responsiveness
- Responsive design is mobile-first (mobile styles first, then desktop overrides)
- All changes are CSS-only, no layout shifts

## Verification Checklist

After testing, verify:
- ✅ All buttons are clickable on mobile
- ✅ Text is readable without zooming
- ✅ Modals fit within viewport
- ✅ No horizontal scrolling
- ✅ Icons scale appropriately
- ✅ Spacing is consistent
- ✅ Touch targets are at least 44px
- ✅ No content is hidden or cut off
