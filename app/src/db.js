// Database utility using sql.js (SQLite compiled to WebAssembly)
// JDex v2.0 - 4-Level Johnny Decimal Structure
// Level 1: Areas (00-09, 10-19, etc.)
// Level 2: Categories (00, 01, 22, etc.)
// Level 3: Folders (XX.XX - container folders)
// Level 4: Items (XX.XX.XX - actual tracked objects)

let db = null;
let SQL = null;

// Initialize the database
export async function initDatabase() {
  if (db) return db;

  // Load sql.js from CDN
  if (!window.initSqlJs) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sql.js.org/dist/sql-wasm.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  SQL = await window.initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  // Try to load existing database from localStorage
  const savedDb = localStorage.getItem('jdex_database_v2');

  if (savedDb) {
    const uint8Array = new Uint8Array(JSON.parse(savedDb));
    db = new SQL.Database(uint8Array);
  } else {
    db = new SQL.Database();
    createTables();
    seedInitialData();
  }

  return db;
}

// Save database to localStorage
export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const arr = Array.from(data);
  localStorage.setItem('jdex_database_v2', JSON.stringify(arr));
}

// Create database tables - NEW 4-LEVEL STRUCTURE
function createTables() {
  db.run(`
    -- Areas table (Level 1)
    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY,
      range_start INTEGER NOT NULL,
      range_end INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#64748b',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Categories table (Level 2)
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      number INTEGER NOT NULL UNIQUE,
      area_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (area_id) REFERENCES areas(id)
    );
    
    -- Folders table (Level 3) - XX.XX format containers
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_number TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL,
      sequence INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sensitivity TEXT DEFAULT 'standard' CHECK (sensitivity IN ('standard', 'sensitive', 'work')),
      location TEXT,
      storage_path TEXT,
      keywords TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    
    -- Items table (Level 4) - XX.XX.XX format actual objects
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_number TEXT NOT NULL UNIQUE,
      folder_id INTEGER NOT NULL,
      sequence INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      file_type TEXT,
      sensitivity TEXT DEFAULT 'inherit' CHECK (sensitivity IN ('inherit', 'standard', 'sensitive', 'work')),
      location TEXT,
      storage_path TEXT,
      file_size INTEGER,
      keywords TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders(id)
    );
    
    -- Storage locations reference
    CREATE TABLE IF NOT EXISTS storage_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      path TEXT,
      is_encrypted INTEGER DEFAULT 0,
      notes TEXT
    );
    
    -- Activity log
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_number TEXT,
      details TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_folders_category ON folders(category_id);
    CREATE INDEX IF NOT EXISTS idx_folders_number ON folders(folder_number);
    CREATE INDEX IF NOT EXISTS idx_items_folder ON items(folder_id);
    CREATE INDEX IF NOT EXISTS idx_items_number ON items(item_number);
  `);
}

