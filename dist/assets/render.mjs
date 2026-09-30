export const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt = (v, digits=2) => Number.isFinite(v) ? v.toLocaleString('en-CA',{minimumFractionDigits:digits,maximumFractionDigits:digits}) : '—';
export const pct = (v,d=1) => Number.isFinite(v) ? `${fmt(v*100,d)}%` : '—';
export const colours = ['#076e67','#ad582b','#486b9a','#867239','#254753','#ab5570'];
let figureId=0;
export function lineChart({series,width=760,height=280,xLabel='',yLabel='',xFormat=v=>fmt(v,0),yFormat=v=>fmt(v,1),title='Chart',description='',dark=false}) {
 const id=`figure-${++figureId}`; const points=series.flatMap(s=>s.points).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 if(!points.length)return '<div class="chart-empty">No observations in this window.</div>';
 const left=58,right=17,top=24,bottom=42; const xmin=Math.min(...points.map(p=>p.x)),xmax=Math.max(...points.map(p=>p.x));
 let ymin=Math.min(...points.map(p=>p.y)),ymax=Math.max(...points.map(p=>p.y));const pad=(ymax-ymin||Math.max(1,Math.abs(ymin)*.1))*.12;ymin=ymin>=0?Math.max(0,ymin-pad):ymin-pad;ymax+=pad;
 const x=v=>left+(v-xmin)/(xmax-xmin||1)*(width-left-right),y=v=>top+(ymax-v)/(ymax-ymin)*(height-top-bottom);
 const grid=Array.from({length:5},(_,i)=>{const v=ymin+(ymax-ymin)*i/4;return `<line class="grid-line" x1="${left}" x2="${width-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-10}" y="${y(v)+4}" text-anchor="end">${esc(yFormat(v))}</text>`}).join('');
 const ticks=Array.from({length:5},(_,i)=>{const v=xmin+(xmax-xmin)*i/4;return `<text x="${x(v)}" y="${height-22}" text-anchor="middle">${esc(xFormat(v))}</text>`}).join('');
 const lines=series.map((s,i)=>`<path d="${s.points.map((p,j)=>`${j?'L':'M'}${x(p.x).toFixed(2)},${y(p.y).toFixed(2)}`).join(' ')}" fill="none" stroke="${s.color||colours[i%colours.length]}" stroke-width="${s.width||2.4}" ${s.dash?`stroke-dasharray="${s.dash}"`:''} stroke-linejoin="round"/>`).join('');
 return `<div class="chart-frame" tabindex="0" role="region" aria-label="Scrollable chart"><svg class="chart${dark?' chart-dark':''}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(title)}</title><desc id="${id}-desc">${esc(description||series.map(s=>s.name).join(', '))}</desc>${grid}${ticks}${lines}<text class="axis-label" x="${left}" y="13">${esc(yLabel)}</text><text class="axis-label" x="${width-right}" y="${height-2}" text-anchor="end">${esc(xLabel)}</text></svg></div>`;
}
export function barChart({points,width=760,height=180,title='Bar chart',yLabel='',color=colours[0],xFormat=v=>v}) {
 const id=`figure-${++figureId}`,left=58,right=17,top=23,bottom=36;const min=Math.min(0,...points.map(p=>p.y)),max=Math.max(0,...points.map(p=>p.y));const range=max-min||1;
 const y=v=>top+(max-v)/range*(height-top-bottom),step=(width-left-right)/Math.max(1,points.length);const w=Math.max(.4,step*.7);
 return `<div class="chart-frame" tabindex="0" role="region" aria-label="Scrollable chart"><svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}"><title id="${id}">${esc(title)}</title>${[0,.5,1].map(t=>{const v=min+range*t;return `<line class="grid-line" x1="${left}" x2="${width-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-9}" y="${y(v)+4}" text-anchor="end">${esc(fmt(v,0))}</text>`}).join('')}${points.map((p,i)=>`<rect x="${left+step*i+(step-w)/2}" y="${y(Math.max(0,p.y))}" width="${w}" height="${Math.max(.5,Math.abs(y(p.y)-y(0)))}" fill="${p.color||color}"/>${points.length<12||i%Math.ceil(points.length/5)===0?`<text x="${left+step*(i+.5)}" y="${height-15}" text-anchor="middle">${esc(xFormat(p.x))}</text>`:''}`).join('')}<text x="${left}" y="13">${esc(yLabel)}</text></svg></div>`;
}
export const legend=series=>`<div class="legend">${series.map((s,i)=>`<span><i style="border-color:${s.color||colours[i%colours.length]};${s.dash?'border-top-style:dashed':''}"></i>${esc(s.name)}</span>`).join('')}</div>`;
export function table(headers,rows,{caption='',tall=false}={}) {return `<div class="table-scroll${tall?' table-tall':''}" tabindex="0" role="region" aria-label="${esc(caption||'Data table')}"><table class="data-table">${caption?`<caption>${esc(caption)}</caption>`:''}<thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((c,i)=>i===0?`<th scope="row">${esc(c)}</th>`:`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
export const metric=(label,value,note='',teal=false)=>`<div class="metric"><span class="metric-label">${esc(label)}</span><strong class="metric-value${teal?' teal':''}">${esc(value)}</strong><span class="metric-note">${esc(note)}</span></div>`;
export const timeLabel=minute=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(Math.floor(minute%60)).padStart(2,'0')}`;
export const figure=(n,title,graphic,caption)=>`<figure class="figure">${graphic}<figcaption><strong>Figure ${n}. ${esc(title)}</strong> ${esc(caption)}</figcaption></figure>`;
export function csv(headers,rows){return [headers,...rows].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n');}
