import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { insertPatientSchema, insertPaymentSchema, payments } from "@shared/schema";
// Google Sheets integration - supports multiple methods:
// 1. Webhook method (GOOGLE_SHEETS_WEBHOOK_URL) - for regions without Google Cloud Console
// 2. Service Account (GOOGLE_SERVICE_ACCOUNT_KEY + GOOGLE_SPREADSHEET_ID) - for external deployments
// 3. Replit OAuth connector - for Replit deployments (default)

const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
const SHEETS_SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// Determine which method to use
type SheetsMethod = 'webhook' | 'service_account' | 'replit_oauth' | 'disabled';
function getSheetsMethod(): SheetsMethod {
  if (SHEETS_WEBHOOK_URL) return 'webhook';
  if (SHEETS_SERVICE_ACCOUNT) return 'service_account';
  if (process.env.REPLIT_CONNECTORS_HOSTNAME) return 'replit_oauth';
  return 'disabled';
}

const sheetsMethod = getSheetsMethod();
console.log(`Google Sheets integration method: ${sheetsMethod}`);

// Dynamic imports based on method
import * as googleSheets from './google-sheets';
import * as webhookSheets from './google-sheets-webhook';

// Create unified sync functions based on method
async function syncPatient(patient: any): Promise<void> {
  try {
    if (sheetsMethod === 'webhook') {
      return webhookSheets.syncPatientToSheetWebhook(patient, 'create');
    } else if (sheetsMethod === 'service_account' || sheetsMethod === 'replit_oauth') {
      return googleSheets.syncPatientToSheet(patient);
    }
  } catch (err) {
    console.error('Google Sheets sync error:', err);
  }
}

async function updatePatientSheet(patient: any): Promise<void> {
  try {
    if (sheetsMethod === 'webhook') {
      return webhookSheets.syncPatientToSheetWebhook(patient, 'update');
    } else if (sheetsMethod === 'service_account' || sheetsMethod === 'replit_oauth') {
      return googleSheets.syncPatientToSheet(patient);
    }
  } catch (err) {
    console.error('Google Sheets update error:', err);
  }
}

async function deletePatientFromSheets(patientId: string): Promise<void> {
  try {
    if (sheetsMethod === 'webhook') {
      return webhookSheets.deletePatientFromSheetWebhook(patientId);
    } else if (sheetsMethod === 'service_account' || sheetsMethod === 'replit_oauth') {
      return googleSheets.deletePatientFromSheet(patientId);
    }
  } catch (err) {
    console.error('Google Sheets delete error:', err);
  }
}

