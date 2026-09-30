/**
 * Reproducible educational financial models. Rates are decimal, time is years.
 * Synthetic examples are not fitted estimates or investment recommendations.
 * Source references and assumptions appear in the accompanying research note.
 */
export const OPTION_DEFAULTS = Object.freeze({ spot: 100, strike: 100, maturity: 1, rate: 0.04, dividend: 0.01, volatility: 0.2, jumpIntensity: 0.5, jumpMean: -0.05, jumpVolatility: 0.15, type: 'call' });
export const DCF_DEFAULTS = Object.freeze({ revenue: 100, growth: 0.08, margin: 0.18, tax: 0.25, salesToCapital: 2, wacc: 0.1, terminalGrowth: 0.025, terminalReturnOnCapital: 0.12, cash: 15, debt: 25, shares: 10 });
export const DCF_PRESETS = Object.freeze({ base: DCF_DEFAULTS, downside: Object.freeze({ ...DCF_DEFAULTS, growth: 0.04, margin: 0.14, wacc: 0.12 }), upside: Object.freeze({ ...DCF_DEFAULTS, growth: 0.12, margin: 0.22, wacc: 0.09 }) });

function range(value, name, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be a finite number between ${min} and ${max}.`);
  return value;
}
function integer(value, name, min, max) {
  range(value, name, min, max);
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer.`);
  return value;
}

