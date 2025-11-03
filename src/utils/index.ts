import { toastController } from '@ionic/vue';
import { DateTime } from "luxon";
import store from "@/store";
import { saveAs } from 'file-saver';
import { JsonToCsvOption } from '@/types';
import Papa from 'papaparse'
import { useUserStore } from '@hotwax/dxp-components';

const dateOrdinalSuffix = {
  1: 'st',
  21: 'st',
  31: 'st',
  2: 'nd',
  22: 'nd',
  3: 'rd',
  23: 'rd'
} as any

// TODO Use separate files for specific utilities

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

const handleDateTimeInput = (dateTimeValue: any) => {
  // TODO Handle it in a better way
  // Remove timezone and then convert to timestamp
  // Current date time picker picks browser timezone and there is no supprt to change it
  const dateTime = DateTime.fromISO(dateTimeValue, { setZone: true}).toFormat("yyyy-MM-dd'T'HH:mm:ss")
  return DateTime.fromISO(dateTime).toMillis()
}

const getDateTime = (time: any) => {
  return time ? DateTime.fromMillis(time).toISO() : ''
}

// Converts ISO date to milliseconds at start or end of day, considering timezone
function convertIsoToMillis(isoDate: any, rangeSuffix?: string) {
  return rangeSuffix === "from" ? DateTime.fromISO(isoDate, {setZone: true}).startOf("day").toMillis() : DateTime.fromISO(isoDate, {setZone: true}).endOf("day").toMillis()
}



function getDateWithOrdinalSuffix(time: any) {
  if (!time) return "-";
  const dateTime = DateTime.fromMillis(time);
  const suffix = dateOrdinalSuffix[dateTime.day] || "th"
  return `${dateTime.day}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
}

function timeFromNow(time: any) {
  if(!time) return "-"
  const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
  return DateTime.local().plus(timeDiff).toRelative();
}

function getFacilityName(id: string) {
  return useUserStore().getFacilites.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

function getPartyName(item: any) {
  return item.countedByGroupName ? item.countedByGroupName : item.countedByFirstName ? item.countedByFirstName + " " + item.countedByLastName : item.countedByUserLoginId ? item.countedByUserLoginId : "-"
}

const getProductIdentificationValue = (productIdentifier: string, product: any) => {

  // handled this case as on page load initially the data is not available, so not to execute furthur code
  // untill product are not available
  if(!Object.keys(product).length) {
    return;
  }

  let value = product[productIdentifier]

  // considered that the goodIdentification will always have values in the format "productIdentifier/value" and there will be no entry like "productIdentifier/"
  const identification = product['goodIdentifications']?.find((identification: string) => identification.startsWith(productIdentifier + "/"))

  if(identification) {
    const goodIdentification = identification.split('/')
    value = goodIdentification[1]
  }

  return value;
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

function sortListByField(list: any, field = "parentProductName") {
  return list.sort((a: any, b: any) => {
    if (!a[field] && b[field]) return 1;  // If 'item1' has no field, it goes after 'item2'
    if (a[field] && !b[field]) return -1; // If 'item2' has no field, it goes after 'item1'
    if (a[field] < b[field]) return -1;   // Normal alphabetical sorting
    if (a[field] > b[field]) return 1;    // Normal alphabetical sorting
    return 0;                             // If fields are equal
  });
}

const getProductStoreId = () => {
  const currentEComStore: any = useUserStore().getCurrentEComStore;
  return currentEComStore.productStoreId
};

const  getValidItems = (items: any) => {
  return (items ?? []).filter((item: any) => item.itemStatusId !== "INV_COUNT_VOIDED")
}

const getStatusDescription = (statusId: string) => {
  return store.getters["util/getStatusDesc"](statusId);
}

export { getStatusDescription, convertIsoToMillis, downloadCsv, getValidItems, jsonToCsv, showToast, hasError, handleDateTimeInput, getDateTime, getDateWithOrdinalSuffix, getFacilityName, getPartyName, getProductIdentificationValue, getProductStoreId, timeFromNow, parseCsv, sortListByField }
