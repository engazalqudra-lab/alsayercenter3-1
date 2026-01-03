// Google Sheets Integration - Supports both Replit connector and Service Account
import { google } from 'googleapis';
import type { Patient } from '@shared/schema';

let connectionSettings: any;
let authClient: any;

// Check if running with Service Account (for external deployment)
function isServiceAccountMode(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
}

async function getServiceAccountAuth() {
  if (authClient) return authClient;
  
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not found');
  }

  const credentials = JSON.parse(serviceAccountKey);
  
  authClient = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ]
  });

  return authClient;
}

async function getAccessToken() {
  if (isServiceAccountMode()) {
    const auth = await getServiceAccountAuth();
    return auth;
  }

  // Replit connector mode
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

async function getGoogleSheetsClient() {
  if (isServiceAccountMode()) {
    const auth = await getServiceAccountAuth();
    return google.sheets({ version: 'v4', auth });
  }

  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

async function getDriveClient() {
  if (isServiceAccountMode()) {
    const auth = await getServiceAccountAuth();
    return google.drive({ version: 'v3', auth });
  }

  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

let spreadsheetId: string | null = process.env.GOOGLE_SPREADSHEET_ID || null;

async function getOrCreateSpreadsheet(): Promise<string> {
  if (spreadsheetId) return spreadsheetId;

  const drive = await getDriveClient();
  const sheets = await getGoogleSheetsClient();

  // Search for existing spreadsheet
  const searchResult = await drive.files.list({
    q: "name='مركز اضواء الساير - سجلات المرضى' and mimeType='application/vnd.google-apps.spreadsheet'",
    spaces: 'drive',
    fields: 'files(id, name)'
  });

  if (searchResult.data.files && searchResult.data.files.length > 0) {
    spreadsheetId = searchResult.data.files[0].id!;
    return spreadsheetId;
  }

  // Create new spreadsheet
  const newSheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'مركز اضواء الساير - سجلات المرضى',
        locale: 'ar'
      },
      sheets: [{
        properties: {
          title: 'المرضى',
          sheetId: 0,
          rightToLeft: true
        }
      }]
    }
  });

  spreadsheetId = newSheet.data.spreadsheetId!;

  // Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'المرضى!A1:U1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        'رقم السجل',
        'الاسم',
        'العمر',
        'السكن',
        'الهاتف',
        'اسم الطبيب',
        'التشخيص',
        'طلب الطبيب',
        'هل يوجد عملية',
        'نوع العملية',
        'نوع الرعاية',
        'عدد الجلسات',
        'سعر الجلسة',
        'المساند الطبية',
        'سعر المساند',
        'النظام الغذائي',
        'خدمات أخرى',
        'سعر الخدمات الأخرى',
        'المبلغ الكلي',
        'المبلغ المستلم',
        'المتبقي'
      ]]
    }
  });

  return spreadsheetId;
}

function patientToRow(patient: Patient): (string | number)[] {
  const totalAmount = Number(patient.totalAmount) || 0;
  const totalReceived = Number(patient.totalReceived) || 0;
  const remaining = totalAmount - totalReceived;

  return [
    patient.id,
    patient.patientName,
    patient.age,
    patient.residence || '',
    patient.phone || '',
    patient.doctorName || '',
    patient.diagnosis || '',
    patient.doctorRequest || '',
    patient.hasSurgery ? 'نعم' : 'لا',
    patient.surgeryType || '',
    (patient.careType === 'home_exercises' || patient.careType === 'homeExercises') ? 'تمارين منزلية' : 
      patient.careType === 'sessions' ? 'جلسات علاجية' : '',
    patient.sessionCount || 0,
    patient.sessionPrice || 0,
    patient.aidType || '',
    patient.aidPrice || 0,
    patient.hasDiet ? patient.dietPlan || '' : '',
    patient.hasOtherServices ? patient.otherServiceType || '' : '',
    patient.otherServicePrice || 0,
    totalAmount,
    totalReceived,
    remaining
  ];
}

export async function syncPatientToSheet(patient: Patient): Promise<void> {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetId = await getOrCreateSpreadsheet();

    // Get all existing data to find patient row
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'المرضى!A:A'
    });

    const rows = existingData.data.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == patient.id) {
        rowIndex = i + 1;
        break;
      }
    }

    const rowData = patientToRow(patient);

    if (rowIndex > 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `المرضى!A${rowIndex}:U${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData]
        }
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'المرضى!A:U',
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData]
        }
      });
    }

    console.log(`Patient ${patient.id} synced to Google Sheets`);
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    throw error;
  }
}

export async function syncAllPatientsToSheet(patients: Patient[]): Promise<void> {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetId = await getOrCreateSpreadsheet();

    // Clear existing data (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'المرضى!A2:U'
    });

    if (patients.length === 0) return;

    // Add all patients
    const rows = patients.map(patientToRow);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'المرضى!A:U',
      valueInputOption: 'RAW',
      requestBody: {
        values: rows
      }
    });

    console.log(`${patients.length} patients synced to Google Sheets`);
  } catch (error) {
    console.error('Google Sheets sync all error:', error);
    throw error;
  }
}

export async function deletePatientFromSheet(patientId: string): Promise<void> {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetId = await getOrCreateSpreadsheet();

    // Get all data to find patient row
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'المرضى!A:A'
    });

    const rows = existingData.data.values || [];
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == patientId) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex > 0) {
      // Delete the row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      });
    }

    console.log(`Patient ${patientId} deleted from Google Sheets`);
  } catch (error) {
    console.error('Google Sheets delete error:', error);
    throw error;
  }
}