// Seed initial data based on James's system
function seedInitialData() {
  // Insert areas
  const areas = [
    {
      range_start: 0,
      range_end: 9,
      name: 'System',
      description: 'Index, templates, and system management',
      color: '#6b7280',
    },
    {
      range_start: 10,
      range_end: 19,
      name: 'Personal',
      description: 'Personal life administration',
      color: '#0d9488',
    },
    {
      range_start: 20,
      range_end: 29,
      name: 'UF Health',
      description: 'VMware work (Work OneDrive)',
      color: '#2563eb',
    },
    {
      range_start: 30,
      range_end: 39,
      name: 'As The Geek Learns',
      description: 'Training platform and courses (Google Drive)',
      color: '#ea580c',
    },
    {
      range_start: 40,
      range_end: 49,
      name: 'Development',
      description: 'Coding projects and tools',
      color: '#8b5cf6',
    },
    {
      range_start: 50,
      range_end: 59,
      name: 'Resistance',
      description: 'Activism and organizing (ProtonDrive)',
      color: '#dc2626',
    },
    {
      range_start: 60,
      range_end: 69,
      name: 'Learning',
      description: 'Books, courses, and research',
      color: '#16a34a',
    },
    {
      range_start: 90,
      range_end: 99,
      name: 'Archive',
      description: 'Archived and historical items',
      color: '#78716c',
    },
  ];

  areas.forEach((area) => {
    db.run(
      'INSERT INTO areas (range_start, range_end, name, description, color) VALUES (?, ?, ?, ?, ?)',
      [area.range_start, area.range_end, area.name, area.description, area.color]
    );
  });

  // Insert categories
  const categories = [
    // 00-09 System
    { number: 0, area_id: 1, name: 'Index', description: 'JDex database and system docs' },
    { number: 1, area_id: 1, name: 'Inbox', description: 'Triage and items to process' },
    { number: 2, area_id: 1, name: 'Templates', description: 'Document and email templates' },
    { number: 3, area_id: 1, name: 'Archive Index', description: 'Archive catalog and metadata' },

    // 10-19 Personal
    {
      number: 11,
      area_id: 2,
      name: 'Identity and Legal',
      description: 'Passports, IDs, legal documents',
    },
    { number: 12, area_id: 2, name: 'Health', description: 'Medical records, PBC research' },
    { number: 13, area_id: 2, name: 'Finance', description: 'Banking, taxes, receipts' },
    { number: 14, area_id: 2, name: 'Investments', description: 'Portfolio, HDP strategy' },
    {
      number: 15,
      area_id: 2,
      name: 'Home and Property',
      description: 'Mortgage, property, utilities',
    },
    { number: 16, area_id: 2, name: 'Vehicles', description: 'Registration, service records' },
    { number: 17, area_id: 2, name: 'Insurance', description: 'Health, auto, home, life policies' },

    // 20-29 UF Health
    {
      number: 21,
      area_id: 3,
      name: 'Infrastructure Documentation',
      description: 'Architecture, network, storage docs',
    },
    {
      number: 22,
      area_id: 3,
      name: 'PowerCLI Scripts',
      description: 'Production and utility scripts',
    },
    {
      number: 23,
      area_id: 3,
      name: 'Backup Projects',
      description: 'Backup initiatives and December deadlines',
    },
    {
      number: 24,
      area_id: 3,
      name: 'VM Management',
      description: 'Provisioning, lifecycle, performance',
    },
    {
      number: 25,
      area_id: 3,
      name: 'Procedures Runbooks',
      description: 'SOPs and emergency procedures',
    },
    {
      number: 26,
      area_id: 3,
      name: 'Vendor Licensing',
      description: 'VMware licensing and contracts',
    },
    {
      number: 27,
      area_id: 3,
      name: 'Training Materials',
      description: 'Certifications and training',
    },

    // 30-39 As The Geek Learns
    {
      number: 31,
      area_id: 4,
      name: 'Brand Identity',
      description: 'Logo, colors, brand guidelines',
    },
    { number: 32, area_id: 4, name: 'PowerCLI Course', description: 'Course content and modules' },
    { number: 33, area_id: 4, name: 'Website Platform', description: 'Site design and content' },
    { number: 34, area_id: 4, name: 'Marketing', description: 'Social media and campaigns' },
    { number: 35, area_id: 4, name: 'Audience', description: 'Subscribers and analytics' },
    { number: 36, area_id: 4, name: 'Future Courses', description: 'Course ideas and research' },

    // 40-49 Development
    { number: 41, area_id: 5, name: 'KlockThingy', description: 'Time tracking app project' },
    { number: 42, area_id: 5, name: 'Apple Developer', description: 'iOS/macOS learning' },
    { number: 43, area_id: 5, name: 'GitHub Repos', description: 'Repository index and docs' },
    { number: 44, area_id: 5, name: 'Code Experiments', description: 'Learning and experiments' },
    {
      number: 45,
      area_id: 5,
      name: 'Tools Environments',
      description: 'IDE configs, dev setup, MCP',
    },

    // 50-59 Resistance
    {
      number: 51,
      area_id: 6,
      name: 'Resist and Rise',
      description: 'Substack articles and research',
    },
    {
      number: 52,
      area_id: 6,
      name: 'NC Florida Indivisible',
      description: 'Leadership and organizing',
    },
    { number: 53, area_id: 6, name: 'Social Media', description: 'Content and management' },
    { number: 54, area_id: 6, name: 'Actions Protests', description: 'Event planning and safety' },
    { number: 55, area_id: 6, name: 'Mutual Aid', description: 'Programs and resources' },
    { number: 56, area_id: 6, name: 'Canvassing', description: 'Scripts and materials' },
    {
      number: 57,
      area_id: 6,
      name: 'Progressive Campaigns',
      description: 'Active campaigns and voter info',
    },
    {
      number: 58,
      area_id: 6,
      name: 'Contacts Coalition',
      description: 'Partner orgs and contacts',
    },

    // 60-69 Learning
    { number: 61, area_id: 7, name: 'Books', description: 'Reading and book notes' },
    { number: 62, area_id: 7, name: 'Courses', description: 'Active courses and certificates' },
    { number: 63, area_id: 7, name: 'Reference', description: 'Tech docs and cheat sheets' },
    { number: 64, area_id: 7, name: 'Research', description: 'Saved articles and collections' },

    // 90-99 Archive
    {
      number: 91,
      area_id: 8,
      name: 'Archived Projects',
      description: 'Completed and abandoned projects',
    },
    { number: 92, area_id: 8, name: 'Historical', description: 'Old documents and legacy items' },
  ];

  categories.forEach((cat) => {
    db.run('INSERT INTO categories (number, area_id, name, description) VALUES (?, ?, ?, ?)', [
      cat.number,
      cat.area_id,
      cat.name,
      cat.description,
    ]);
  });

  // Insert storage locations - INCLUDING GOOGLE DRIVE
  const locations = [
    {
      name: 'iCloud Drive',
      type: 'cloud',
      path: '~/Library/Mobile Documents/com~apple~CloudDocs/JohnnyDecimal',
      is_encrypted: 0,
      notes: 'Primary personal storage',
    },
    {
      name: 'ProtonDrive',
      type: 'cloud',
      path: '~/ProtonDrive/JohnnyDecimal',
      is_encrypted: 1,
      notes: 'Encrypted storage for sensitive items',
    },
    {
      name: 'Work OneDrive',
      type: 'cloud',
      path: 'OneDrive - UF Health/JohnnyDecimal',
      is_encrypted: 0,
      notes: 'UF Health work files only',
    },
    {
      name: 'Personal OneDrive',
      type: 'cloud',
      path: '~/OneDrive/JohnnyDecimal',
      is_encrypted: 0,
      notes: 'Backup sync location',
    },
    {
      name: 'Google Drive',
      type: 'cloud',
      path: '~/Google Drive/JohnnyDecimal',
      is_encrypted: 0,
      notes: 'ASTGL permanent home + staging/share drive',
    },
    {
      name: 'Dropbox',
      type: 'cloud',
      path: '~/Dropbox/JohnnyDecimal',
      is_encrypted: 0,
      notes: 'Additional backup',
    },
    {
      name: 'Proton Email',
      type: 'email',
      path: null,
      is_encrypted: 1,
      notes: 'Personal email folders',
    },
    {
      name: 'Work Outlook',
      type: 'email',
      path: null,
      is_encrypted: 0,
      notes: 'UF Health email folders',
    },
  ];

  locations.forEach((loc) => {
    db.run(
      'INSERT INTO storage_locations (name, type, path, is_encrypted, notes) VALUES (?, ?, ?, ?, ?)',
      [loc.name, loc.type, loc.path, loc.is_encrypted, loc.notes]
    );
  });

  saveDatabase();
}

