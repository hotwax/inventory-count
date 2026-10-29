import {describe, expect, it} from 'vitest';
import {reconcileCountReviewTotals} from '@/utils/countReviewTotals';
const part=(productId:string, inventoryCountImportId:string, counted:any, statusId='SESSION_SUBMITTED')=>({productId,inventoryCountImportId,counted,statusId});
const reviews=[{productId:'gold',quantity:6,numberOfSessions:2,systemQuantityOnHand:2},
  {productId:'silver',quantity:6,numberOfSessions:2,systemQuantityOnHand:1,price:10}];
const rows=[part('gold','one',6),part('gold','two',0),part('silver','one',0),part('silver','two',3)];
describe('approval totals',()=>{
  it('corrects 12 to9 and recomputes variance from the count snapshot',()=>{
    const result=reconcileCountReviewTotals(reviews,rows);
    expect(result.map(r=>r.quantity)).toEqual([6,3]);
    expect(result.map(r=>r.proposedVarianceQuantity)).toEqual([4,2]);
    expect(result[1].extendedPrice).toBe(20);
    expect(reviews[1].quantity).toBe(6);
  });
  it('keeps zero distinct from uncounted and ignores voided contributions',()=>{
    const result=reconcileCountReviewTotals([{productId:'p',numberOfSessions:1}],[part('p','one',0),part('p','void',99,'SESSION_VOIDED')]);
    expect(result[0].quantity).toBe(0);
    expect(reconcileCountReviewTotals([{productId:'p',numberOfSessions:1}],[part('p','one',null)])[0].quantity).toBeNull();
  });
  it('preserves saved decisions after inventory changes',()=>{
    const result=reconcileCountReviewTotals([{...reviews[1],countedQuantity:3,varianceQuantity:2,decisionOutcomeEnumId:'APPLIED',quantityOnHand:900}],rows.filter(r=>r.productId==='silver'));
    expect(result[0]).toMatchObject({quantity:3,proposedVarianceQuantity:2});
  });
  it('rejects duplicate, incomplete and malformed totals',()=>{
    for(const bad of [rows.slice(1),[...rows,rows[0]],rows.map((r,i)=>i? r:{...r,counted:'NaN'})]) expect(()=>reconcileCountReviewTotals(reviews,bad)).toThrow();
    expect(()=>reconcileCountReviewTotals([reviews[0],reviews[0]],rows)).toThrow();
  });
});
