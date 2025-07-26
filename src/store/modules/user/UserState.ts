export default interface UserState {
  token: string;
  current: object | null;
  instanceUrl: string;
  omsRedirectionInfo: {
    url: string;
    token: string;
  }
  permissions: any;
  fieldMappings: any;
  currentMapping: {
    id: string;
    mappingType: string;
    name: string;
    value: object;
  },
  settings: {
    isFirstScanCountEnabled: boolean;
    forceScan: boolean,
    showQoh: boolean,
    barcodeIdentificationPref: string;
  },
  isScrollingAnimationEnabled: boolean;
  isEmbedded: boolean;
}