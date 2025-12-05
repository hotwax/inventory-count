import { CommonDB } from './commonDatabase'
import { v4 as uuidv4 } from 'uuid'
import { useAuthStore } from '@/stores/authStore'
import { useUserProfile } from '@/stores/userProfileStore'
import { useProductMaster } from '@/composables/useProductMaster'
import { createCommonDB } from '@/services/commonDatabase';

export let db: CommonDB
let currentOMS: string | null = null
let initialized = false

/**
 * Initialize the app:
 *  - Create per-OMS DB
 *  - Open DB
 *  - Initialize deviceId
 */
export async function initialize() {
  const auth = useAuthStore()
  const oms = auth.getOMS

  if (!oms) {
    console.warn("[AppInit] OMS instance not selected yet.")
    return
  }

  // Ensure DB is created only when OMS changes
  if (!db || currentOMS !== oms) {
    console.info(`[AppInit] Switching DB to CommonDB_${oms}`)
    db = createCommonDB(oms)
    currentOMS = oms
    await db.open()
  }

  // Initialize deviceId inside this OMS DB
  await initializeDeviceId();
  initialized = true
  await useProductMaster().init();
}

async function initializeDeviceId() {
  const pref = await db?.appPreferences.get("deviceId");
  let deviceId = pref?.key;

  if (!deviceId) {
    deviceId = uuidv4();
    await db?.appPreferences.put({ "key": "deviceId", "value": deviceId });
    console.info("[DeviceID] Generated new:", deviceId);
  } else {
    console.info("[DeviceID] Found existing:", pref?.value);
  }

  // Store it in Vuex state
  useUserProfile().setDeviceId(pref?.value as string);

  return deviceId;
}