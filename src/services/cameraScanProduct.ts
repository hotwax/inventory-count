export interface CameraScanProductLookupContext {
  maargUrl: string;
  token: string;
  barcodeIdentification: string;
}

export function createCameraScanProductLookupContext({
  maargUrl,
  token,
  barcodeIdentification
}: CameraScanProductLookupContext): CameraScanProductLookupContext {
  return { maargUrl, token, barcodeIdentification };
}
