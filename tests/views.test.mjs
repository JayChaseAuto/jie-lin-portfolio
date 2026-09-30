import test from 'node:test';
import assert from 'node:assert/strict';
import {vwapResult,valuationResult,optionsResult} from '../dist/assets/views.mjs';
import {DCF_DEFAULTS,OPTION_DEFAULTS} from '../dist/assets/models.mjs';
import {csv} from '../dist/assets/render.mjs';

test('VWAP display data is window-specific and handles empty selections',()=>{
 const selected=vwapResult({startMinute:600,endMinute:660,side:'sell',executionPrice:105});
 assert.equal(selected.result.count,120);
 assert.ok(selected.result.chart.every(row=>row.minute>=600&&row.minute<660));
 assert.ok(!/NaN|undefined/.test(selected.html));
 const empty=vwapResult({startMinute:960,endMinute:960});
 assert.equal(empty.result.vwap,null);
 assert.match(empty.html,/No trades fall in the selected window/);
});
test('sensitivity grid recalculates the centre case and marks invalid combinations',()=>{
 const base=valuationResult();
 assert.equal(base.sensitivity[2][2],base.result.valuePerShare);
 const lowSpread=valuationResult({...DCF_DEFAULTS,wacc:.026});
 assert.ok(lowSpread.sensitivity.flat().some(value=>value===null));
 assert.ok(!/NaN|undefined/.test(lowSpread.html));
});
test('options table and chart source contain the displayed at-the-money result',()=>{
 for(const type of ['call','put']){
 const view=optionsResult({...OPTION_DEFAULTS,type});
 const atm=view.rows.find(row=>row.strike===100);
 assert.equal(atm.merton.price,view.result.merton.price);
 assert.equal(atm.blackScholes.price,view.result.blackScholes.price);
 assert.ok(!/NaN|undefined/.test(view.html));
 }
 assert.doesNotThrow(()=>optionsResult({...OPTION_DEFAULTS,maturity:0}));
});
test('CSV escapes fields and preserves numeric precision for reproduction',()=>{
 assert.equal(csv(['label','value'],[['A "quoted", label',1.23456789]]),'"label","value"\r\n"A ""quoted"", label","1.23456789"');
});
