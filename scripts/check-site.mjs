import {readdir,readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
async function walk(path){const entries=await readdir(path,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(resolve(path,e.name)):[resolve(path,e.name)]))).flat();}
const files=await walk(root);let pages=0,links=0;
for(const file of files.filter(f=>f.endsWith('.html'))){pages++;const html=await readFile(file,'utf8');if(!html.includes('<main id="main"')||!html.includes('lang="en"'))throw new Error(`Missing page landmarks: ${file}`);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw new Error(`Duplicate IDs: ${file}`);
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){const link=match[1];if(/^(https?:|data:|mailto:)/.test(link))continue;const [path,hash]=link.split('#');const target=path?resolve(path.startsWith('/')?root:dirname(file),path.replace(/^\//,'')):file;let actual=target;try{const s=await stat(actual);if(s.isDirectory())actual=resolve(actual,'index.html');await stat(actual);}catch{throw new Error(`Broken link ${link} in ${file}`)}if(hash){const dest=await readFile(actual,'utf8');if(!dest.includes(`id="${hash}"`))throw new Error(`Missing fragment ${link} in ${file}`);}links++;}
 if(/NaN|undefined|\{\{/.test(html))throw new Error(`Unresolved output in ${file}`);
}
console.log(`Verified ${pages} pages, ${links} local links/assets, unique IDs and resolved output.`);
