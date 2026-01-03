// Local Storage utilities for offline data persistence
import type { Patient } from '@shared/schema';

const PATIENTS_STORAGE_KEY = 'alsayer_patients_cache';
const PENDING_SYNC_KEY = 'alsayer_pending_sync';

export function getCachedPatients(): Patient[] {
  try {
    const cached = localStorage.getItem(PATIENTS_STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error reading cached patients:', error);
    return [];
  }
}

export function setCachedPatients(patients: Patient[]): void {
  try {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
  } catch (error) {
    console.error('Error caching patients:', error);
  }
}

export function updateCachedPatient(patient: Patient): void {
  try {
    const patients = getCachedPatients();
    const index = patients.findIndex(p => p.id === patient.id);
    if (index >= 0) {
      patients[index] = patient;
    } else {
      patients.push(patient);
    }
    setCachedPatients(patients);
  } catch (error) {
    console.error('Error updating cached patient:', error);
  }
}

export function removeCachedPatient(patientId: string): void {
  try {
    const patients = getCachedPatients();
    const filtered = patients.filter(p => p.id !== patientId);
    setCachedPatients(filtered);
  } catch (error) {
    console.error('Error removing cached patient:', error);
  }
}

interface PendingAction {
  type: 'create' | 'update' | 'delete';
  patientId?: string;
  data?: any;
  timestamp: number;
}

export function getPendingActions(): PendingAction[] {
  try {
    const pending = localStorage.getItem(PENDING_SYNC_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch (error) {
    console.error('Error reading pending actions:', error);
    return [];
  }
}

export function addPendingAction(action: Omit<PendingAction, 'timestamp'>): void {
  try {
    const pending = getPendingActions();
    pending.push({ ...action, timestamp: Date.now() });
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error('Error adding pending action:', error);
  }
}

export function clearPendingActions(): void {
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
  } catch (error) {
    console.error('Error clearing pending actions:', error);
  }
}

export function hasPendingActions(): boolean {
  return getPendingActions().length > 0;
}
