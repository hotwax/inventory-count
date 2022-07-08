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

const getIdentification = (identifications: any, key: string) => {
  let identificationValue = '';
  if (identifications) {
    identificationValue = identifications.find((identification: any) => identification.productIdTypeEnumId === key)?.idValue
  }
  return identificationValue
}

const getContent = (contents: any, key: string) => {
  let contentValue = '';
  if (contents) {
    contentValue = contents.find((content: any) => content.productContentTypeEnumId === key)?.contentLocation
  }
  return contentValue
}

const getFeature = (features: any, key: string) => {
  let featureValue = ''
  if (features) {
    featureValue = features.find((data: any) => data.feature.productFeatureTypeEnumId === key)?.feature.description
  }
  return featureValue;
}

export { showToast, hasError, getContent, getFeature, getIdentification }
