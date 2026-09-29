import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregate,regions,getReassignment} from './data.js';

test('区域汇总与全球金额、客户、商机一致',()=>{
 const all=aggregate(), parts=regions.slice(1).map(r=>aggregate(r));
 for(const field of ['revenue'])assert.equal(parts.reduce((s,p)=>s+p[field],0),all[field]);
 for(const field of ['orders','customers','leads','risks'])assert.equal(parts.reduce((s,p)=>s+p[field].length,0),all[field].length);
 assert.equal(all.settlements.reduce((s,p)=>s+p.amount,0),all.revenue);
 assert.equal(all.traffic.reduce((s,t)=>s+t.count,0),all.leads.length);
 assert.equal(all.dormant.length,48);
 assert.ok(all.dormant.every(c=>c.days>60));
});
test('风险受理后只从待处理移出，原订单保留',()=>{
 const before=aggregate(),after=aggregate('全球',{},['DE-260918']);
 assert.equal(after.risks.length,before.risks.length-1);
 assert.equal(after.orders.length,before.orders.length);
 assert.equal(after.orders.find(o=>o.id==='DE-260918').risk,'lc');
});
test('重分配保持总量且保留首响耗时，不重复分配同一异常',()=>{
 const data=aggregate('欧洲'),source=data.team.find(t=>t.overdue.length+t.stalled.length);
 const result=getReassignment(data,source.name,{}),after=aggregate('欧洲',result.assignments);
 assert.notEqual(result.target,source.name);
 assert.equal(after.leads.length,data.leads.length);
 assert.equal(after.team.reduce((s,t)=>s+t.count,0),data.leads.length);
 assert.equal(after.team.find(t=>t.name===source.name).overdue.length,0);
 for(const lead of source.overdue){const updated=after.leads.find(l=>l.id===lead.id);assert.equal(updated.owner,result.target);assert.equal(updated.response,lead.response);}
 assert.equal(getReassignment(after,source.name,result.assignments),null);
 const other=aggregate('北美',result.assignments);assert.ok(other.leads.every(l=>!result.assignments[l.id]));
});
