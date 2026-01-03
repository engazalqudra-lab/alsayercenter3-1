import { z } from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Patients table for Drizzle ORM
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientName: text("patient_name").notNull(),
  age: integer("age").notNull(),
  residence: text("residence").notNull(),
  phone: text("phone").notNull(),
  doctorName: text("doctor_name").notNull(),
  diagnosis: text("diagnosis").default(""),
  doctorRequest: text("doctor_request").default(""),
  hasSurgery: boolean("has_surgery").default(false),
  surgeryType: text("surgery_type"),
  needsMedicalCare: boolean("needs_medical_care").default(false),
  careType: text("care_type"),
  sessionType: text("session_type"),
  sessionCount: integer("session_count").default(0),
  sessionPrice: integer("session_price").default(0),
  needsMedicalAids: boolean("needs_medical_aids").default(false),
  aidType: text("aid_type"),
  aidPrice: integer("aid_price").default(0),
  hasDiet: boolean("has_diet").default(false),
  dietPlan: text("diet_plan"),
  hasOtherServices: boolean("has_other_services").default(false),
  otherServiceType: text("other_service_type"),
  otherServicePrice: integer("other_service_price").default(0),
  attachments: text("attachments").array().default([]),
  overallAssessment: text("overall_assessment").default(""),
  totalAmount: integer("total_amount").default(0),
  totalReceived: integer("total_received").default(0),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create insert schema with coercion for numeric fields (frontend sends strings from inputs)
const baseInsertSchema = createInsertSchema(patients).omit({ 
  id: true, 
  createdAt: true 
});

export const insertPatientSchema = baseInsertSchema.extend({
  age: z.coerce.number().min(0).max(150),
  sessionCount: z.coerce.number().min(0).optional().nullable(),
  sessionPrice: z.coerce.number().min(0).optional().nullable(),
  aidPrice: z.coerce.number().min(0).optional().nullable(),
  otherServicePrice: z.coerce.number().min(0).optional().nullable(),
  totalAmount: z.coerce.number().min(0).optional().nullable(),
  totalReceived: z.coerce.number().min(0).optional().nullable(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

// Payments table for tracking patient payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  note: text("note").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ 
  id: true, 
  createdAt: true 
}).extend({
  amount: z.coerce.number().min(1),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
