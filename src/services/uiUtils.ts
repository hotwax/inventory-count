import { translate } from '@common'
import { loadingController } from '@ionic/vue'

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
    await loader.value.present();
  },
  dismiss: async () => {
    if (loader.value) {
      const overlay = loader.value;
      loader.value = null as any;
      await overlay.dismiss();
    }
  }
}

export {
  loader
}