// ============================================
// AREA FUNCTIONS
// ============================================

export function getAreas() {
  const results = db.exec('SELECT * FROM areas ORDER BY range_start');
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      range_start: row[1],
      range_end: row[2],
      name: row[3],
      description: row[4],
      color: row[5],
      created_at: row[6],
    })) || []
  );
}

export function createArea(area) {
  db.run(
    'INSERT INTO areas (range_start, range_end, name, description, color) VALUES (?, ?, ?, ?, ?)',
    [area.range_start, area.range_end, area.name, area.description || '', area.color || '#64748b']
  );
  logActivity(
    'create',
    'area',
    `${area.range_start}-${area.range_end}`,
    `Created area: ${area.name}`
  );
  saveDatabase();
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

export function updateArea(id, updates) {
  const validColumns = ['range_start', 'range_end', 'name', 'description', 'color'];
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (validColumns.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return;

  values.push(id);
  db.run(`UPDATE areas SET ${fields.join(', ')} WHERE id = ?`, values);
  logActivity('update', 'area', id.toString(), `Updated area ID: ${id}`);
  saveDatabase();
}

export function deleteArea(id) {
  const cats = db.exec(`SELECT COUNT(*) FROM categories WHERE area_id = ${id}`);
  if (cats[0]?.values[0][0] > 0) {
    throw new Error('Cannot delete area with existing categories. Delete categories first.');
  }
  db.run(`DELETE FROM areas WHERE id = ${id}`);
  logActivity('delete', 'area', id.toString(), `Deleted area ID: ${id}`);
  saveDatabase();
}

// ============================================
// CATEGORY FUNCTIONS
// ============================================

export function getCategories(areaId = null) {
  let query =
    'SELECT c.*, a.name as area_name, a.color as area_color FROM categories c JOIN areas a ON c.area_id = a.id';
  if (areaId) query += ` WHERE c.area_id = ${areaId}`;
  query += ' ORDER BY c.number';

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      number: row[1],
      area_id: row[2],
      name: row[3],
      description: row[4],
      created_at: row[5],
      area_name: row[6],
      area_color: row[7],
    })) || []
  );
}

