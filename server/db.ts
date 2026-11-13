import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'indeecheck.sqlite');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'inspector',
      title TEXT NOT NULL DEFAULT 'Zoning Reviewer',
      department TEXT NOT NULL DEFAULT 'Building & Code Enforcement',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permit_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      property_address TEXT NOT NULL,
      parcel_pin TEXT NOT NULL DEFAULT '',
      ward TEXT NOT NULL DEFAULT 'Ward 1',
      applicant_name TEXT NOT NULL,
      applicant_email TEXT NOT NULL DEFAULT '',
      applicant_phone TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'in_review',
      assigned_to TEXT NOT NULL DEFAULT 'Matt Chesmore',
      created_by INTEGER NOT NULL REFERENCES users(id),

      -- Zoning & Bulk measurements
      zoning_district TEXT NOT NULL DEFAULT 'R-1',
      land_use TEXT NOT NULL DEFAULT 'single_family',
      public_water_sewer INTEGER NOT NULL DEFAULT 1,
      is_corner_lot INTEGER NOT NULL DEFAULT 0,
      adjoins_r_district INTEGER NOT NULL DEFAULT 1,
      lot_area_sqft REAL NOT NULL DEFAULT 10500,
      lot_width_ft REAL NOT NULL DEFAULT 82,
      lot_depth_ft REAL NOT NULL DEFAULT 130,
      proposed_height_ft REAL NOT NULL DEFAULT 24,
      proposed_stories INTEGER NOT NULL DEFAULT 2,
      front_setback_ft REAL NOT NULL DEFAULT 28,
      side_setback_ft REAL NOT NULL DEFAULT 10,
      corner_side_setback_ft REAL NOT NULL DEFAULT 25,
      rear_setback_ft REAL NOT NULL DEFAULT 34,
      has_accessory_structure INTEGER NOT NULL DEFAULT 0,
      accessory_height_ft REAL NOT NULL DEFAULT 14,
      accessory_side_rear_setback_ft REAL NOT NULL DEFAULT 5,
      rear_yard_coverage_pct REAL NOT NULL DEFAULT 18,

      -- Floodplain measurements (IMC Ch. 167 & Zoning Art. 4)
      flood_zone TEXT NOT NULL DEFAULT 'X',
      bfe_ft REAL NOT NULL DEFAULT 922.0,
      lowest_floor_elev_ft REAL NOT NULL DEFAULT 925.0,
      machinery_elev_ft REAL NOT NULL DEFAULT 925.5,
      has_basement INTEGER NOT NULL DEFAULT 0,
      has_sub_bfe_enclosure INTEGER NOT NULL DEFAULT 0,
      enclosure_vented_unfinished INTEGER NOT NULL DEFAULT 1,
      substantial_improvement_pct REAL NOT NULL DEFAULT 100,
      floodway_no_rise_cert INTEGER NOT NULL DEFAULT 0,
      is_fema_buyout_lot INTEGER NOT NULL DEFAULT 0,
      has_floodplain_permit INTEGER NOT NULL DEFAULT 0,

      -- Fence measurements (IMC Ch. 152 & Zoning §§ 1.04.44-45)
      includes_fence INTEGER NOT NULL DEFAULT 0,
      fence_yard_location TEXT NOT NULL DEFAULT 'rear_side',
      fence_front_height_ft REAL NOT NULL DEFAULT 3.5,
      fence_side_rear_height_ft REAL NOT NULL DEFAULT 6.0,
      fence_corner_triangle_height_ft REAL NOT NULL DEFAULT 0,
      fence_property_line_setback_ft REAL NOT NULL DEFAULT 3.0,
      has_neighbor_fence_agreement INTEGER NOT NULL DEFAULT 0,
      fence_material TEXT NOT NULL DEFAULT 'wood',
      has_barbed_wire INTEGER NOT NULL DEFAULT 0,
      barbed_wire_height_ft REAL NOT NULL DEFAULT 0,
      has_fence_permit_app INTEGER NOT NULL DEFAULT 0,
      iowa_one_call_811 TEXT NOT NULL DEFAULT '',

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'zoning',
      code_citation TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      ordinance_requirement TEXT NOT NULL DEFAULT '',
      proposed_value TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'standard',
      inspector_notes TEXT NOT NULL DEFAULT '',
      verified_by TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspection_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL DEFAULT 'Zoning Administrator',
      note_type TEXT NOT NULL DEFAULT 'inspection',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ordinance_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      code_section TEXT NOT NULL,
      title TEXT NOT NULL,
      applies_to TEXT NOT NULL DEFAULT 'All Districts',
      requirement_summary TEXT NOT NULL,
      threshold_metric TEXT NOT NULL DEFAULT '',
      ordinance_text TEXT NOT NULL,
      remedy_guidance TEXT NOT NULL DEFAULT '',
      is_custom INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      plan_type TEXT NOT NULL DEFAULT 'construction_site_plan',
      title TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      revision_label TEXT NOT NULL DEFAULT 'Rev 1',
      notes TEXT NOT NULL DEFAULT '',
      uploaded_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function rowToProject(row: Record<string, unknown>): Record<string, unknown> {
  const boolFields = [
    'public_water_sewer',
    'is_corner_lot',
    'adjoins_r_district',
    'has_accessory_structure',
    'has_basement',
    'has_sub_bfe_enclosure',
    'enclosure_vented_unfinished',
    'floodway_no_rise_cert',
    'is_fema_buyout_lot',
    'has_floodplain_permit',
    'includes_fence',
    'has_neighbor_fence_agreement',
    'has_barbed_wire',
    'has_fence_permit_app',
  ];
  const out: Record<string, unknown> = { ...row };
  for (const f of boolFields) {
    if (f in out) {
      out[f] = Boolean(out[f]);
    }
  }
  return out;
}
