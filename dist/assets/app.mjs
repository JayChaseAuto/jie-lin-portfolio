import {DCF_DEFAULTS,DCF_PRESETS,OPTION_DEFAULTS} from './models.mjs';
import {TAPE,vwapResult,valuationResult,optionsResult} from './views.mjs';
import {csv} from './render.mjs';
const page=document.body.dataset.page;
const form=document.querySelector('[data-lab-form]');
const mobile=window.matchMedia('(max-width:760px)');
const disclosure=document.querySelector('.control-disclosure');
if(disclosure){disclosure.open=!mobile.matches;mobile.addEventListener('change',event=>{disclosure.open=!event.matches;});}
let state;
const percentKeys=new Set(['growth','margin','tax','wacc','terminalGrowth','terminalReturnOnCapital','rate','dividend','volatility','jumpMean','jumpVolatility']);
function readForm(){const data=Object.fromEntries(new FormData(form));const out={};for(const [key,value] of Object.entries(data)){if(['type','side','preset'].includes(key))out[key]=value;else if(key==='startMinute'||key==='endMinute'){const [h,m]=value.split(':').map(Number);out[key]=h*60+m;}else out[key]=Number(value)/(percentKeys.has(key)?100:1);}return out;}
function setForm(inputs){for(const [key,value] of Object.entries(inputs)){const field=form.elements.namedItem(key);if(field)field.value=percentKeys.has(key)?Number((value*100).toFixed(8)):value;}}
function update(){const error=document.querySelector('[data-error]');try{if(!form.reportValidity())return;const inputs=readForm();state=page==='vwap'?vwapResult(inputs):page==='valuation'?valuationResult(inputs):optionsResult(inputs);state.inputs=inputs;document.querySelector('[data-results]').innerHTML=state.html;error.textContent='';document.querySelector('[data-status]').textContent='Calculations updated.';}catch(e){error.textContent=e.message;document.querySelector('[data-status]').textContent='Inputs need attention. Results retain the previous valid calculation.';}}
if(form){form.addEventListener('submit',event=>{event.preventDefault();update()});form.addEventListener('reset',()=>{setTimeout(()=>{if(page==='valuation')setForm(DCF_DEFAULTS);else if(page==='options')setForm(OPTION_DEFAULTS);update()},0)});const preset=form.elements.namedItem('preset');if(preset)preset.addEventListener('change',()=>{if(DCF_PRESETS[preset.value]){setForm(DCF_PRESETS[preset.value]);update()}});form.addEventListener('input',event=>{if(preset&&event.target!==preset)preset.value='custom'});update();}
function save(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
document.addEventListener('click',event=>{const button=event.target.closest('[data-download]');if(!button||!state)return;const what=button.dataset.download;
 if(what==='vwap')save('synthetic-vwap-window.csv',csv(['synthetic_data','seed','time_exchange_local','price_CAD','volume_units','cumulative_vwap_CAD'],state.result.chart.map(p=>[true,20260930,p.time,p.price,p.volume,p.cumulativeVWAP])),'text/csv;charset=utf-8');
 if(what==='forecast')save('fictional-business-forecast.csv',csv(['period','revenue_CAD_m','EBIT_CAD_m','NOPAT_CAD_m','reinvestment_CAD_m','FCFF_CAD_m','present_value_CAD_m'],[...state.result.forecast.map(p=>[`Year ${p.year}`,p.revenue,p.ebit,p.nopat,p.reinvestment,p.freeCashFlow,p.presentValue]),['Year 6 terminal',state.result.terminal.revenue,'',state.result.terminal.nopat,state.result.terminal.reinvestment,state.result.terminal.freeCashFlow,'']]),'text/csv;charset=utf-8');
 if(what==='assumptions')save('fictional-business-assumptions.json',JSON.stringify({provenance:'Fictional business; educational demonstration',units:'CAD millions; shares in millions; decimal rates',...state.result},null,2),'application/json');
 if(what==='options')save('illustrative-option-prices.csv',csv(['strike','black_scholes','merton','variance_matched_diffusion'],state.rows.map(p=>[p.strike,p.blackScholes.price,p.merton.price,p.varianceMatched.price])),'text/csv;charset=utf-8');
 if(what==='option-inputs')save('illustrative-option-assumptions.json',JSON.stringify({provenance:'Chosen risk-neutral parameters; no market calibration',units:'Years, decimal annual rates and volatilities; prices in currency units',inputs:state.inputs,results:state.result,pathSeed:1976},null,2),'application/json');
});
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