export function createCategory(category) {
  db.run('INSERT INTO categories (number, area_id, name, description) VALUES (?, ?, ?, ?)', [
    category.number,
    category.area_id,
    category.name,
    category.description || '',
  ]);
  logActivity(
    'create',
    'category',
    category.number.toString(),
    `Created category: ${category.name}`
  );
  saveDatabase();
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

export function updateCategory(id, updates) {
  const validColumns = ['number', 'area_id', 'name', 'description'];
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (validColumns.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return;

  values.push(id);
  db.run(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
  logActivity('update', 'category', id.toString(), `Updated category ID: ${id}`);
  saveDatabase();
}

export function deleteCategory(id) {
  const folders = db.exec(`SELECT COUNT(*) FROM folders WHERE category_id = ${id}`);
  if (folders[0]?.values[0][0] > 0) {
    throw new Error('Cannot delete category with existing folders. Delete or move folders first.');
  }
  db.run(`DELETE FROM categories WHERE id = ${id}`);
  logActivity('delete', 'category', id.toString(), `Deleted category ID: ${id}`);
  saveDatabase();
}

// ============================================
// FOLDER FUNCTIONS (Level 3 - XX.XX containers)
// ============================================

export function getFolders(categoryId = null) {
  let query = `
    SELECT f.*, c.number as category_number, c.name as category_name, 
           a.name as area_name, a.color as area_color
    FROM folders f 
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE 1=1
  `;

  if (categoryId) query += ` AND f.category_id = ${categoryId}`;
  query += ' ORDER BY f.folder_number';

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      folder_number: row[1],
      category_id: row[2],
      sequence: row[3],
      name: row[4],
      description: row[5],
      sensitivity: row[6],
      location: row[7],
      storage_path: row[8],
      keywords: row[9],
      notes: row[10],
      created_at: row[11],
      updated_at: row[12],
      category_number: row[13],
      category_name: row[14],
      area_name: row[15],
      area_color: row[16],
    })) || []
  );
}

export function getFolder(folderId) {
  const query = `
    SELECT f.*, c.number as category_number, c.name as category_name, 
           a.name as area_name, a.color as area_color
    FROM folders f 
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE f.id = ${folderId}
  `;

  const results = db.exec(query);
  if (!results[0]?.values[0]) return null;

  const row = results[0].values[0];
  return {
    id: row[0],
    folder_number: row[1],
    category_id: row[2],
    sequence: row[3],
    name: row[4],
    description: row[5],
    sensitivity: row[6],
    location: row[7],
    storage_path: row[8],
    keywords: row[9],
    notes: row[10],
    created_at: row[11],
    updated_at: row[12],
    category_number: row[13],
    category_name: row[14],
    area_name: row[15],
    area_color: row[16],
  };
}

export function getNextFolderNumber(categoryId) {
  const category = db.exec(`SELECT number FROM categories WHERE id = ${categoryId}`);
  if (!category[0]) return null;

  const catNumber = category[0].values[0][0];
  const catStr = String(catNumber).padStart(2, '0');

  const existing = db.exec(`
    SELECT sequence FROM folders 
    WHERE category_id = ${categoryId} 
    ORDER BY sequence DESC LIMIT 1
  `);

  const nextSeq = existing[0]?.values[0]?.[0] ? existing[0].values[0][0] + 1 : 1;
  const seqStr = String(nextSeq).padStart(2, '0');

  return { folder_number: `${catStr}.${seqStr}`, sequence: nextSeq };
}

