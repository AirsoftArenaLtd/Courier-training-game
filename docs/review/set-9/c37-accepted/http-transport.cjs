/* Environment-only QA transport. No Chromium policy changes and no product/test edits.
 * Legacy suites use file URLs; serve the same repository files through the
 * permitted local HTTP server instead. Actual file-protocol launch remains untested.
 */
const {CdpPage}=require('/workspace/Courier-training-game/test/node_modules/puppeteer-core/lib/cjs/puppeteer/cdp/Page.js');
const original=CdpPage.prototype.goto;
CdpPage.prototype.goto=function(url,...args){
 const parsed=new URL(url);
 if(parsed.protocol==='file:'){
  const root='/workspace/c37-replay/';const file=decodeURIComponent(parsed.pathname);
  if(!file.startsWith(root))throw Error('QA adapter only serves this repository.');
  url=(process.env.QA_BASE||'http://127.0.0.1:8347').replace(/\/$/,'')+'/'+file.slice(root.length)+parsed.search+parsed.hash;
  console.log('[QA HTTP transport]',url);
 }
 return original.call(this,url,...args);
};
