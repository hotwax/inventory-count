import { toastController } from '@ionic/vue';
import { DateTime } from "luxon";
import { saveAs } from 'file-saver';
import { JsonToCsvOption } from '@/types';
import Papa from 'papaparse'
import { useProductStore } from '@/stores/useProductStore'
import { useFacilityStore } from '@/stores/useFacilityStore';

const dateOrdinalSuffix = {
  1: 'st',
  21: 'st',
  31: 'st',
  2: 'nd',
  22: 'nd',
  3: 'rd',
  23: 'rd'
} as any

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
  return typeof response.data != "object" || !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_ || !!response.data.error;
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

const getDateTime = (time: any) => {
  return time ? DateTime.fromMillis(time).toISO() : ''
}

function getDateWithOrdinalSuffix(time: any) {
  if (!time) return "-";
  const dateTime = DateTime.fromMillis(time);
  const suffix = dateOrdinalSuffix[dateTime.day] || "th"
  return `${dateTime.day}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
}

function getFacilityName(id: string) {
  const facilities: any[] = useFacilityStore().getFacilities || [];
  return facilities.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

const parseCsv = async (file: File, options?: any) => {
  return new Promise ((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results: any) {
        if (results.errors.length) {
          reject(results.error)
        } else {
          resolve(results.data)
        }
      },
      ...options
    });
  })
}

const jsonToCsv = (file: any, options: JsonToCsvOption = {}) => {
  const csv = Papa.unparse(file, {
    ...options.parse
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  if (options.download) {
    saveAs(blob, options.name ? options.name : "default.csv");
  }

  return blob;
};

const downloadCsv = (csv: any, fileName: any) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName ? fileName : "CycleCountImport.csv");

  return blob;
};

const getProductStoreId = () => {
  const currentEComStore: any = useProductStore().getCurrentProductStore;
  return currentEComStore.productStoreId
};

const  getValidItems = (items: any) => {
  return (items ?? []).filter((item: any) => item.itemStatusId !== "INV_COUNT_VOIDED")
}

export { downloadCsv, getValidItems, jsonToCsv, showToast, hasError, getDateTime, getDateWithOrdinalSuffix, getFacilityName, getProductStoreId, parseCsv }