export function createFolder(folder) {
  const stmt = db.prepare(`
    INSERT INTO folders (folder_number, category_id, sequence, name, description, sensitivity, location, storage_path, keywords, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    folder.folder_number,
    folder.category_id,
    folder.sequence,
    folder.name,
    folder.description || '',
    folder.sensitivity || 'standard',
    folder.location || '',
    folder.storage_path || '',
    folder.keywords || '',
    folder.notes || '',
  ]);

  stmt.free();

  logActivity('create', 'folder', folder.folder_number, `Created folder: ${folder.name}`);
  saveDatabase();

  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

export function updateFolder(id, updates) {
  const validColumns = [
    'folder_number',
    'category_id',
    'sequence',
    'name',
    'description',
    'sensitivity',
    'location',
    'storage_path',
    'keywords',
    'notes',
  ];

  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (validColumns.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.run(`UPDATE folders SET ${fields.join(', ')} WHERE id = ?`, values);

  const folder = db.exec(`SELECT folder_number, name FROM folders WHERE id = ${id}`);
  if (folder[0]) {
    logActivity('update', 'folder', folder[0].values[0][0], `Updated: ${folder[0].values[0][1]}`);
  }

  saveDatabase();
}

export function deleteFolder(id) {
  // Check if folder has items
  const items = db.exec(`SELECT COUNT(*) FROM items WHERE folder_id = ${id}`);
  if (items[0]?.values[0][0] > 0) {
    throw new Error('Cannot delete folder with existing items. Delete or move items first.');
  }

  const folder = db.exec(`SELECT folder_number, name FROM folders WHERE id = ${id}`);
  if (folder[0]) {
    logActivity('delete', 'folder', folder[0].values[0][0], `Deleted: ${folder[0].values[0][1]}`);
  }

  db.run(`DELETE FROM folders WHERE id = ${id}`);
  saveDatabase();
}

// ============================================
// ITEM FUNCTIONS (Level 4 - XX.XX.XX objects)
// ============================================

export function getItems(folderId = null) {
  let query = `
    SELECT i.*, f.folder_number, f.name as folder_name, f.sensitivity as folder_sensitivity,
           c.number as category_number, c.name as category_name,
           a.name as area_name, a.color as area_color
    FROM items i 
    JOIN folders f ON i.folder_id = f.id
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE 1=1
  `;

  if (folderId) query += ` AND i.folder_id = ${folderId}`;
  query += ' ORDER BY i.item_number';

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      item_number: row[1],
      folder_id: row[2],
      sequence: row[3],
      name: row[4],
      description: row[5],
      file_type: row[6],
      sensitivity: row[7],
      location: row[8],
      storage_path: row[9],
      file_size: row[10],
      keywords: row[11],
      notes: row[12],
      created_at: row[13],
      updated_at: row[14],
      folder_number: row[15],
      folder_name: row[16],
      folder_sensitivity: row[17],
      category_number: row[18],
      category_name: row[19],
      area_name: row[20],
      area_color: row[21],
      // Computed effective sensitivity
      effective_sensitivity: row[7] === 'inherit' ? row[17] : row[7],
    })) || []
  );
}

export function getNextItemNumber(folderId) {
  const folder = db.exec(`SELECT folder_number FROM folders WHERE id = ${folderId}`);
  if (!folder[0]) return null;

  const folderNumber = folder[0].values[0][0];

  const existing = db.exec(`
    SELECT sequence FROM items 
    WHERE folder_id = ${folderId} 
    ORDER BY sequence DESC LIMIT 1
  `);

  const nextSeq = existing[0]?.values[0]?.[0] ? existing[0].values[0][0] + 1 : 1;
  const seqStr = String(nextSeq).padStart(2, '0');

  return { item_number: `${folderNumber}.${seqStr}`, sequence: nextSeq };
}

export function createItem(item) {
  const stmt = db.prepare(`
    INSERT INTO items (item_number, folder_id, sequence, name, description, file_type, sensitivity, location, storage_path, file_size, keywords, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    item.item_number,
    item.folder_id,
    item.sequence,
    item.name,
    item.description || '',
    item.file_type || '',
    item.sensitivity || 'inherit',
    item.location || '',
    item.storage_path || '',
    item.file_size || null,
    item.keywords || '',
    item.notes || '',
  ]);

  stmt.free();

  logActivity('create', 'item', item.item_number, `Created item: ${item.name}`);
  saveDatabase();

  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

export function updateItem(id, updates) {
  const validColumns = [
    'item_number',
    'folder_id',
    'sequence',
    'name',
    'description',
    'file_type',
    'sensitivity',
    'location',
    'storage_path',
    'file_size',
    'keywords',
    'notes',
  ];

  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (validColumns.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.run(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`, values);

  const item = db.exec(`SELECT item_number, name FROM items WHERE id = ${id}`);
  if (item[0]) {
    logActivity('update', 'item', item[0].values[0][0], `Updated: ${item[0].values[0][1]}`);
  }

  saveDatabase();
}

export function deleteItem(id) {
  const item = db.exec(`SELECT item_number, name FROM items WHERE id = ${id}`);
  if (item[0]) {
    logActivity('delete', 'item', item[0].values[0][0], `Deleted: ${item[0].values[0][1]}`);
  }

  db.run(`DELETE FROM items WHERE id = ${id}`);
  saveDatabase();
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

export function searchFolders(query) {
  const searchQuery = `
    SELECT f.*, c.number as category_number, c.name as category_name, 
           a.name as area_name, a.color as area_color
    FROM folders f 
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE f.folder_number LIKE '%${query}%' 
       OR f.name LIKE '%${query}%' 
       OR f.description LIKE '%${query}%'
       OR f.keywords LIKE '%${query}%'
       OR f.notes LIKE '%${query}%'
       OR c.name LIKE '%${query}%'
       OR a.name LIKE '%${query}%'
    ORDER BY f.folder_number
  `;

  const results = db.exec(searchQuery);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      folder_number: row[1],
      category_id: row[2],
      sequence: row[3],
      name: row[4],
      description: row[5],
      sensitivity: row[6],
      location: row[7],
      storage_path: row[8],
      keywords: row[9],
      notes: row[10],
      created_at: row[11],
      updated_at: row[12],
      category_number: row[13],
      category_name: row[14],
      area_name: row[15],
      area_color: row[16],
    })) || []
  );
}

export function searchItems(query) {
  const searchQuery = `
    SELECT i.*, f.folder_number, f.name as folder_name, f.sensitivity as folder_sensitivity,
           c.number as category_number, c.name as category_name,
           a.name as area_name, a.color as area_color
    FROM items i 
    JOIN folders f ON i.folder_id = f.id
    JOIN categories c ON f.category_id = c.id 
    JOIN areas a ON c.area_id = a.id
    WHERE i.item_number LIKE '%${query}%' 
       OR i.name LIKE '%${query}%' 
       OR i.description LIKE '%${query}%'
       OR i.keywords LIKE '%${query}%'
       OR i.notes LIKE '%${query}%'
       OR f.name LIKE '%${query}%'
       OR c.name LIKE '%${query}%'
       OR a.name LIKE '%${query}%'
    ORDER BY i.item_number
  `;

  const results = db.exec(searchQuery);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      item_number: row[1],
      folder_id: row[2],
      sequence: row[3],
      name: row[4],
      description: row[5],
      file_type: row[6],
      sensitivity: row[7],
      location: row[8],
      storage_path: row[9],
      file_size: row[10],
      keywords: row[11],
      notes: row[12],
      created_at: row[13],
      updated_at: row[14],
      folder_number: row[15],
      folder_name: row[16],
      folder_sensitivity: row[17],
      category_number: row[18],
      category_name: row[19],
      area_name: row[20],
      area_color: row[21],
      effective_sensitivity: row[7] === 'inherit' ? row[17] : row[7],
    })) || []
  );
}

// Combined search across folders and items
export function searchAll(query) {
  return {
    folders: searchFolders(query),
    items: searchItems(query),
  };
}

// ============================================
// STORAGE LOCATIONS
// ============================================

export function getStorageLocations() {
  const results = db.exec('SELECT * FROM storage_locations ORDER BY name');
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      name: row[1],
      type: row[2],
      path: row[3],
      is_encrypted: row[4],
      notes: row[5],
    })) || []
  );
}

export function createStorageLocation(location) {
  db.run(
    'INSERT INTO storage_locations (name, type, path, is_encrypted, notes) VALUES (?, ?, ?, ?, ?)',
    [
      location.name,
      location.type,
      location.path || null,
      location.is_encrypted ? 1 : 0,
      location.notes || '',
    ]
  );
  saveDatabase();
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

export function updateStorageLocation(id, updates) {
  const validColumns = ['name', 'type', 'path', 'is_encrypted', 'notes'];
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (validColumns.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(key === 'is_encrypted' ? (value ? 1 : 0) : value);
    }
  });

  if (fields.length === 0) return;

  values.push(id);
  db.run(`UPDATE storage_locations SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDatabase();
}

export function deleteStorageLocation(id) {
  db.run(`DELETE FROM storage_locations WHERE id = ${id}`);
  saveDatabase();
}

// ============================================
// ACTIVITY LOG & STATS
// ============================================

export function logActivity(action, entityType, entityNumber, details) {
  db.run(
    'INSERT INTO activity_log (action, entity_type, entity_number, details) VALUES (?, ?, ?, ?)',
    [action, entityType, entityNumber, details]
  );
}

export function getRecentActivity(limit = 20) {
  const results = db.exec(`SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ${limit}`);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      action: row[1],
      entity_type: row[2],
      entity_number: row[3],
      details: row[4],
      timestamp: row[5],
    })) || []
  );
}