async function syncAll(patients: any[]): Promise<void> {
  try {
    if (sheetsMethod === 'webhook') {
      return webhookSheets.syncAllPatientsToSheetWebhook(patients);
    } else if (sheetsMethod === 'service_account' || sheetsMethod === 'replit_oauth') {
      return googleSheets.syncAllPatientsToSheet(patients);
    }
  } catch (err) {
    console.error('Google Sheets sync all error:', err);
  }
}
import { sendTelegramNotification, startDailySummaryScheduler, sendDailySummary } from "./telegram";
import { createGitHubRepo, getGitHubUser } from "./github";
import path from "path";
import fs from "fs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve offline app
  app.get("/offline", (req, res) => {
    const offlinePath = path.join(process.cwd(), "offline-app", "index.html");
    if (fs.existsSync(offlinePath)) {
      res.sendFile(offlinePath);
    } else {
      res.status(404).send("Offline app not found");
    }
  });
  
  // Health check endpoint for external deployments
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get all patients
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  // Get single patient
  app.get("/api/patients/:id", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patient" });
    }
  });

  // Create patient
  app.post("/api/patients", async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      
      // Sync to Google Sheets and send Telegram notification (non-blocking)
      syncPatient(patient).catch(err => console.error('Google Sheets sync error:', err));
      sendTelegramNotification(patient, 'created').catch(err => console.error('Telegram error:', err));
      
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create patient" });
      }
    }
  });

  // Update patient
  app.patch("/api/patients/:id", async (req, res) => {
    try {
      const patient = await storage.updatePatient(req.params.id, req.body);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      
      // Sync to Google Sheets and send Telegram notification (non-blocking)
      updatePatientSheet(patient).catch((err: Error) => console.error('Google Sheets sync error:', err));
      sendTelegramNotification(patient, 'updated').catch((err: Error) => console.error('Telegram error:', err));
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ error: "Failed to update patient" });
    }
  });

  // Delete patient
  app.delete("/api/patients/:id", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      
      const deleted = await storage.deletePatient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Patient not found" });
      }
      
      // Delete from Google Sheets and send Telegram notification (non-blocking)
      deletePatientFromSheets(patient.id).catch((err: Error) => console.error('Google Sheets delete error:', err));
      sendTelegramNotification(patient, 'deleted').catch((err: Error) => console.error('Telegram error:', err));
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete patient" });
    }
  });

  // Get patient payments
  app.get("/api/patients/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getPatientPayments(req.params.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Create payment for patient
  app.post("/api/patients/:id/payments", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      
      const validatedData = insertPaymentSchema.parse({
        ...req.body,
        patientId: req.params.id
      });
      
      const payment = await storage.createPayment(validatedData);
      
      // Get updated patient to sync with sheets
      const updatedPatient = await storage.getPatient(req.params.id);
      if (updatedPatient) {
        updatePatientSheet(updatedPatient).catch((err: Error) => console.error('Google Sheets sync error:', err));
      }
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create payment" });
      }
    }
  });

  // Delete payment
  app.delete("/api/payments/:id", async (req, res) => {
    try {
      // Get payment first to find patientId for sheet sync
      const paymentResult = await db.select().from(payments).where(eq(payments.id, req.params.id));
      const payment = paymentResult[0];
      
      const deleted = await storage.deletePayment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      // Sync updated patient to Google Sheets
      if (payment) {
        const updatedPatient = await storage.getPatient(payment.patientId);
        if (updatedPatient) {
          updatePatientSheet(updatedPatient).catch((err: Error) => console.error('Google Sheets sync error:', err));
        }
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  // Sync all patients to Google Sheets
  app.post("/api/sync-to-sheets", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      await syncAll(patients);
      res.json({ success: true, message: `Synced ${patients.length} patients to Google Sheets` });
    } catch (error) {
      console.error('Sync to sheets error:', error);
      res.status(500).json({ error: "Failed to sync to Google Sheets" });
    }
  });

  // Get today's summary
  app.get("/api/today-summary", async (req, res) => {
    try {
      const summary = await storage.getTodaysPatientsSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to get today's summary" });
    }
  });

  // Manual trigger for daily summary (for testing)
  app.post("/api/send-daily-summary", async (req, res) => {
    try {
      const { count, totalAmount } = await storage.getTodaysPatientsSummary();
      await sendDailySummary(count, totalAmount);
      res.json({ success: true, count, totalAmount });
    } catch (error) {
      console.error('Manual daily summary error:', error);
      res.status(500).json({ error: "Failed to send daily summary" });
    }
  });

  // Get GitHub user info
  app.get("/api/github/user", async (req, res) => {
    try {
      const user = await getGitHubUser();
      res.json(user);
    } catch (error) {
      console.error('GitHub user error:', error);
      res.status(500).json({ error: "Failed to get GitHub user" });
    }
  });

  // Create GitHub repository
  app.post("/api/github/create-repo", async (req, res) => {
    try {
      const { name, isPrivate } = req.body;
      const result = await createGitHubRepo(name || 'alsayer-patient-management', isPrivate !== false);
      res.json(result);
    } catch (error: any) {
      console.error('GitHub create repo error:', error);
      res.status(500).json({ error: error.message || "Failed to create GitHub repository" });
    }
  });

  // Start daily summary scheduler
  startDailySummaryScheduler(() => storage.getTodaysPatientsSummary());

  return httpServer;
}
