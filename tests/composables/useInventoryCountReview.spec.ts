import {beforeEach, describe, expect, it, vi} from 'vitest';
import {api} from '@common';
import {useInventoryCountReview} from '@/composables/useInventoryCountReview';
vi.mock('@common',()=>({api:vi.fn(),commonUtil:{hasError:(r:any)=>!!r?.data?._ERROR_MESSAGE_}}));
let review:any[], contributions:any[], posts:any[], statusId:string;
const request=(overrides={})=>({workEffortId:'w',facilityId:'49',productId:'silver',countedQuantity:3,varianceQuantity:2,decisionOutcomeEnumId:'APPLIED',...overrides});
beforeEach(()=>{
  posts=[];statusId='CYCLE_CNT_CMPLTD';
  review=[{productId:'silver',quantity:6,numberOfSessions:2,systemQuantityOnHand:1}];
  contributions=[{productId:'silver',inventoryCountImportId:'one',counted:3,statusId:'SESSION_SUBMITTED'},
    {productId:'silver',inventoryCountImportId:'two',counted:0,statusId:'SESSION_SUBMITTED'}];
  vi.mocked(api).mockImplementation(async(r:any)=>{
    if(r.method==='post'){posts.push(r.data);return {data:{}} as any;}
    if(r.url.endsWith('/reviews'))return {data:review} as any;
    if(r.url.endsWith('/count'))return {data:contributions} as any;
    return {data:{statusId,facilityId:'49'}} as any;
  });
});
describe('approval submission preflight',()=>{
  it('posts the fresh saved count and matching snapshot variance',async()=>{
    await useInventoryCountReview().submit([request()]);
    expect(posts[0].inventoryCountProductsList).toEqual([request({systemQuantity:1})]);
  });
  it('blocks a stale displayed aggregate before posting',async()=>{
    await expect(useInventoryCountReview().submit([request({countedQuantity:6,varianceQuantity:5})])).rejects.toThrow('Count changed');
    expect(posts).toHaveLength(0);
  });
  it('does not apply already-decided products again on retry',async()=>{
    review[0]={...review[0],decisionOutcomeEnumId:'APPLIED',countedQuantity:3,varianceQuantity:2};
    await useInventoryCountReview().submit([request()]);
    expect(posts).toHaveLength(0);
  });
  it('blocks mixed counts, duplicate products and unfinished sessions',async()=>{
    await expect(useInventoryCountReview().submit([request(),request()])).rejects.toThrow();
    await expect(useInventoryCountReview().submit([request(),request({workEffortId:'other'})])).rejects.toThrow();
    contributions[0].statusId='SESSION_ASSIGNED';
    await expect(useInventoryCountReview().submit([request()])).rejects.toThrow('not ready');
    expect(posts).toHaveLength(0);
  });
  it('allows rejecting an uncounted product without turning it into zero',async()=>{
    contributions.forEach(r=>r.counted=null);
    await useInventoryCountReview().submit([request({countedQuantity:null,varianceQuantity:null,decisionOutcomeEnumId:'SKIPPED'})]);
    expect(posts[0].inventoryCountProductsList[0].countedQuantity).toBeNull();
  });
  it('never approves an uncounted product',async()=>{
    contributions.forEach(r=>r.counted=null);
    await expect(useInventoryCountReview().submit([request({countedQuantity:null,varianceQuantity:null})])).rejects.toThrow();
    expect(posts).toHaveLength(0);
  });
  it('loads all contribution pages in stable order and fails on partial reads',async()=>{
    const rows=Array.from({length:501},(_,i)=>({productId:'p'+i,inventoryCountImportId:'s',counted:1,statusId:'SESSION_SUBMITTED'}));
    vi.mocked(api).mockImplementation(async(r:any)=>({data:r.url.endsWith('/reviews')? rows.slice(r.params.pageIndex*500,(r.params.pageIndex+1)*500).map(v=>({...v,quantity:2,numberOfSessions:1})) : rows.slice(r.params.pageIndex*500,(r.params.pageIndex+1)*500)} as any));
    expect((await useInventoryCountReview().load('w')).items).toHaveLength(501);
    expect(vi.mocked(api).mock.calls.some(([r]:any)=>r.params?.orderByField==='productId,inventoryCountImportId'&&r.params.pageIndex===1)).toBe(true);
    vi.mocked(api).mockResolvedValue({data:{_ERROR_MESSAGE_:'failed'}} as any);
    await expect(useInventoryCountReview().load('w')).rejects.toThrow();
  });
  it('does not mark an HTTP200 application error as approval success',async()=>{
    const original=vi.mocked(api).getMockImplementation()!;
    vi.mocked(api).mockImplementation(async(r:any)=>r.method==='post'?{data:{_ERROR_MESSAGE_:'failed'}} as any:original(r));
    await expect(useInventoryCountReview().submit([request()])).rejects.toThrow('approval failed');
  });
});
