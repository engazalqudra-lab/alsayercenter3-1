// Google Sheets Integration via Apps Script Webhook
// This method doesn't require Google Cloud Console - works by calling a webhook URL
import type { Patient } from '@shared/schema';

const WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

function patientToWebhookData(patient: Patient, action: 'create' | 'update' | 'delete') {
  const totalAmount = Number(patient.totalAmount) || 0;
  const totalReceived = Number(patient.totalReceived) || 0;
  const remaining = totalAmount - totalReceived;

  return {
    action,
    id: patient.id,
    patientName: patient.patientName,
    age: patient.age,
    residence: patient.residence || '',
    phone: patient.phone || '',
    doctorName: patient.doctorName || '',
    diagnosis: patient.diagnosis || '',
    doctorRequest: patient.doctorRequest || '',
    hasSurgery: patient.hasSurgery ? 'نعم' : 'لا',
    surgeryType: patient.surgeryType || '',
    careType: (patient.careType === 'home_exercises' || patient.careType === 'homeExercises') ? 'تمارين منزلية' : 
      patient.careType === 'sessions' ? 'جلسات علاجية' : '',
    sessionCount: patient.sessionCount || 0,
    sessionPrice: patient.sessionPrice || 0,
    aidType: patient.aidType || '',
    aidPrice: patient.aidPrice || 0,
    dietPlan: patient.hasDiet ? patient.dietPlan || '' : '',
    otherServiceType: patient.hasOtherServices ? patient.otherServiceType || '' : '',
    otherServicePrice: patient.otherServicePrice || 0,
    totalAmount,
    totalReceived,
    remaining,
    createdAt: patient.createdAt || new Date().toISOString()
  };
}

export async function syncPatientToSheetWebhook(patient: Patient, action: 'create' | 'update' = 'create'): Promise<void> {
  if (!WEBHOOK_URL) {
    console.log('GOOGLE_SHEETS_WEBHOOK_URL not set - skipping Google Sheets sync');
    return;
  }

  try {
    const data = patientToWebhookData(patient, action);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status: ${response.status}`);
    }

    console.log(`Patient ${patient.id} synced to Google Sheets via webhook (${action})`);
  } catch (error) {
    console.error('Google Sheets webhook sync error:', error);
  }
}

export async function deletePatientFromSheetWebhook(patientId: string): Promise<void> {
  if (!WEBHOOK_URL) {
    console.log('GOOGLE_SHEETS_WEBHOOK_URL not set - skipping Google Sheets delete');
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        id: patientId
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status: ${response.status}`);
    }

    console.log(`Patient ${patientId} deleted from Google Sheets via webhook`);
  } catch (error) {
    console.error('Google Sheets webhook delete error:', error);
  }
}

export async function syncAllPatientsToSheetWebhook(patients: Patient[]): Promise<void> {
  if (!WEBHOOK_URL) {
    console.log('GOOGLE_SHEETS_WEBHOOK_URL not set - skipping Google Sheets sync all');
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync_all',
        patients: patients.map(p => patientToWebhookData(p, 'create'))
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status: ${response.status}`);
    }

    console.log(`${patients.length} patients synced to Google Sheets via webhook`);
  } catch (error) {
    console.error('Google Sheets webhook sync all error:', error);
  }
}
