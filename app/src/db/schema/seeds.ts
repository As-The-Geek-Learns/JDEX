/**
 * Database Seeds
 * ===============
 * Initial data for new database installations.
 * Based on James's Johnny Decimal system structure.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Minimal sql.js database interface for seeding.
 */
export interface SeedDatabase {
  run(sql: string, params?: unknown[]): void;
}

/**
 * Area seed data structure.
 */
export interface AreaSeed {
  readonly range_start: number;
  readonly range_end: number;
  readonly name: string;
  readonly description: string;
  readonly color: string;
}

/**
 * Category seed data structure.
 */
export interface CategorySeed {
  readonly number: number;
  readonly area_id: number;
  readonly name: string;
  readonly description: string;
}

/**
 * Storage location seed data structure.
 */
export interface LocationSeed {
  readonly name: string;
  readonly type: 'cloud' | 'email' | 'local';
  readonly path: string | null;
  readonly is_encrypted: 0 | 1;
  readonly notes: string;
}

/**
 * Seed counts for verification.
 */
export interface SeedCounts {
  areas: number;
  categories: number;
  locations: number;
}

// ============================================
// DEFAULT AREAS
// ============================================

/**
 * Default areas for new installations.
 * These represent the top-level Johnny Decimal categories.
 */
export const DEFAULT_AREAS: readonly AreaSeed[] = Object.freeze([
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
]);

// ============================================
// DEFAULT CATEGORIES
// ============================================

/**
 * Default categories for new installations.
 * area_id references the 1-based position in DEFAULT_AREAS.
 */
export const DEFAULT_CATEGORIES: readonly CategorySeed[] = Object.freeze([
  // 00-09 System (area_id: 1)
  { number: 0, area_id: 1, name: 'Index', description: 'JDex database and system docs' },
  { number: 1, area_id: 1, name: 'Inbox', description: 'Triage and items to process' },
  { number: 2, area_id: 1, name: 'Templates', description: 'Document and email templates' },
  { number: 3, area_id: 1, name: 'Archive Index', description: 'Archive catalog and metadata' },

  // 10-19 Personal (area_id: 2)
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
  {
    number: 17,
    area_id: 2,
    name: 'Insurance',
    description: 'Health, auto, home, life policies',
  },

  // 20-29 UF Health (area_id: 3)
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

  // 30-39 As The Geek Learns (area_id: 4)
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

  // 40-49 Development (area_id: 5)
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

  // 50-59 Resistance (area_id: 6)
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
  {
    number: 54,
    area_id: 6,
    name: 'Actions Protests',
    description: 'Event planning and safety',
  },
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

  // 60-69 Learning (area_id: 7)
  { number: 61, area_id: 7, name: 'Books', description: 'Reading and book notes' },
  {
    number: 62,
    area_id: 7,
    name: 'Courses',
    description: 'Active courses and certificates',
  },
  { number: 63, area_id: 7, name: 'Reference', description: 'Tech docs and cheat sheets' },
  { number: 64, area_id: 7, name: 'Research', description: 'Saved articles and collections' },

  // 90-99 Archive (area_id: 8)
  {
    number: 91,
    area_id: 8,
    name: 'Archived Projects',
    description: 'Completed and abandoned projects',
  },
  {
    number: 92,
    area_id: 8,
    name: 'Historical',
    description: 'Old documents and legacy items',
  },
]);

// ============================================
// DEFAULT STORAGE LOCATIONS
// ============================================

/**
 * Default storage locations for new installations.
 */
export const DEFAULT_LOCATIONS: readonly LocationSeed[] = Object.freeze([
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
]);

// ============================================
// SEED FUNCTIONS
// ============================================

/**
 * Seed areas into the database.
 */
export function seedAreas(db: SeedDatabase): void {
  if (!db) {
    throw new Error('Database instance is required');
  }

  for (const area of DEFAULT_AREAS) {
    db.run(
      'INSERT INTO areas (range_start, range_end, name, description, color) VALUES (?, ?, ?, ?, ?)',
      [area.range_start, area.range_end, area.name, area.description, area.color]
    );
  }
}

/**
 * Seed categories into the database.
 * Requires areas to be seeded first.
 */
export function seedCategories(db: SeedDatabase): void {
  if (!db) {
    throw new Error('Database instance is required');
  }

  for (const cat of DEFAULT_CATEGORIES) {
    db.run('INSERT INTO categories (number, area_id, name, description) VALUES (?, ?, ?, ?)', [
      cat.number,
      cat.area_id,
      cat.name,
      cat.description,
    ]);
  }
}

/**
 * Seed storage locations into the database.
 */
export function seedLocations(db: SeedDatabase): void {
  if (!db) {
    throw new Error('Database instance is required');
  }

  for (const loc of DEFAULT_LOCATIONS) {
    db.run(
      'INSERT INTO storage_locations (name, type, path, is_encrypted, notes) VALUES (?, ?, ?, ?, ?)',
      [loc.name, loc.type, loc.path, loc.is_encrypted, loc.notes]
    );
  }
}

/**
 * Seed all initial data into the database.
 * This should be called after tables are created for new databases.
 */
export function seedInitialData(db: SeedDatabase): void {
  if (!db) {
    throw new Error('Database instance is required');
  }

  seedAreas(db);
  seedCategories(db);
  seedLocations(db);
}

/**
 * Get count of seeded items for verification.
 */
export function getSeedCounts(): SeedCounts {
  return {
    areas: DEFAULT_AREAS.length,
    categories: DEFAULT_CATEGORIES.length,
    locations: DEFAULT_LOCATIONS.length,
  };
}
