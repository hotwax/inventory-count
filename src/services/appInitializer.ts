import { CommonDB } from './commonDatabase'
import { v4 as uuidv4 } from 'uuid'
import { useAuthStore } from '@/stores/authStore'
import { useUserProfile } from '@/stores/userProfileStore'
import { useProductMaster } from '@/composables/useProductMaster'
import { createCommonDB } from '@/services/commonDatabase';
import { useAgentControl } from '@/composables/useAgentControl';
import { useProductStore } from '@/stores/productStore'

export let db: CommonDB
let currentOMS: string | null = null

/**
 * Initialize the app:
 *  - Create per-OMS DB
 *  - Open DB
 *  - Initialize deviceId
 *  - Initialize agent control system
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
  await useProductMaster().init();

  // Initialize agent control system using composable
  // Note: This should only run once per session, not on every page refresh
  const agentControl = useAgentControl();
  const facilityId = useProductStore().getCurrentFacility.facilityId;

  if (facilityId) {
    // Run agent control initialization in background
    agentControl.initialize(facilityId).catch((error: unknown) => {
      console.error('[AppInit] Agent control initialization failed:', error);
    });
  } else {
    console.warn('[AppInit] No facilityId available, skipping agent control initialization');
  }
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
  useUserProfile().setDeviceId(pref?.value || deviceId);

  return deviceId;
}