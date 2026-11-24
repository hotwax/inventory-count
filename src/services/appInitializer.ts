import { CommonDB } from './commonDatabase'
import { v4 as uuidv4 } from 'uuid'
import { useUserProfile } from '@/stores/userProfileStore'
import { useProductMaster } from '@/composables/useProductMaster'
import { createCommonDB } from '@/services/commonDatabase';
import { useAgentControl } from '@/composables/useAgentControl';
import { useProductStore } from '@/stores/productStore'
import { commonUtil, logger } from '@common';

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
  const oms = commonUtil.getOMSInstanceName();

  if (!oms) {
    logger.warn("[AppInit] OMS instance not selected yet.")
    return
  }

  // Ensure DB is created only when OMS changes
  if (!db || currentOMS !== oms) {
    logger.info(`[AppInit] Switching DB to CommonDB_${oms}`)
    db = createCommonDB(oms)
    currentOMS = oms
    await db.open()
  }

  // Initialize deviceId inside this OMS DB
  await initializeDeviceId();
  await useProductMaster().init();

  // Note: This should only run once per session, not on every page refresh
  startAgentControl();
}

/**
 * Start the agent control system for the selected facility, in the background.
 *
 * It needs a facility, which is only known after login. On the login screen initialize() has no
 * facility yet and skips this, so postLogin() calls it again once the facilities are loaded.
 */
export function startAgentControl() {
  const facilityId = useProductStore().getCurrentFacility?.facilityId;

  if(!facilityId) {
    logger.warn("[AppInit] No facilityId available, skipping agent control initialization");

    return;
  }

  useAgentControl().initialize(facilityId).catch((error: unknown) => {
    logger.error("[AppInit] Agent control initialization failed:", error);
  });
}

async function initializeDeviceId() {
  const pref = await db?.appPreferences.get("deviceId");
  let deviceId = pref?.key;

  if (!deviceId) {
    deviceId = uuidv4();
    await db?.appPreferences.put({ "key": "deviceId", "value": deviceId });
    logger.info("[DeviceID] Generated new:", deviceId);
  } else {
    logger.info("[DeviceID] Found existing:", pref?.value);
  }

  // Store it in Vuex state
  useUserProfile().setDeviceId(pref?.value || deviceId);

  return deviceId;
}