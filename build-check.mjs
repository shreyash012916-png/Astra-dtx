import fs from 'node:fs/promises';
const required=['index.html','app.js','styles.css','server.js','analyzer.js','ffmpeg.js','gemini.js','timeline.js','job-manager.js','storage-store.js'];
for(const file of required){await fs.access(file);}
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
if(pkg.type!=='module')throw new Error('package.json must use ES modules.');
console.log(`CUTFLOW build check passed: ${required.length} source files present.`);
