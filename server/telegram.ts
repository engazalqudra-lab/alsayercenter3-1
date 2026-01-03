// Telegram Bot Integration
import type { Patient } from '@shared/schema';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function formatPatientMessage(patient: Patient, action: 'created' | 'updated' | 'deleted'): string {
  const actionText = action === 'created' ? 'تسجيل مريض جديد' :
                     action === 'updated' ? 'تحديث بيانات مريض' : 
                     'حذف سجل مريض';

  const totalAmount = Number(patient.totalAmount) || 0;
  const totalReceived = Number(patient.totalReceived) || 0;
  const remaining = totalAmount - totalReceived;

  let message = `📋 *${actionText}*\n\n`;
  message += `👤 *الاسم:* ${patient.patientName}\n`;
  message += `🔢 *العمر:* ${patient.age}\n`;
  
  if (patient.residence) message += `🏠 *السكن:* ${patient.residence}\n`;
  if (patient.phone) message += `📱 *الهاتف:* ${patient.phone}\n`;
  if (patient.doctorName) message += `👨‍⚕️ *الطبيب:* ${patient.doctorName}\n`;
  if (patient.diagnosis) message += `🏥 *التشخيص:* ${patient.diagnosis}\n`;
  
  if (patient.hasSurgery) {
    message += `✂️ *عملية:* نعم`;
    if (patient.surgeryType) message += ` (${patient.surgeryType})`;
    message += `\n`;
  }
  
  if (patient.careType) {
    const careTypeText = (patient.careType === 'home_exercises' || patient.careType === 'homeExercises') ? 'تمارين منزلية' : 'جلسات علاجية';
    message += `💪 *نوع الرعاية:* ${careTypeText}\n`;
    if (patient.sessionCount) {
      message += `📊 *عدد الجلسات:* ${patient.sessionCount}`;
      if (patient.sessionPrice) message += ` × ${patient.sessionPrice} د.ع`;
      message += `\n`;
    }
  }
  
  if (patient.aidType) {
    message += `🩹 *المساند الطبية:* ${patient.aidType}`;
    if (patient.aidPrice) message += ` - ${patient.aidPrice} د.ع`;
    message += `\n`;
  }
  
  if (patient.hasDiet && patient.dietPlan) {
    message += `🥗 *النظام الغذائي:* ${patient.dietPlan}\n`;
  }

  if (patient.hasOtherServices && patient.otherServiceType) {
    message += `🔧 *خدمات أخرى:* ${patient.otherServiceType}`;
    if (patient.otherServicePrice) message += ` - ${patient.otherServicePrice} د.ع`;
    message += `\n`;
  }

  message += `\n💰 *المالية:*\n`;
  message += `   الإجمالي: ${totalAmount} د.ع\n`;
  message += `   المستلم: ${totalReceived} د.ع\n`;
  message += `   المتبقي: ${remaining} د.ع\n`;

  return message;
}

export async function sendTelegramNotification(
  patient: Patient, 
  action: 'created' | 'updated' | 'deleted'
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram not configured - skipping notification');
    return;
  }

  try {
    const message = formatPatientMessage(patient, action);
    
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
    } else {
      console.log(`Telegram notification sent for patient ${patient.id}`);
    }
  } catch (error) {
    console.error('Telegram notification error:', error);
  }
}

export async function sendDailySummary(todayCount: number, totalAmount: number): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram not configured - skipping daily summary');
    return;
  }

  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-IQ', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let message = `📊 *ملخص اليوم*\n\n`;
    message += `📅 ${dateStr}\n\n`;
    message += `👥 *عدد المراجعين اليوم:* ${todayCount}\n`;
    message += `💰 *إجمالي المبالغ:* ${totalAmount.toLocaleString('ar-IQ')} د.ع\n\n`;
    message += `🏥 مركز اضواء الساير للعلاج الطبيعي والمساند الطبية`;

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram daily summary error:', error);
    } else {
      console.log('Daily summary sent to Telegram');
    }
  } catch (error) {
    console.error('Telegram daily summary error:', error);
  }
}

let dailySummaryInterval: NodeJS.Timeout | null = null;

export function startDailySummaryScheduler(getTodaysPatients: () => Promise<{ count: number; totalAmount: number }>) {
  if (dailySummaryInterval) {
    clearInterval(dailySummaryInterval);
  }

  const checkAndSendSummary = async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (hours === 23 && minutes === 0) {
      try {
        const { count, totalAmount } = await getTodaysPatients();
        await sendDailySummary(count, totalAmount);
      } catch (error) {
        console.error('Failed to send daily summary:', error);
      }
    }
  };

  dailySummaryInterval = setInterval(checkAndSendSummary, 60000);
  console.log('Daily summary scheduler started - will send at 11 PM');
}