/** Mulberry32, with Box–Muller normals; no dependency on ambient Math.random. */
export function createRandom(seed = 1976) {
  integer(seed, 'seed', 0, 0xffffffff);
  let state = seed >>> 0;
  let spare = null;
  const uniform = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => {
    if (spare !== null) { const result = spare; spare = null; return result; }
    const radius = Math.sqrt(-2 * Math.log(1 - uniform()));
    const angle = 2 * Math.PI * uniform();
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
  const poisson = mean => {
    if (mean === 0) return 0;
    const stop = Math.exp(-mean);
    let product = 1, n = 0;
    do { product *= 1 - uniform(); n++; } while (product > stop);
    return n - 1;
  };
  return { uniform, normal, poisson };
}

function timeLabel(minute) {
  const seconds = Math.round(minute * 60);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
}

export function generateTradeTape({ seed = 20260930, count = 780 } = {}) {
  integer(count, 'count', 2, 5000);
  const random = createRandom(seed);
  let price = 100;
  return Array.from({ length: count }, (_, id) => {
    const fraction = id / count;
    const minute = 570 + fraction * 390;
    price *= Math.exp(0.00008 + 0.0008 * random.normal() + 0.00018 * Math.sin(fraction * 12));
    const volumeProfile = 1 + 2.6 * Math.pow(2 * fraction - 1, 4);
    const volume = Math.round((100 + random.uniform() * 650) * volumeProfile / 10) * 10;
    return { id: id + 1, minute, time: timeLabel(minute), price: Math.round(price * 100) / 100, volume };
  });
}

/** Start-inclusive/end-exclusive selection; volume is traded units. */
export function analyzeVWAP(trades, { startMinute = 570, endMinute = 960, side = 'buy', executionPrice } = {}) {
  if (!Array.isArray(trades)) throw new Error('Trades must be an array.');
  range(startMinute, 'window start', 570, 960);
  range(endMinute, 'window end', 570, 960);
  if (endMinute < startMinute) throw new Error('Window end must be at or after its start.');
  if (!['buy', 'sell'].includes(side)) throw new Error('Side must be buy or sell.');
  if (executionPrice !== undefined) range(executionPrice, 'execution price', 0.000001, 10000000);
  trades.forEach(trade => { range(trade.minute, 'trade minute', 570, 960); range(trade.price, 'trade price', 0.000001, 10000000); range(trade.volume, 'trade volume', 0, 1000000000); });
  const selected = trades.filter(trade => trade.minute >= startMinute && trade.minute < endMinute).sort((a, b) => a.minute - b.minute);
  let volume = 0, notional = 0;
  const chart = selected.map(trade => {
    volume += trade.volume;
    notional += trade.price * trade.volume;
    return { ...trade, time: trade.time ?? timeLabel(trade.minute), cumulativeVWAP: volume > 0 ? notional / volume : null };
  });
  const vwap = volume > 0 ? notional / volume : null;
  const executionCostBps = vwap !== null && executionPrice !== undefined ? (side === 'buy' ? 1 : -1) * (executionPrice - vwap) / vwap * 10000 : null;
  const message = !selected.length ? 'No trades fall in the selected window.' : volume === 0 ? 'The selected window has zero traded volume; VWAP is undefined.' : '';
  return { trades: selected, chart, count: selected.length, volume, notional, vwap, executionCostBps, message, startMinute, endMinute, side };
}

export function calculateDCF(inputs = {}) {
  const p = { ...DCF_DEFAULTS, ...inputs };
  range(p.revenue, 'revenue', 0.01, 1000000); range(p.growth, 'growth', -0.5, 1);
  range(p.margin, 'EBIT margin', 0, 0.8); range(p.tax, 'tax rate', 0, 0.6);
  range(p.salesToCapital, 'sales-to-capital ratio', 0.1, 20); range(p.wacc, 'WACC', 0.001, 0.5);
  range(p.terminalGrowth, 'terminal growth', 0, 0.1); range(p.terminalReturnOnCapital, 'terminal return on capital', 0.001, 0.8);
  range(p.cash, 'cash', 0, 1000000); range(p.debt, 'debt', 0, 1000000); range(p.shares, 'diluted shares', 0.001, 1000000);
  if (p.wacc <= p.terminalGrowth) throw new Error('WACC must exceed terminal growth.');
  if (p.terminalGrowth > p.terminalReturnOnCapital) throw new Error('Terminal growth cannot exceed terminal return on capital in this simplified model.');
  let previousRevenue = p.revenue;
  const forecast = Array.from({ length: 5 }, (_, index) => {
    const year = index + 1, revenue = previousRevenue * (1 + p.growth), ebit = revenue * p.margin, nopat = ebit * (1 - p.tax);
    const reinvestment = (revenue - previousRevenue) / p.salesToCapital;
    const freeCashFlow = nopat - reinvestment, discountFactor = (1 + p.wacc) ** -year;
    previousRevenue = revenue;
    return { year, revenue, ebit, nopat, reinvestment, freeCashFlow, discountFactor, presentValue: freeCashFlow * discountFactor };
  });
  const terminalRevenue = previousRevenue * (1 + p.terminalGrowth);
  const terminalNopat = terminalRevenue * p.margin * (1 - p.tax);
  const terminalReinvestment = terminalNopat * p.terminalGrowth / p.terminalReturnOnCapital;
  const terminalFreeCashFlow = terminalNopat - terminalReinvestment;
  const terminalValue = terminalFreeCashFlow / (p.wacc - p.terminalGrowth);
  const terminalPresentValue = terminalValue / (1 + p.wacc) ** 5;
  const forecastPresentValue = forecast.reduce((sum, row) => sum + row.presentValue, 0);
  const enterpriseValue = forecastPresentValue + terminalPresentValue;
  const equityValue = enterpriseValue + p.cash - p.debt;
  return { inputs: p, forecast, terminal: { revenue: terminalRevenue, nopat: terminalNopat, reinvestment: terminalReinvestment, freeCashFlow: terminalFreeCashFlow, value: terminalValue, presentValue: terminalPresentValue }, forecastPresentValue, enterpriseValue, equityValue, valuePerShare: equityValue / p.shares, terminalContribution: enterpriseValue === 0 ? null : terminalPresentValue / enterpriseValue };
}

export function validateOptionInputs(inputs = {}) {
  const p = { ...OPTION_DEFAULTS, ...inputs };
  range(p.spot, 'spot', 0.01, 100000); range(p.strike, 'strike', 0.01, 100000);
  range(p.maturity, 'maturity', 0, 5); range(p.rate, 'rate', -0.05, 0.3); range(p.dividend, 'dividend yield', 0, 0.2);
  range(p.volatility, 'diffusion volatility', 0, 1.5); range(p.jumpIntensity, 'jump intensity', 0, 5);
  range(p.jumpMean, 'mean log jump', -1, 1); range(p.jumpVolatility, 'jump volatility', 0, 1);
  if (!['call', 'put'].includes(p.type)) throw new Error('Option type must be call or put.');
  return p;
}

/** Positive-term integral series; saturation beyond 8 has < 6.3e-16 absolute error. */
export function normalCDF(x) {
  if (x <= -8) return 0;
  if (x >= 8) return 1;
  const positive = Math.abs(x);
  let term = positive, sum = term;
  for (let denominator = 3; denominator < 401; denominator += 2) {
    term *= positive * positive / denominator;
    const next = sum + term;
    if (next === sum) break;
    sum = next;
  }
  const integral = sum * Math.exp(-0.5 * positive * positive) / Math.sqrt(2 * Math.PI);
  return Math.max(0, Math.min(1, x >= 0 ? 0.5 + integral : 0.5 - integral));
}

function diffusionPrices(p, volatility) {
  const asset = p.spot * Math.exp(-p.dividend * p.maturity), bond = p.strike * Math.exp(-p.rate * p.maturity);
  const deviation = volatility * Math.sqrt(p.maturity);
  if (deviation === 0) return { call: Math.max(asset - bond, 0), put: Math.max(bond - asset, 0) };
  const d1 = (Math.log(p.spot / p.strike) + (p.rate - p.dividend + 0.5 * volatility * volatility) * p.maturity) / deviation;
  const d2 = d1 - deviation;
  return { call: Math.max(0, asset * normalCDF(d1) - bond * normalCDF(d2)), put: Math.max(0, bond * normalCDF(-d2) - asset * normalCDF(-d1)) };
}

export function blackScholes(inputs = {}) {
  const p = validateOptionInputs(inputs), result = diffusionPrices(p, p.volatility);
  return { ...result, price: result[p.type] };
}

/**
 * Bound sum_{j=n+1}^infinity Pois(mean)[j] by the first omitted term
 * times a geometric series: later probability ratios <= mean/(n+2).
 */
function poissonTailBound(probabilityN, mean, n) {
  if (mean === 0) return 0;
  if (n + 2 <= mean) return 1;
  return Math.min(1, probabilityN * mean / (n + 1) / (1 - mean / (n + 2)));
}

export function mertonPrice(inputs = {}, { tolerance = 1e-10 } = {}) {
  const p = validateOptionInputs(inputs);
  range(tolerance, 'absolute price tolerance', 1e-12, 0.01);
  const mean = p.jumpIntensity * p.maturity;
  const jumpMoment = Math.exp(p.jumpMean + 0.5 * p.jumpVolatility ** 2), kappa = jumpMoment - 1;
  const tiltedMean = mean * jumpMoment;
  const asset = p.spot * Math.exp(-p.dividend * p.maturity), bond = p.strike * Math.exp(-p.rate * p.maturity);
  let probability = Math.exp(-mean), tiltedProbability = Math.exp(-tiltedMean);
  let call = 0, put = 0;
  for (let n = 0; n < 2000; n++) {
    const variance = p.volatility ** 2 * p.maturity + n * p.jumpVolatility ** 2;
    const logMoneyness = Math.log(p.spot / p.strike) + (p.rate - p.dividend - p.jumpIntensity * kappa - 0.5 * p.volatility ** 2) * p.maturity + n * p.jumpMean;
    const assetTerm = asset * tiltedProbability, bondTerm = bond * probability;
    if (variance === 0) {
      call += Math.max(assetTerm - bondTerm, 0);
      put += Math.max(bondTerm - assetTerm, 0);
    } else {
      const deviation = Math.sqrt(variance), d2 = logMoneyness / deviation, d1 = d2 + deviation;
      call += Math.max(0, assetTerm * normalCDF(d1) - bondTerm * normalCDF(d2));
      put += Math.max(0, bondTerm * normalCDF(-d2) - assetTerm * normalCDF(-d1));
    }
    const probabilityTailBound = poissonTailBound(probability, mean, n);
    const assetTailBound = poissonTailBound(tiltedProbability, tiltedMean, n);
    const callTailBound = asset * assetTailBound, putTailBound = bond * probabilityTailBound;
    if (Math.max(callTailBound, putTailBound) <= tolerance) {
      return { call, put, price: p.type === 'call' ? call : put, terms: n + 1, probabilityTailBound, assetTailBound, callTailBound, putTailBound, priceTailBound: p.type === 'call' ? callTailBound : putTailBound };
    }
    probability *= mean / (n + 1);
    tiltedProbability *= tiltedMean / (n + 1);
  }
  throw new Error('Poisson series did not reach the requested truncation tolerance.');
}

export function optionComparison(inputs = {}) {
  const p = validateOptionInputs(inputs);
  const matchedVolatility = Math.sqrt(p.volatility ** 2 + p.jumpIntensity * (p.jumpMean ** 2 + p.jumpVolatility ** 2));
  const matched = diffusionPrices(p, matchedVolatility);
  return { blackScholes: blackScholes(p), merton: mertonPrice(p), varianceMatched: { ...matched, price: matched[p.type] }, matchedVolatility };
}

function runningStats() {
  let count = 0, mean = 0, m2 = 0;
  return { add(value) { count++; const delta = value - mean; mean += delta / count; m2 += delta * (value - mean); }, result() { const standardError = count > 1 ? Math.sqrt(m2 / (count - 1) / count) : 0; return { price: mean, standardError, ci95: [mean - 1.96 * standardError, mean + 1.96 * standardError] }; } };
}

/** Independent exact-terminal simulation: sampling uncertainty, no time-step bias. */
export function monteCarloMerton(inputs = {}, { paths = 100000, seed = 1976 } = {}) {
  const p = validateOptionInputs(inputs);
  integer(paths, 'Monte Carlo paths', 1000, 2000000);
  const random = createRandom(seed), calls = runningStats(), puts = runningStats(), discountedStock = runningStats();
  const kappa = Math.expm1(p.jumpMean + 0.5 * p.jumpVolatility ** 2);
  const drift = (p.rate - p.dividend - p.jumpIntensity * kappa - 0.5 * p.volatility ** 2) * p.maturity;
  const diffusionScale = p.volatility * Math.sqrt(p.maturity), discount = Math.exp(-p.rate * p.maturity);
  for (let i = 0; i < paths; i++) {
    const count = random.poisson(p.jumpIntensity * p.maturity);
    const terminal = p.spot * Math.exp(drift + diffusionScale * random.normal() + count * p.jumpMean + Math.sqrt(count) * p.jumpVolatility * random.normal());
    calls.add(discount * Math.max(terminal - p.strike, 0));
    puts.add(discount * Math.max(p.strike - terminal, 0));
    discountedStock.add(discount * terminal);
  }
  const call = calls.result(), put = puts.result(), stock = discountedStock.result();
  return { call, put, ...(p.type === 'call' ? call : put), martingale: { mean: stock.price, expected: p.spot * Math.exp(-p.dividend * p.maturity), standardError: stock.standardError, ci95: stock.ci95 }, paths, seed };
}

/** Paired paths share Brownian shocks so the effect of jumps is visible. */
export function generateOptionPaths(inputs = {}, { steps = 64, seed = 1976, pairs = 3 } = {}) {
  const p = validateOptionInputs(inputs);
  integer(steps, 'path steps', 2, 512); integer(pairs, 'path pairs', 1, 12);
  const random = createRandom(seed), dt = p.maturity / steps;
  const kappa = Math.expm1(p.jumpMean + 0.5 * p.jumpVolatility ** 2);
  const paths = Array.from({ length: pairs }, (_, id) => {
    let diffusionValue = p.spot, jumpValue = p.spot;
    const diffusion = [{ t: 0, price: p.spot }], merton = [{ t: 0, price: p.spot }];
    for (let step = 1; step <= steps; step++) {
      const brownian = p.volatility * Math.sqrt(dt) * random.normal();
      const count = random.poisson(p.jumpIntensity * dt);
      const jump = count * p.jumpMean + Math.sqrt(count) * p.jumpVolatility * random.normal();
      diffusionValue *= Math.exp((p.rate - p.dividend - 0.5 * p.volatility ** 2) * dt + brownian);
      jumpValue *= Math.exp((p.rate - p.dividend - p.jumpIntensity * kappa - 0.5 * p.volatility ** 2) * dt + brownian + jump);
      diffusion.push({ t: step * dt, price: diffusionValue });
      merton.push({ t: step * dt, price: jumpValue });
    }
    return { id: id + 1, diffusion, merton };
  });
  return { seed, paths };
}
