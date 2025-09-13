import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// FHIR Location schema
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  telecom: jsonb("telecom").notNull(),
  address: jsonb("address").notNull(),
  identifier: jsonb("identifier"),
  description: text("description"),
  position: jsonb("position"),
  updatedAt: timestamp("updated_at").default(sql`NOW()`),
});

// FHIR PractitionerRole schema
export const practitionerRoles = pgTable("practitioner_roles", {
  id: varchar("id").primaryKey(),
  identifier: jsonb("identifier"),
  active: boolean("active").default(true),
  practitioner: jsonb("practitioner").notNull(),
  organization: jsonb("organization"),
  code: jsonb("code").notNull(),
  specialty: jsonb("specialty").notNull(),
  location: jsonb("location").notNull(),
  telecom: jsonb("telecom"),
  // Optum provider directory enrichment fields
  npi: text("npi"), // National Provider Identifier from Optum
  insuranceAccepted: jsonb("insurance_accepted"), // List of accepted insurance plans
  optumData: jsonb("optum_data"), // Additional Optum provider information
  languagesSpoken: jsonb("languages_spoken"), // Languages spoken by provider
  education: jsonb("education"), // Educational background
  boardCertifications: jsonb("board_certifications"), // Board certifications
  hospitalAffiliations: jsonb("hospital_affiliations"), // Hospital affiliations
  updatedAt: timestamp("updated_at").default(sql`NOW()`),
});

// FHIR Schedule schema
export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey(),
  identifier: jsonb("identifier"),
  active: boolean("active").default(true),
  serviceType: jsonb("service_type").notNull(),
  actor: jsonb("actor").notNull(),
  extension: jsonb("extension"),
  updatedAt: timestamp("updated_at").default(sql`NOW()`),
});

// FHIR Slot schema
export const slots = pgTable("slots", {
  id: varchar("id").primaryKey(),
  schedule: jsonb("schedule").notNull(),
  status: text("status").notNull(),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  extension: jsonb("extension"),
  updatedAt: timestamp("updated_at").default(sql`NOW()`),
});

// Insert schemas
export const insertLocationSchema = createInsertSchema(locations).omit({
  updatedAt: true,
});

export const insertPractitionerRoleSchema = createInsertSchema(practitionerRoles).omit({
  updatedAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  updatedAt: true,
});

export const insertSlotSchema = createInsertSchema(slots).omit({
  updatedAt: true,
});

// Types
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type PractitionerRole = typeof practitionerRoles.$inferSelect;
export type InsertPractitionerRole = z.infer<typeof insertPractitionerRoleSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type Slot = typeof slots.$inferSelect;
export type InsertSlot = z.infer<typeof insertSlotSchema>;

// Search and filter types
export const searchFiltersSchema = z.object({
  searchQuery: z.string().optional(),
  specialty: z.string().optional(),
  location: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  availableOnly: z.boolean().default(false),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;
