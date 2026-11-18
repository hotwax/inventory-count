import { v4 as uuidv4 } from 'uuid'
import { commonUtil } from '@common'
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

// A missing or non-semver version (e.g. an instance on a custom branch) is treated as compatible
const isAppCompatible = () => {
  const currentVersion = useUserProfile().systemInformation?.instanceInfo?.componentRelease;
  const requiredVersion = import.meta.env.VITE_MAARG_COMPATIBLE_VERSION;

  return commonUtil.isVersionGreaterOrEqual(requiredVersion, currentVersion);
}

const getUploadFileParamName = () => isAppCompatible() ? "contentFile" : "uploadedFile"

export {
  getUploadFileParamName,
  initDeviceId,
  isAppCompatible
}
