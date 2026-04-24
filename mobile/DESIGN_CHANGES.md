# Fund Request Form - Design Changes Summary

## ✅ Changes Made

### 1. ItemCard Component (`src/components/ItemCard.tsx`)
**Layout:** Vertical with minimal fields
- **Item number (#1):** Top-left corner, auto-increment
- **Delete icon (✕):** Top-right corner, small size
- **Deskripsi input:** Top field (full width), pt-5 padding
- **Nominal input:** Bottom field with "Rp" prefix

### 2. FormSection Component (`src/components/FormSection.tsx`)
- Simplified: Removed subtitle prop
- Compact spacing: mb-4, font-bold title

### 3. Form Modal (`app/(app)/index.tsx`)
**Structure (4 sections):**
- Section 1: Pemohon (user info, read-only blue box)
- Section 2: Tanggal (date input, same size as other inputs)
- Section 3: Item (ItemCard array + add button)
- Section 4: Summary (total + terbilang preview)

**Buttons:**
- Request button: variant="primary", size="md" (px-6 py-3)
- Batal button: variant="outline", size="md" (px-6 py-3)
- Layout: Stacked vertical
- Text: Centered (via Button component justify-center)

## 🔄 How to See Changes

### Step 1: Clear Cache
Run this command in mobile folder:

```bash
cd /home/masadik/Documents/fundrequest/mobile

# Option A: Run provided script
bash clear-cache.sh

# Option B: Manual commands
rm -rf .expo node_modules/.cache .next dist build
npm cache clean --force
```

### Step 2: Restart Expo
```bash
npx expo start --clear
```

### Step 3: Reload App
- **Web:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- **Android/iOS:** Press 'r' in terminal
- **Expo Go:** Shake phone → Reload

## 📱 What You Should See

### ItemCard:
```
#1                    ✕
┌─────────────────────┐
│ Deskripsi item      │
├─────────────────────┤
│ Nominal: Rp 100.000 │
└─────────────────────┘
```

### Buttons:
```
┌──────────────────┐
│    Request       │ ← primary, size md, centered
├──────────────────┤
│     Batal        │ ← outline, size md, centered
└──────────────────┘
```

## 🛠️ Files Modified

1. `src/components/ItemCard.tsx` - Card layout & positioning
2. `src/components/FormSection.tsx` - Simplified header
3. `app/(app)/index.tsx` - Button sizing & layout
4. `src/types/index.ts` - Added FRItem export

## ✅ Verification

All TypeScript files compile without errors:
- ✅ No type errors
- ✅ All imports correct
- ✅ Button variants valid
- ✅ Styling classes valid (NativeWind)

## 🐛 Troubleshooting

If changes still not visible after cache clear:

1. **Check terminal output** for errors when running `npx expo start --clear`
2. **Verify no red errors** in Expo console
3. **Kill all Expo processes:** `pkill -f expo`
4. **Full reset:** Delete node_modules and reinstall
   ```bash
   rm -rf node_modules
   npm install
   npx expo start --clear
   ```
5. **Browser cache:** For web, try incognito/private mode

## 📝 Notes

- Qty field is hidden, defaults to 1 automatically
- Delete button only shows when deletable (multiple items exist)
- Print PDF moved to history menu (not auto-print on submit)
- All form validation & PDF generation still work