export function getStats() {
  const totalFolders = db.exec('SELECT COUNT(*) FROM folders')[0]?.values[0][0] || 0;
  const totalItems = db.exec('SELECT COUNT(*) FROM items')[0]?.values[0][0] || 0;
  const totalCategories = db.exec('SELECT COUNT(*) FROM categories')[0]?.values[0][0] || 0;

  // Folder stats by sensitivity
  const sensitiveFolders =
    db.exec("SELECT COUNT(*) FROM folders WHERE sensitivity = 'sensitive'")[0]?.values[0][0] || 0;
  const workFolders =
    db.exec("SELECT COUNT(*) FROM folders WHERE sensitivity = 'work'")[0]?.values[0][0] || 0;

  // Item stats - need to compute effective sensitivity
  const inheritItems =
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'inherit'")[0]?.values[0][0] || 0;
  const sensitiveItems =
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'sensitive'")[0]?.values[0][0] || 0;
  const workItems =
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'work'")[0]?.values[0][0] || 0;

  return {
    totalFolders,
    totalItems,
    totalCategories,
    sensitiveFolders,
    workFolders,
    standardFolders: totalFolders - sensitiveFolders - workFolders,
    inheritItems,
    sensitiveItems,
    workItems,
    standardItems: totalItems - inheritItems - sensitiveItems - workItems,
  };
}

