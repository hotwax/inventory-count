export default interface UserState {
  token: string;
  current: object | null;
  instanceUrl: string;
  omsRedirectionInfo: {
    url: string;
    token: string;
  }
  facilities: Array<any>;
  currentFacility: any;
  permissions: any;
  productStores: Array<any>;
  currentProductStore: any;
  fieldMappings: any;
  currentMapping: {
    id: string;
    mappingType: string;
    name: string;
    value: object;
  },
  settings: {
    forceScan: boolean,
    showQoh: boolean,
    productIdentificationPref: {
      primaryId: string,
      secondaryId: string
    },
  },
  goodIdentificationTypes: Array<string>;
}