// Shared tool/action schemas for Binod agent.
// Scope: everything in the personal + admin area EXCEPT distrokid_* tables (those belong to Heena).

export const ALLOWED_TABLES = [
  // personal
  "personal_notes",
  "personal_notes_v2",
  "personal_folders",
  "personal_todos",
  "personal_tasks",
  "personal_biography",
  "personal_people",
  "personal_templates",
  "personal_csv_files",
  "personal_csv_templates",
  // content / admin
  "pov_posts",
  "pov_comments",
  "contacts",
  "contact_submissions",
  "portfolio_items",
  "referral_links",
  "short_urls",
  "app_info",
  "site_settings",
  "app_settings",
  "chatbot_settings",
] as const;

export function isDistrokidTable(name: string): boolean {
  return typeof name === "string" && name.startsWith("distrokid_");
}
