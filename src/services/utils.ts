import { DateTime } from "luxon";
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/services/appInitializer';
import { useUserProfile } from '@/stores/userProfileStore';

async function initDeviceId() {
  const pref = await db.appPreferences.get("deviceId");
  let deviceId = pref?.key;

  if (!deviceId) {
    deviceId = uuidv4();
    await db.appPreferences.put({ "key": "deviceId", "value": deviceId });
    console.info("[DeviceID] Generated new:", deviceId);
  } else {
    console.info("[DeviceID] Found existing:", pref?.value);
  }

  // Store it in Pinia state
  useUserProfile().setDeviceId(pref?.value as string);

  return deviceId;
}

const dateOrdinalSuffix = {
  1: 'st',
  21: 'st',
  31: 'st',
  2: 'nd',
  22: 'nd',
  3: 'rd',
  23: 'rd'
} as any;

function getDateWithOrdinalSuffix(time: any) {
  if (!time) return "-";
  const dateTime = DateTime.fromMillis(time);
  const suffix = dateOrdinalSuffix[dateTime.day] || "th"
  return `${dateTime.day}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
}

function getDateTimeWithOrdinalSuffix(time: any) {
  if (!time) return "-";
  const dateTime = DateTime.fromMillis(time);
  const day = dateTime.day;

  let suffix;
  if (day >= 11 && day <= 13) {
    suffix = 'th';
  } else {
    switch (day % 10) {
      case 1:  suffix = 'st'; break;
      case 2:  suffix = 'nd'; break;
      case 3:  suffix = 'rd'; break;
      default: suffix = 'th'; break;
    }
  }

  return `${dateTime.toFormat("h:mm a d")}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
}

// Helper to convert date string (YYYY-MM-DD) to ISO start/end of day
function formatDateTime(dateStr: string, endOfDay = false) {
  if (!dateStr) return '';
  const dt = DateTime.fromISO(dateStr);
  const final = endOfDay ? dt.endOf('day') : dt.startOf('day');
  return final.toFormat("yyyy-MM-dd HH:mm:ss.SSS");
}

function jsonParse(value: any): any {
  let parsedValue;
  try {
    parsedValue = JSON.parse(value);
  } catch (e) {
    parsedValue = value;
  }
  return parsedValue;
}

export {
  formatDateTime,
  getDateWithOrdinalSuffix,
  getDateTimeWithOrdinalSuffix,
  initDeviceId,
  jsonParse
} 