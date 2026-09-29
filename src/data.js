// 所有记录都是固定种子的演示数据；聚合指标与联动视图使用同一份记录。
export const regions = ['全球', '欧洲', '北美', '东南亚', '中东', '拉美', '非洲'];
export const channels = ['P4P', 'RFQ', 'LinkedIn', '官网 SEO'];
export const salespeople = ['业务员 A', '业务员 B', '业务员 C', '业务员 D', '业务员 E'];
export const stages = ['询盘 / RFQ', '报价 PI', '定金到账', '生产验货', '订舱交单', '尾款结汇'];
const countrySets = [['德国','法国','英国','意大利','西班牙','荷兰','波兰','瑞典'],['美国','加拿大','墨西哥','哥斯达黎加'],['新加坡','马来西亚','泰国','越南'],['阿联酋','沙特阿拉伯','卡塔尔','科威特'],['巴西','智利','秘鲁','阿根廷'],['南非','肯尼亚','埃及','摩洛哥']];
export const customerData = Array.from({length:386}, (_,i) => ({
 id:`C${String(i+1).padStart(3,'0')}`, name:`${regions[1+i%6]}客户 ${String(i+1).padStart(3,'0')}`,
 region:regions[1+i%6], tier:i<72?'A':i<268?'B':'C', days:i<48?61+i%32:3+i%57,
 country:countrySets[i%6][Math.floor(i/6)%countrySets[i%6].length],
}));
export const orders = Array.from({length:128}, (_,i) => ({
 id:i===0?'DE-260918':i===1?'US-260905':`EX-26${String(1000+i)}`,
 customerId:customerData[i].id, region:customerData[i].region, customer:customerData[i].name,
 amount:i===0?86500:i===1?64200:12000+(i*1731)%20800,
 stage:i===0?4:i===1?5:2+i%4, owner:salespeople[i%5], stagnant:(i>=2&&i<12)||i%13===0?9:i%6,
 settlement:i===0?'L/C':i%10<6?'T/T':i%10<9?'L/C':'O/A',
 risk:i===0?'lc':i===1?'overdue':i<12?'stalled':null,
}));
export const leads = Array.from({length:960},(_,i)=>({
 id:`L${i+1}`, region:regions[1+i%6], channel:channels[Math.floor(i/6)%20<8?0:Math.floor(i/6)%20<13?1:Math.floor(i/6)%20<17?2:3], owner:salespeople[i%15<5?0:i%15<9?1:i%15<12?2:i%15<14?3:4],
 response:i%19===0?4.2+(i%4)*0.4:0.25+(i%9)*0.1,
 converted:(i*37%100)<[16,32,25,29][Math.floor(i/6)%20<8?0:Math.floor(i/6)%20<13?1:Math.floor(i/6)%20<17?2:3],
 views:20+i%12, impressions:600+(i*13)%500,
}));
export function inRegion(records, region){return region==='全球'?records:records.filter(item=>item.region===region);}
export function aggregate(region='全球', assignments={}, handled=[]){
 const scopedOrders=inRegion(orders,region).map(o=>({...o, owner:assignments[o.id]||o.owner}));
 const scopedLeads=inRegion(leads,region).map(l=>({...l,owner:assignments[l.id]||l.owner}));
 const customers=inRegion(customerData,region);
 const risks=scopedOrders.filter(o=>o.risk&&!handled.includes(o.id));
 const team=salespeople.map(name=>{
  const items=scopedLeads.filter(l=>l.owner===name);
  const overdue=items.filter(l=>l.response>4&&!assignments[l.id]);
  const stalled=scopedOrders.filter(o=>o.owner===name&&o.stagnant>7&&!assignments[o.id]);
  return {name,count:items.length,response:items.length?items.reduce((s,l)=>s+l.response,0)/items.length:0,
   conversion:items.length?items.filter(l=>l.converted).length/items.length*100:0,overdue,stalled};
 });
 const traffic=channels.map(name=>{
  const items=scopedLeads.filter(l=>l.channel===name), converted=items.filter(l=>l.converted).length;
  const views=items.reduce((s,l)=>s+l.views,0), impressions=items.reduce((s,l)=>s+l.impressions,0);
  const conversion=items.length?converted/items.length*100:0, ctr=impressions?views/impressions*100:0;
  return {name,count:items.length,converted,views,impressions,conversion,ctr,warning:conversion<20||ctr<3};
 });
 const revenue=scopedOrders.reduce((s,o)=>s+o.amount,0);
 return {orders:scopedOrders,leads:scopedLeads,customers,risks,team,traffic,revenue,
  conversion:scopedLeads.length?scopedLeads.filter(l=>l.converted).length/scopedLeads.length*100:0,
  dormant:customers.filter(c=>c.days>60),
  pipeline:[scopedLeads.length,scopedLeads.filter(l=>l.converted).length,...[2,3,4,5].map(s=>scopedOrders.filter(o=>o.stage>=s).length)],
  settlements:['T/T','L/C','O/A'].map(name=>({name,amount:scopedOrders.filter(o=>o.settlement===name).reduce((s,o)=>s+o.amount,0)}))};
}
export function getReassignment(data, name, assignments){
 const source=data.team.find(t=>t.name===name);
 if(!source||(!source.overdue.length&&!source.stalled.length))return null;
 const target=[...data.team].filter(t=>t.name!==name).sort((a,b)=>a.count-b.count)[0];
 const updates={...assignments};
 [...source.overdue,...source.stalled].forEach(item=>{updates[item.id]=target.name;});
 return {assignments:updates,target:target.name,count:source.overdue.length+source.stalled.length};
}
export const slaData=[
 {name:'首响',unit:'小时',current:1.2,target:4,rate:94,icon:'message'},
 {name:'报价',unit:'小时',current:18.6,target:24,rate:91,icon:'file'},
 {name:'审证',unit:'小时',current:28.4,target:24,rate:78,icon:'shield'},
 {name:'交单',unit:'天',current:3.8,target:5,rate:92,icon:'send'},
 {name:'回款',unit:'天',current:38.2,target:30,rate:76,icon:'wallet'},
];
export const money=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(n);
