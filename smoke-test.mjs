import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
const root=process.cwd(),tmp=path.join(root,'tmp-smoke');await fs.rm(tmp,{recursive:true,force:true});await fs.mkdir(tmp,{recursive:true});
async function run(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','pipe','pipe']});let o='',e='';p.stdout.on('data',d=>o+=d);p.stderr.on('data',d=>e+=d);p.on('error',reject);p.on('close',c=>c?reject(new Error(`${cmd} ${args.join(' ')}\n${e}`)):resolve(o))})}
const video=path.join(tmp,'sample.mp4'),audio=path.join(tmp,'sample.wav');
await run('ffmpeg',['-y','-f','lavfi','-i','testsrc2=size=640x360:rate=30:duration=5','-c:v','libx264','-pix_fmt','yuv420p',video]);
await run('ffmpeg',['-y','-f','lavfi','-i','sine=frequency=440:sample_rate=44100:duration=5','audio.wav'.startsWith('audio')?'-c:a':'-c:a','pcm_s16le',audio]);
const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'18080',CUTFLOW_STORAGE_DIR:path.join(tmp,'store')}});await sleep(800);
try{
 let r=await fetch('http://127.0.0.1:18080/');if(!r.ok||!(await r.text()).includes('CUTFLOW'))throw new Error('frontend route failed');
 r=await fetch('http://127.0.0.1:18080/health');if(!r.ok)throw new Error(`health ${r.status}`);let h=await r.json();if(h.status!=='ok'||!h.ffmpeg)throw new Error('health payload invalid');
 r=await fetch('http://127.0.0.1:18080/api/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({theme:'cinematic',aspectRatio:'9:16',instruction:'keep it restrained'})});let p=await r.json();if(!r.ok)throw new Error(p.error);const id=p.id;
 for(const [endpoint,file,mime] of [['/source-video',video,'video/mp4'],['/source-audio',audio,'audio/wav']]){const buf=await fs.readFile(file);r=await fetch(`http://127.0.0.1:18080/api/projects/${id}${endpoint}`,{method:'PUT',headers:{'content-type':mime,'content-length':String(buf.length),'x-file-name':path.basename(file)},body:buf});if(!r.ok)throw new Error((await r.text())||`upload failed ${endpoint}`)}
 r=await fetch(`http://127.0.0.1:18080/api/projects/${id}/create`,{method:'POST'});if(!r.ok)throw new Error(await r.text());
 for(let i=0;i<80;i++){await sleep(500);r=await fetch(`http://127.0.0.1:18080/api/projects/${id}`);p=await r.json();if(p.status==='complete')break;if(p.status==='error')throw new Error(p.error)}
 if(p.status!=='complete')throw new Error('job timeout');if(!p.output?.valid)throw new Error('invalid output');
 r=await fetch(`http://127.0.0.1:18080/api/projects/${id}/events`);if(!r.ok)throw new Error('SSE route failed');const reader=r.body.getReader();const chunk=await reader.read();if(!new TextDecoder().decode(chunk.value).includes('event: update'))throw new Error('SSE payload invalid');reader.cancel();
 r=await fetch(`http://127.0.0.1:18080/api/projects/${id}/commands`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command:'remove flashy transitions and make it darker'})});if(!r.ok)throw new Error(await r.text());p=await r.json();if((p.versions||[]).length<2)throw new Error('version command failed');
 const out=path.join(tmp,'download.mp4');const resp=await fetch(`http://127.0.0.1:18080/api/projects/${id}/output`);if(!resp.ok)throw new Error(`output ${resp.status}`);await fs.writeFile(out,Buffer.from(await resp.arrayBuffer()));const st=await fs.stat(out);if(st.size<1000)throw new Error('download too small');
 console.log('SMOKE_TEST_OK',JSON.stringify({id,duration:p.output.duration,bytes:st.size,ai:p.versions?.[0]?.aiAvailable||false}));
}finally{proc.kill('SIGTERM');await sleep(200);await fs.rm(tmp,{recursive:true,force:true})}
