import test from 'node:test';
import assert from 'node:assert/strict';
import { OPTION_DEFAULTS, DCF_DEFAULTS, DCF_PRESETS, generateTradeTape, analyzeVWAP, calculateDCF, normalCDF, blackScholes, mertonPrice, optionComparison, monteCarloMerton, generateOptionPaths } from '../dist/assets/models.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected} by more than ${tolerance}`);
const within = (number, interval) => assert.ok(number >= interval[0] && number <= interval[1], `${number} is outside [${interval}]`);

test('trade tape is seeded, session bounded, and immutable during window selection', () => {
  const tape = generateTradeTape(), snapshot = JSON.stringify(tape);
  assert.deepEqual(tape, generateTradeTape());
  assert.notDeepEqual(tape, generateTradeTape({ seed: 1 }));
  assert.equal(tape.length, 780);
  assert.equal(tape[0].minute, 570);
  assert.ok(tape.at(-1).minute < 960);
  assert.ok(tape.every(row => row.volume > 0 && row.price > 0));
  analyzeVWAP(tape, { startMinute: 600, endMinute: 660 });
  assert.equal(JSON.stringify(tape), snapshot);
});

test('VWAP matches manual example and positive execution cost means worse for each side', () => {
  const trades = [{ minute: 570, price: 100, volume: 10 }, { minute: 600, price: 110, volume: 30 }];
  const buy = analyzeVWAP(trades, { executionPrice: 108, side: 'buy' });
  close(buy.vwap, 107.5);
  close(buy.executionCostBps, 0.5 / 107.5 * 10000);
  close(buy.chart.at(-1).cumulativeVWAP, buy.vwap);
  close(analyzeVWAP(trades, { executionPrice: 108, side: 'sell' }).executionCostBps, -buy.executionCostBps);
  assert.ok(analyzeVWAP(trades, { executionPrice: 107, side: 'sell' }).executionCostBps > 0);
  assert.equal(analyzeVWAP(trades, { startMinute: 600, endMinute: 601 }).vwap, 110);
  assert.equal(analyzeVWAP(trades, { startMinute: 570, endMinute: 600 }).count, 1);
});

test('VWAP handles empty, zero-volume, and invalid windows explicitly', () => {
  const empty = analyzeVWAP([], { startMinute: 570, endMinute: 570 });
  assert.equal(empty.vwap, null);
  assert.match(empty.message, /No trades/);
  const zero = analyzeVWAP([{ minute: 570, price: 100, volume: 0 }]);
  assert.equal(zero.vwap, null);
  assert.equal(zero.executionCostBps, null);
  assert.match(zero.message, /zero traded volume/);
  assert.throws(() => analyzeVWAP([], { startMinute: 700, endMinute: 600 }));
  assert.throws(() => analyzeVWAP([{ minute: 600, price: 100, volume: -1 }]));
});

test('DCF reproduces independent default reference and operating cash-flow identities', () => {
  const result = calculateDCF();
  close(result.valuePerShare, 16.96318989577214, 1e-12);
  close(result.forecast[0].freeCashFlow, 10.58);
  close(result.terminal.freeCashFlow, 16.09602991632);
  close(result.enterpriseValue, 179.6318989577214);
  close(result.terminalContribution, 0.7418406381517982);
  close(result.equityValue, result.enterpriseValue + 15 - 25);
  for (const row of result.forecast) close(row.freeCashFlow, row.nopat - row.reinvestment);
});

test('DCF scenarios, cash/debt/share bridge and terminal reinvestment recompute', () => {
  const base = calculateDCF(), upside = calculateDCF(DCF_PRESETS.upside), downside = calculateDCF(DCF_PRESETS.downside);
  assert.ok(upside.valuePerShare > base.valuePerShare && downside.valuePerShare < base.valuePerShare);
  close(calculateDCF({ cash: 25 }).valuePerShare, base.valuePerShare + 1);
  close(calculateDCF({ debt: 35 }).valuePerShare, base.valuePerShare - 1);
  close(calculateDCF({ shares: 20 }).valuePerShare, base.valuePerShare / 2);
  const higherGrowth = calculateDCF({ terminalGrowth: 0.035 });
  close(higherGrowth.terminal.reinvestment / higherGrowth.terminal.nopat, 0.035 / 0.12);
  assert.ok(higherGrowth.terminal.reinvestment > base.terminal.reinvestment);
  assert.throws(() => calculateDCF({ terminalGrowth: 0.1, wacc: 0.1 }), /WACC/);
  assert.throws(() => calculateDCF({ terminalGrowth: 0.04, terminalReturnOnCapital: 0.03 }), /return on capital/);
});

