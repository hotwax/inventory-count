import { describe, expect, it } from 'vitest';

import { createCameraScanProductLookupContext } from './cameraScanProduct';

describe('createCameraScanProductLookupContext', () => {
  it('uses the Maarg endpoint required for a cache-miss barcode lookup', () => {
    expect(createCameraScanProductLookupContext({
      maargUrl: 'https://maarg.example.com',
      token: 'access-token',
      barcodeIdentification: 'EAN'
    })).toEqual({
      maargUrl: 'https://maarg.example.com',
      token: 'access-token',
      barcodeIdentification: 'EAN'
    });
  });
});
