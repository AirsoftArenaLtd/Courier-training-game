// node save.js <out.png>  < playd /eval JSON whose value is a PNG data URL (or has .url)
let s = ''; process.stdin.on('data', d => s += d).on('end', () => {
  const j = JSON.parse(s); const v = j.value && j.value.url !== undefined ? j.value.url : j.value;
  if (typeof v !== 'string') { console.log(JSON.stringify(j).slice(0, 400)); return; }
  require('fs').writeFileSync(process.argv[2], Buffer.from(v.split(',')[1], 'base64'));
  if (j.value && j.value.url !== undefined) { const o = Object.assign({}, j.value); delete o.url; console.log(JSON.stringify(o)); }
});
