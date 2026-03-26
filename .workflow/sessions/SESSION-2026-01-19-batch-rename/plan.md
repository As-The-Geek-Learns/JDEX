# Plan: Batch Rename

**Session ID:** SESSION-2026-01-19-batch-rename  
**Created:** 2026-01-19  
**Status:** Approved

---

## 1. Problem Statement

### What are we solving?
Users who organize files into JD folders often need to rename multiple files at once to follow consistent naming conventions. Currently, files must be renamed one at a time through the OS file manager. This is tedious for batches of files like photos, documents, or downloads.

### Why does it matter?
- **Consistency:** Apply naming conventions across many files at once
- **Efficiency:** Rename 100 files in seconds instead of minutes
- **JD Integration:** Prepend JD numbers or standardize file names
- **Premium Value:** Power feature that justifies premium pricing

### Success Criteria
- [ ] Users can select multiple files from a folder
- [ ] Preview all renames before applying
- [ ] Support renaming patterns: prefix, suffix, replace, numbering
- [ ] Undo capability for batch operations
- [ ] Premium feature gate (free tier limited to 5 files/batch)
- [ ] Works with files in JD folders or any selected files

---

## 2. Security Considerations

### Data Handling
- [ ] No sensitive data exposed in logs or errors
- [ ] User inputs validated: file paths, rename patterns
- [ ] Data sanitization applied: strip dangerous characters from filenames

### Attack Surface
- [ ] No new external dependencies
- [ ] No file system access without path validation
- [ ] Filename patterns sanitized to prevent injection

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Path traversal in patterns | Low | High | Sanitize all user inputs, block path separators |
| Overwriting system files | Low | High | Use existing validation.js, block system dirs |
| Accidental data loss | Medium | High | Preview + confirmation, undo support |
| Filename collision | Medium | Low | Detect and auto-increment or warn |

---

## 3. Approach Selection

### Option A: Pattern-Based Renaming
**Description:** User enters patterns like "{name}_{n}" and sees preview
**Pros:**
- Flexible and powerful
- Common in professional tools
- Supports complex transformations
**Cons:**
- Learning curve for patterns
- More UI complexity
**Effort:** Medium

### Option B: Form-Based Renaming
**Description:** UI with checkboxes/inputs for each operation type
**Pros:**
- More intuitive for beginners
- No pattern syntax to learn
- Clear what each option does
**Cons:**
- Less flexible
- More UI components
**Effort:** Medium

### Option C: Hybrid (Form + Preview)
**Description:** Form-based UI that generates patterns, with live preview
**Pros:**
- Best of both worlds
- Users can see exact results before applying
- Extensible
**Cons:**
- Most code to write
**Effort:** Medium-High

### Selected Approach
**Choice:** Option C (Hybrid Form + Preview)  
**Rationale:** Users get intuitive form controls while seeing exactly what will happen. The preview table makes it safe and builds confidence. Can start with basic operations and add more later.

---

## 4. Task Breakdown

| # | Task | Files Affected | Dependencies | Status |
|---|------|----------------|--------------|--------|
| 1 | Create BatchRename modal component | `app/src/components/BatchRename/BatchRenameModal.jsx` | - | [x] |
| 2 | Create rename pattern service | `app/src/services/batchRenameService.js` | - | [x] |
| 3 | Create file selector component | `app/src/components/BatchRename/FileSelector.jsx` | - | [x] |
| 4 | Create preview table component | `app/src/components/BatchRename/RenamePreview.jsx` | - | [x] |
| 5 | Implement rename operations (prefix, suffix, replace, number) | Service | 2 | [x] |
| 6 | Add actual file rename logic | `app/src/services/batchRenameService.js` | 2 | [x] |
| 7 | Add undo tracking for renames | Service | 6 | [x] |
| 8 | Add premium gate | Modal | 1 | [x] |
| 9 | Add button to trigger BatchRename from UI | `app/src/App.jsx` | 1 | [x] |
| 10 | Add CSS for BatchRename components | `app/src/index.css` | 1 | [x] |
| 11 | Test and verify | - | All | [x] |

---

## 5. Component Design