test('terminal-value / next-year NOPAT ratio is independent of growth when ROC equals WACC', () => {
  const zero = calculateDCF({ terminalReturnOnCapital: 0.1, terminalGrowth: 0 });
  const growth = calculateDCF({ terminalReturnOnCapital: 0.1, terminalGrowth: 0.04 });
  // Terminal operating income grows by g in this model, so TV equals NOPAT_5*(1+g)/WACC.
  // Dividing by terminal NOPAT isolates the reinvestment/discount identity.
  close(zero.terminal.value / zero.terminal.nopat, 10);
  close(growth.terminal.value / growth.terminal.nopat, 10);
});

test('normal CDF agrees with known reference quantiles', () => {
  close(normalCDF(0), 0.5, 1e-15);
  close(normalCDF(1), 0.8413447460685429, 1e-14);
  close(normalCDF(-1.96), 0.024997895148220435, 1e-14);
  close(normalCDF(3), 0.9986501019683699, 1e-14);
  close(normalCDF(-6), 9.865876450376946e-10, 1e-14);
});

test('Black–Scholes agrees with standard reference values and handles expiry/zero volatility', () => {
  const result = blackScholes({ spot: 100, strike: 100, maturity: 1, rate: 0.05, dividend: 0, volatility: 0.2 });
  close(result.call, 10.450583572185565, 1e-10);
  close(result.put, 5.573526022256971, 1e-10);
  assert.deepEqual(blackScholes({ maturity: 0, spot: 110, strike: 100 }), { call: 10, put: 0, price: 10 });
  const deterministic = blackScholes({ volatility: 0 });
  close(deterministic.call, 100 * Math.exp(-0.01) - 100 * Math.exp(-0.04));
  close(deterministic.put, 0);
});

test('both pricing models respect parity, bounds and strike monotonicity', () => {
  for (const overrides of [{}, { rate: -0.03 }, { volatility: 0 }, { maturity: 5, jumpIntensity: 5, jumpMean: 1, jumpVolatility: 1 }, { maturity: 5, jumpIntensity: 5, jumpMean: -1, jumpVolatility: 0 }]) {
    const p = { ...OPTION_DEFAULTS, ...overrides };
    const asset = p.spot * Math.exp(-p.dividend * p.maturity), bond = p.strike * Math.exp(-p.rate * p.maturity);
    for (const calculate of [blackScholes, mertonPrice]) {
      const result = calculate(p);
      close(result.call - result.put, asset - bond, 3e-9);
      assert.ok(result.call >= Math.max(asset - bond, 0) - 3e-9 && result.call <= asset + 3e-9);
      assert.ok(result.put >= Math.max(bond - asset, 0) - 3e-9 && result.put <= bond + 3e-9);
      assert.ok(calculate({ ...p, strike: 110 }).call <= result.call + 3e-9);
      assert.ok(calculate({ ...p, strike: 110 }).put >= result.put - 3e-9);
    }
  }
});

test('Merton reduces to Black–Scholes with zero intensity or identically zero jumps', () => {
  const baseline = blackScholes();
  close(mertonPrice({ jumpIntensity: 0 }).call, baseline.call);
  close(mertonPrice({ jumpIntensity: 0 }).put, baseline.put);
  close(mertonPrice({ jumpIntensity: 5, jumpMean: 0, jumpVolatility: 0 }).call, baseline.call, 1e-9);
  close(mertonPrice({ jumpIntensity: 1e-8 }).call, baseline.call, 1e-7);
  const expired = mertonPrice({ maturity: 0, spot: 90, type: 'put' });
  close(expired.price, 10);
  assert.equal(expired.terms, 1);
});

