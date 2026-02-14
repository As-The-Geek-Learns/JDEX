# Plan: Drag & Drop File Organization

**Session ID:** SESSION-2026-01-19-drag-and-drop  
**Created:** 2026-01-19  
**Status:** Approved

---

## 1. Problem Statement

### What are we solving?
Users currently organize files by scanning directories and accepting suggestions. There's no way to quickly drag files from the desktop or Finder directly into a JD folder within the app. This creates friction for users who want to organize files one at a time or as they encounter them.

### Why does it matter?
- **Faster Workflow:** Drag & drop is the most intuitive way to move files on a desktop
- **Reduced Friction:** No need to scan → review → accept for single files
- **Visual Feedback:** Users see exactly where files will land
- **Premium Value:** Adds polish and convenience that justifies the premium price

### Success Criteria
- [ ] Users can drag files from desktop/Finder onto the JDex app
- [ ] Drop zones appear when dragging files over JD folders
- [ ] Files are moved to the correct JD folder structure on drop
- [ ] Visual feedback shows valid/invalid drop targets
- [ ] Organized files are logged to organized_files table
- [ ] Premium feature gate (free tier limited to X files)
- [ ] Works in Electron (native file drops)

---

## 2. Security Considerations

### Data Handling
- [ ] No sensitive data exposed in logs or errors
- [ ] User inputs will be validated at: File paths from drag events
- [ ] Data sanitization applied before: File operations, database storage

### Attack Surface
- [ ] No new external dependencies with known vulnerabilities
- [ ] No new API endpoints without authentication (local app)
- [ ] No file system access without path validation (CRITICAL - validate all dropped file paths)

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Path traversal via crafted file drop | Low | High | Validate all paths, use existing validation.js |
| Dropping system files | Medium | Medium | Block system directories, show warning |
| Overwriting existing files | Medium | Medium | Check for conflicts, prompt user |
| Large file performance | Low | Low | Show progress for large files |

---

## 3. Approach Selection

### Option A: Native HTML5 Drag & Drop
**Description:** Use standard HTML5 drag/drop API with Electron's file drop handling
**Pros:**
- Native browser support
- Well-documented
- Works with Electron's ondrop file array
- No dependencies
**Cons:**
- Need to handle Electron-specific file path extraction
- Manual styling for drop zones
**Effort:** Medium

### Option B: react-dnd Library
**Description:** Use react-dnd for declarative drag/drop components
**Pros:**
- Declarative React API
- Built-in touch support
- Complex drag scenarios supported
**Cons:**
- Additional dependency (~50KB)
- Learning curve
- May conflict with native file drops
**Effort:** Medium-High

### Option C: react-dropzone Library
**Description:** Use react-dropzone specifically for file drops
**Pros:**
- Purpose-built for file uploads/drops
- Handles edge cases well
- Small footprint (~10KB)
**Cons:**
- Another dependency
- May need customization for Electron
**Effort:** Low-Medium

### Selected Approach
**Choice:** Option A (Native HTML5 Drag & Drop)  
**Rationale:** No new dependencies needed. Electron provides direct file path access via `event.dataTransfer.files`. Keeps bundle size small and avoids potential conflicts with native Electron behavior.

---

## 4. Task Breakdown

| # | Task | Files Affected | Dependencies | Status |
|---|------|----------------|--------------|--------|
| 1 | Create DropZone component | `app/src/components/DragDrop/DropZone.jsx` | - | [x] |
| 2 | Create drag & drop context/state | `app/src/context/DragDropContext.jsx` | - | [x] |
| 3 | Create file drop handler service | `app/src/services/dragDropService.js` | - | [x] |
| 4 | Add drop zones to folder cards | `app/src/App.jsx` | 1, 2 | [x] |
| 5 | Add drop zone to category view | `app/src/App.jsx` | 1, 2 | [x] |
| 6 | Implement file move on drop | `app/src/services/dragDropService.js` | 3 | [x] |
| 7 | Add visual feedback (hover states) | `app/src/index.css` | 1 | [x] |
| 8 | Add premium gate for drag/drop | `app/src/components/DragDrop/DropZone.jsx` | 1 | [x] |
| 9 | Log organized files to database | `app/src/services/dragDropService.js` | 6 | [x] |
| 10 | Handle conflicts (duplicate names) | `app/src/services/dragDropService.js` | 6 | [x] |
| 11 | Add success/error notifications | Various | 6 | [x] |
| 12 | Test with various file types | - | All | [x] |

---

## 5. Component Design

### DropZone Behavior
```
Normal State:
┌─────────────────────────────────┐
│  12.01 Reference Documents      │  <- Regular folder card
│  Documents • System             │
└─────────────────────────────────┘

Dragging Over (Valid):
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │   📥 Drop to organize     │  │  <- Highlighted border
│  │   → 12.01 Reference Docs  │  │     Pulsing animation
│  └───────────────────────────┘  │
└─────────────────────────────────┘

Dragging Over (Invalid - e.g., system file):
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │   ⚠️ Cannot organize      │  │  <- Red border
│  │   System files blocked    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### File Drop Flow
```
1. User drags file from Finder/Desktop
2. DragDropContext detects drag enter on app
3. All folder DropZones become active (show drop hints)
4. User hovers over specific folder
5. DropZone highlights, shows destination path
6. User drops file
7. dragDropService:
   a. Validates file path (security)
   b. Checks premium limits
   c. Checks for conflicts
   d. Moves file to JD folder structure
   e. Logs to organized_files table
8. Success notification shown
9. Folder card updates with new file count
```

### Electron File Path Access
```javascript
// In Electron, dropped files have direct path access
function handleDrop(event) {
  event.preventDefault();
  const files = event.dataTransfer.files;
  
  for (const file of files) {
    // Electron provides the full path via .path property
    const filePath = file.path;
    console.log('Dropped file:', filePath);
  }
}
```

---

## 6. Verification Plan

### Automated Tests
- [ ] Unit tests for: dragDropService.js path validation
- [ ] Unit tests for: conflict detection

### Visual Verification
- [ ] Drop zones appear when dragging files
- [ ] Visual feedback is clear (colors, animations)
- [ ] Success/error notifications display correctly
- [ ] Premium gate shows for free users

### Manual Review
- [ ] Code review checklist completed
- [ ] Security review checklist completed
- [ ] Test dropping from Finder, Desktop
- [ ] Test dropping multiple files
- [ ] Test dropping folders (should warn or handle)
- [ ] Test dropping system files (should block)

---

## 7. Approval

### Planning Phase Approval
- [x] **Human checkpoint:** Plan reviewed and approved
- Approved by: James Cruce
- Date: 2026-01-19 

---

## Notes

### Electron-Specific Considerations
- Electron allows access to full file paths via `file.path`
- Need to handle both internal drags (within app) and external drags (from OS)
- May need to handle `ondragover` for proper drop behavior

### Integration with Existing Code
- Reuse existing `fileOperations.js` for file moves
- Reuse existing `validation.js` for path validation
- Log to `organized_files` table for statistics tracking

### Premium Tier Limits
- Free tier: 5 drag & drop operations per month
- Premium tier: Unlimited

### Future Enhancements (Out of Scope)
- Drag files OUT of JDex to Finder
- Drag between folders within JDex
- Drag to create new items in database