### BatchRename Modal Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Batch Rename                                           [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Select Files:                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [📁 Choose Folder]  or drag files here              │   │
│  │                                                      │   │
│  │ ✓ IMG_001.jpg                                       │   │
│  │ ✓ IMG_002.jpg                                       │   │
│  │ ✓ IMG_003.jpg          Selected: 3 files           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Rename Options:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Add Prefix: [12.01_____________]                  │   │
│  │ ☐ Add Suffix: [__________________]                  │   │
│  │ ☐ Replace:    [______] → [______]                   │   │
│  │ ☑ Add Numbers: Start: [1] Digits: [3]               │   │
│  │ ☐ Change Case: [lowercase ▾]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Preview:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Original          →  New Name                       │   │
│  │ IMG_001.jpg       →  12.01_001_IMG_001.jpg         │   │
│  │ IMG_002.jpg       →  12.01_002_IMG_002.jpg         │   │
│  │ IMG_003.jpg       →  12.01_003_IMG_003.jpg         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancel]                              [Rename 3 Files]    │
└─────────────────────────────────────────────────────────────┘
```

### Rename Operations

1. **Add Prefix**
   - Input: prefix string
   - Result: `{prefix}{original_name}`

2. **Add Suffix**
   - Input: suffix string (inserted before extension)
   - Result: `{name}{suffix}.{ext}`

3. **Find & Replace**
   - Input: find string, replace string
   - Result: `{name.replace(find, replace)}.{ext}`

4. **Sequential Numbers**
   - Input: start number, digit padding
   - Result: `{name}_{padded_number}.{ext}`

5. **Change Case**
   - Options: lowercase, UPPERCASE, Title Case
   - Result: transformed name

---

## 6. Service Functions

```javascript
// batchRenameService.js

/**
 * Generate new filename based on options
 */
function generateNewName(originalName, options, index) {
  let name = getBaseName(originalName);
  let ext = getExtension(originalName);
  
  // Apply transformations in order
  if (options.prefix) {
    name = options.prefix + name;
  }
  
  if (options.suffix) {
    name = name + options.suffix;
  }
  
  if (options.findReplace) {
    name = name.replaceAll(options.find, options.replace);
  }
  
  if (options.addNumber) {
    const num = (options.startNumber + index).toString().padStart(options.digits, '0');
    name = name + '_' + num;
  }
  
  if (options.changeCase) {
    name = transformCase(name, options.caseType);
  }
  
  return sanitizeFilename(name + '.' + ext);
}

/**
 * Execute batch rename with undo tracking
 */
async function executeBatchRename(files, options, onProgress) {
  const undoLog = [];
  
  for (const file of files) {
    const newName = generateNewName(file.name, options, index);
    const newPath = path.join(path.dirname(file.path), newName);
    
    fs.renameSync(file.path, newPath);
    
    undoLog.push({
      original: file.path,
      renamed: newPath,
    });
    
    onProgress(index + 1, files.length);
  }
  
  // Save undo log for this operation
  saveUndoLog(undoLog);
  
  return { success: true, count: files.length };
}
```

---

## 7. Verification Plan

### Automated Tests
- [ ] Unit tests for: generateNewName function
- [ ] Unit tests for: filename sanitization

### Visual Verification
- [ ] Preview updates correctly when options change
- [ ] Files renamed correctly in file system
- [ ] Error states display properly
- [ ] Premium gate shows for free users

### Manual Review
- [ ] Test with various file types and names
- [ ] Test with special characters in filenames
- [ ] Test undo functionality
- [ ] Test collision handling

---

## 8. Approval

### Planning Phase Approval
- [x] **Human checkpoint:** Plan reviewed and approved
- Approved by: James Cruce
- Date: 2026-01-19 

---

## Notes

### Premium Tier Limits
- Free tier: 5 files per batch operation
- Premium tier: Unlimited files

### File Name Sanitization
Characters to strip/replace:
- Path separators: / \
- Null bytes
- Control characters
- Reserved names (Windows): CON, PRN, AUX, NUL, COM1-9, LPT1-9

### Future Enhancements (Out of Scope)
- Regex-based patterns
- Date/time insertion from EXIF
- Undo history view
- Rename presets/templates
