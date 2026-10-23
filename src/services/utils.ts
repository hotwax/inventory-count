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

const isAppCompatible = () => {
  const currentVersion = useUserProfile().systemInformation?.instanceInfo?.componentRelease;
  const requiredVersion = import.meta.env.VITE_MAARG_COMPATIBLE_VERSION;

  if(!requiredVersion || !currentVersion) return true;

  const currentParts = String(currentVersion).split('.');
  const requiredParts = String(requiredVersion).split('.');

  if(currentParts.length < 3) return true;

  currentParts[0] = currentParts[0].replace("v", "")
  requiredParts[0] = requiredParts[0].replace("v", "")

  for(let i = 0; i < 3; i++) {
    const current = Number(currentParts[i]) || 0;
    const required = Number(requiredParts[i]) || 0;
    if(current > required) return true;
    if(current < required) return false;
  }
  return true;
}

const getUploadFileParamName = () => isAppCompatible() ? "contentFile" : "uploadedFile"

export {
  getUploadFileParamName,
  initDeviceId,
  isAppCompatible
}
