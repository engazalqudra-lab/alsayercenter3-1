import { users, patients, payments, type User, type InsertUser, type Patient, type InsertPatient, type Payment, type InsertPayment } from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, lt, sum } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;
  getTodaysPatientsSummary(): Promise<{ count: number; totalAmount: number }>;
  
  getPatientPayments(patientId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  deletePayment(paymentId: string): Promise<boolean>;
  getPatientTotalReceived(patientId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(insertPatient).returning();
    return patient;
  }

  async updatePatient(id: string, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [patient] = await db
      .update(patients)
      .set(updates)
      .where(eq(patients.id, id))
      .returning();
    return patient || undefined;
  }

  async deletePatient(id: string): Promise<boolean> {
    const result = await db.delete(patients).where(eq(patients.id, id)).returning();
    return result.length > 0;
  }

  async getTodaysPatientsSummary(): Promise<{ count: number; totalAmount: number }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const todaysPatients = await db
      .select()
      .from(patients)
      .where(
        and(
          gte(patients.createdAt, startOfDay),
          lt(patients.createdAt, endOfDay)
        )
      );
    
    const count = todaysPatients.length;
    const totalAmount = todaysPatients.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    
    return { count, totalAmount };
  }

  async getPatientPayments(patientId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.patientId, patientId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    
    // Update patient's totalReceived
    const totalReceived = await this.getPatientTotalReceived(insertPayment.patientId);
    await db.update(patients).set({ totalReceived }).where(eq(patients.id, insertPayment.patientId));
    
    return payment;
  }

  async deletePayment(paymentId: string): Promise<boolean> {
    // Get payment first to find patientId
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
    if (!payment) return false;
    
    const result = await db.delete(payments).where(eq(payments.id, paymentId)).returning();
    
    if (result.length > 0) {
      // Update patient's totalReceived
      const totalReceived = await this.getPatientTotalReceived(payment.patientId);
      await db.update(patients).set({ totalReceived }).where(eq(patients.id, payment.patientId));
    }
    
    return result.length > 0;
  }

  async getPatientTotalReceived(patientId: string): Promise<number> {
    const result = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.patientId, patientId));
    
    return Number(result[0]?.total) || 0;
  }
}

export const storage = new DatabaseStorage();
