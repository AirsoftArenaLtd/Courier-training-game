// Select the public Low URL fixture without changing Claude's QA tool or its assertions.
const pp=require('puppeteer-core'),launch=pp.launch.bind(pp);
pp.launch=async(...args)=>{
 const b=await launch(...args),newPage=b.newPage.bind(b);
 b.newPage=async()=>{
  const p=await newPage(),goto=p.goto.bind(p);
  p.goto=(url,...opts)=>{const u=new URL(url);if(['localhost','127.0.0.1'].includes(u.hostname)&&u.pathname.endsWith('/index.html'))u.searchParams.set('gfx','low');return goto(u.href,...opts);};
  return p;
 };
 return b;
};