// ============================================
// DATABASE UTILITIES
// ============================================

export function executeSQL(sql) {
  try {
    const results = db.exec(sql);
    saveDatabase();
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function getTables() {
  const results = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  return results[0]?.values.map((row) => row[0]) || [];
}

export function getTableData(tableName) {
  const validTables = [
    'areas',
    'categories',
    'folders',
    'items',
    'storage_locations',
    'activity_log',
  ];
  if (!validTables.includes(tableName)) {
    return { columns: [], rows: [] };
  }

  const results = db.exec(`SELECT * FROM ${tableName}`);
  if (!results[0]) return { columns: [], rows: [] };

  return {
    columns: results[0].columns,
    rows: results[0].values,
  };
}

// ============================================
// EXPORT/IMPORT
// ============================================

export function exportDatabase() {
  const data = db.export();
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `jdex-v2-backup-${new Date().toISOString().split('T')[0]}.sqlite`;
  a.click();

  URL.revokeObjectURL(url);
}

export async function importDatabase(file) {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  db = new SQL.Database(uint8Array);
  saveDatabase();

  return true;
}

export function exportToJSON() {
  const data = {
    exported_at: new Date().toISOString(),
    version: '2.0',
    schema: '4-level (Area > Category > Folder > Item)',
    areas: getAreas(),
    categories: getCategories(),
    folders: getFolders(),
    items: getItems(),
    storage_locations: getStorageLocations(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `jdex-v2-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

// Reset database (for development/testing)
export function resetDatabase() {
  localStorage.removeItem('jdex_database_v2');
  db = new SQL.Database();
  createTables();
  seedInitialData();
  return true;
}
