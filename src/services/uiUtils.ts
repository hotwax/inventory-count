import { translate } from '@common'
import { loadingController } from '@ionic/vue'

let activeLoads = 0;
let presentation: ReturnType<typeof loadingController.create> | null = null;

const loader = {
  present: async (message: string) => {
    activeLoads++;
    // Concurrent callers share creation as well as the visible overlay.
    if (!presentation) {
      presentation = loadingController
        .create({
          message: translate(message),
          translucent: false,
          backdropDismiss: false
        }).then(async overlay => {
          await overlay.present();

          return overlay;
        });
    }
    const current = presentation;
    try {
      await current;
    } catch (error) {
      if(presentation === current) {
        activeLoads = 0;
        presentation = null;
      }
      throw error;
    }
  },
  dismiss: async () => {
    if(!activeLoads || --activeLoads) {
      return;
    }
    const current = presentation;
    const overlay = await current;
    if(activeLoads || presentation !== current) {
      return;
    }
    presentation = null;
    await overlay?.dismiss();
  }
}

export {
  loader
}