test('reported series tail bounds cover omitted prices against tighter summation', () => {
  for (const inputs of [{}, { maturity: 4, jumpIntensity: 4, jumpMean: 0.2, jumpVolatility: 0.5 }, { maturity: 5, jumpIntensity: 5, jumpMean: 1, jumpVolatility: 1 }]) {
    const coarse = mertonPrice(inputs, { tolerance: 0.001 });
    const fine = mertonPrice(inputs, { tolerance: 1e-12 });
    assert.ok(fine.terms > coarse.terms);
    assert.ok(fine.call >= coarse.call - 1e-11);
    assert.ok(fine.put >= coarse.put - 1e-11);
    assert.ok(fine.call - coarse.call <= coarse.callTailBound + 1e-11);
    assert.ok(fine.put - coarse.put <= coarse.putTailBound + 1e-11);
    assert.ok(coarse.callTailBound <= 0.001 && coarse.putTailBound <= 0.001);
  }
});

test('variance-matched comparison matches the compound-Poisson log-return variance', () => {
  const result = optionComparison();
  close(result.matchedVolatility ** 2, 0.2 ** 2 + 0.5 * (0.05 ** 2 + 0.15 ** 2));
  close(result.varianceMatched.call, blackScholes({ volatility: result.matchedVolatility }).call);
});

test('derived variance-matched volatility can exceed the public diffusion input ceiling', () => {
  const inputs = { volatility: 1.5, jumpIntensity: 5, jumpMean: 1, jumpVolatility: 1 };
  const result = optionComparison(inputs);
  close(result.matchedVolatility, 3.5);
  assert.ok(Number.isFinite(result.varianceMatched.call));
  assert.ok(Number.isFinite(result.varianceMatched.put));
  close(result.varianceMatched.call - result.varianceMatched.put, 100 * Math.exp(-0.01) - 100 * Math.exp(-0.04));
  assert.ok(result.varianceMatched.call <= 100 * Math.exp(-0.01));
  assert.throws(() => blackScholes({ volatility: 3.5 }), /diffusion volatility/);
});

test('independent exact-terminal Monte Carlo validates prices and risk-neutral stock expectation', () => {
  const exact = mertonPrice(), simulated = monteCarloMerton({}, { paths: 200000, seed: 1976 });
  within(exact.call, simulated.call.ci95);
  within(exact.put, simulated.put.ci95);
  within(simulated.martingale.expected, simulated.martingale.ci95);
  assert.ok(simulated.standardError > 0);
  close(simulated.call.price - simulated.put.price, simulated.martingale.mean - 100 * Math.exp(-0.04), 1e-10);
  assert.deepEqual(monteCarloMerton({}, { paths: 1000, seed: 1 }), monteCarloMerton({}, { paths: 1000, seed: 1 }));
  console.log(JSON.stringify({ simulationValidation: simulated }, null, 2));
});

test('paired paths are reproducible and coincide when jumps are removed', () => {
  assert.deepEqual(generateOptionPaths(), generateOptionPaths());
  for (const pair of generateOptionPaths({ jumpIntensity: 0 }).paths) assert.deepEqual(pair.diffusion, pair.merton);
  const result = generateOptionPaths();
  assert.ok(result.paths.every(pair => pair.diffusion.length === 65 && pair.merton.every(point => point.price > 0)));
  for (const pair of generateOptionPaths({ maturity: 0 }).paths) assert.ok(pair.merton.every(point => point.t === 0 && point.price === 100));
});

test('all calculations reject non-finite and unsupported inputs', () => {
  for (const calculate of [blackScholes, mertonPrice, optionComparison, monteCarloMerton, generateOptionPaths]) {
    assert.throws(() => calculate({ volatility: NaN }));
    assert.throws(() => calculate({ maturity: -1 }));
    assert.throws(() => calculate({ spot: 0 }));
  }
  assert.throws(() => calculateDCF({ revenue: Infinity }));
  assert.throws(() => calculateDCF({ shares: 0 }));
  assert.throws(() => generateTradeTape({ count: 1 }));
  assert.throws(() => mertonPrice({}, { tolerance: 0 }));
  assert.equal(DCF_DEFAULTS.cash, 15);
});
