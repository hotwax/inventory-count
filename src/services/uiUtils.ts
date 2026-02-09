import { translate } from '@common'
import { loadingController } from '@ionic/vue'
import { toastController } from '@ionic/vue';

const loader = {
  value: null as any,
  present: async (message: string) => {
    if (!loader.value) {
      loader.value = await loadingController
        .create({
          message: translate(message),
          translucent: false,
          backdropDismiss: false
        });
    }
    loader.value.present();
  },
  dismiss: () => {
    if (loader.value) {
      loader.value.dismiss();
      loader.value = null as any;
    }
  }
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

const getStatusColor = (statusId: string): string => {
  if (statusId === 'CYCLE_CNT_CREATED') {
    return 'medium';
  } else if (statusId === 'CYCLE_CNT_IN_PRGS') {
    return 'primary';
  }
  return '';
};

const getFacilityChipLabel = (selectedFacilityIds: string[], facilities: any[]): string => {
  if (selectedFacilityIds.length === 0) {
    return translate('All');
  } else if (selectedFacilityIds.length === 1) {
    const facility = facilities.find((f: any) => f.facilityId === selectedFacilityIds[0]);
    return facility?.facilityName || selectedFacilityIds[0];
  } else {
    return `${selectedFacilityIds.length} ${translate('facilities')}`;
  }
};

export {
  loader,
  showToast,
  getStatusColor,
  getFacilityChipLabel
}