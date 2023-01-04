import { toastController } from '@ionic/vue';

// TODO Use separate files for specific utilities

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
  return !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_;
}

const showToast = async (message: string, configButtons?: any) => {
  const defaultButtons = [{
    text: 'Dismiss',
    role: 'cancel'
  }]

  if (configButtons) defaultButtons.push(...configButtons);

  const toast = await toastController
    .create({
      message: message,
      duration: 3000,
      position: 'top',
      buttons: defaultButtons
    })
  return toast.present();
}

const getFeature = (features: any, key: string) => {
  let featureValue = ''
  if (features) {
    featureValue = features.find((feature: any) => feature.desc === key)?.value
  }
  // returning 0th index as the featureValue is an array
  return featureValue ? featureValue[0] : '';
}

export { showToast, hasError, getFeature }
