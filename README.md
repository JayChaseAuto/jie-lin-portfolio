# Jie Lin — Financial Analysis & Analytical Tools

[Explore the portfolio](https://jaychaseauto.github.io/) · [LinkedIn](https://www.linkedin.com/in/jie-lin-793167380/) · [GitHub](https://github.com/JayChaseAuto)

A portfolio focused on financial analyst opportunities, with interests in business performance, valuation and capital investment. Financial models lead the work; practical analytical tools demonstrate initiative. Each project explains its question, method, interpretation and limitations.

## Explore the work

| Area | Project | What you can inspect |
| --- | --- | --- |
| [Financial analysis](https://jaychaseauto.github.io/analyze/) | Five-year operating DCF | Fictional-business forecasts, scenarios, terminal reinvestment, enterprise-to-equity bridge and WACC/growth sensitivity |
| [Analytical tools](https://jaychaseauto.github.io/build/) | Financial Analyzer case study | Sales and inventory report workflow, product comparisons, implementation decisions and limitations; Ample is a secondary interface prototype |
| [Additional analysis / VWAP](https://jaychaseauto.github.io/analyze/vwap/) | Execution benchmarking | Reproducible synthetic trades, selectable windows, buy/sell execution cost and CSV exports |
| [Research](https://jaychaseauto.github.io/research/) | Black–Scholes and Merton jump diffusion | European call/put prices, variance-matched comparison, seeded paths, numerical validation and a printable working paper |

The valuation business is fictional. VWAP uses synthetic trades. Option inputs are chosen risk-neutral assumptions, not historically calibrated estimates. These demonstrations do not claim trading performance or observed investment results. Financial Analyzer's application source is not included in this repository; its case study describes verified implementation.

## Run locally

Use Node.js (validated with version 24). There are no third-party package dependencies.

```sh
npm run build
npm test
npm run check
```

Serve `dist` as the web root with any static HTTP server. For example, if Python is installed:

```sh
python -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Root-relative links expect hosting at a domain root; a GitHub Pages project subdirectory needs path adjustments.

## Source layout

- `scripts/build.mjs` generates the HTML pages and reference experiment results.
- `dist/assets/models.mjs` contains financial calculations and seeded simulation.
- `dist/assets/views.mjs` supplies shared calculated results for charts, tables and exports.
- `dist/assets/render.mjs`, `app.mjs` and `site.css` provide rendering, interactions and responsive/print styles.
- `dist/data/reference-results.json` records the options paper's fixed reference experiment.
- `tests/` covers numerical behavior and view/export consistency.
- `scripts/check-site.mjs` checks local links, page landmarks and generated output.

**Keep `dist/assets`: these are maintained source files.** The build writes generated pages alongside them; it does not recreate the asset source directory. Edit page content in the generator, then rebuild.

## Numerical validation

The test suite checks the hand-calculated VWAP example, selection and execution signs; DCF scenarios and terminal reinvestment; and option expiry, deterministic limits, put–call parity, bounds and recovery of Black–Scholes when jumps disappear.

The default DCF gives CAD **16.963190 per share**. At the options paper's reference assumptions, the Merton call is **10.295521**; an independent 200,000-draw seeded Monte Carlo calculation gives **10.282140**, with estimated standard error **0.035336** and a 95% interval of **[10.212882, 10.351397]**. These are model checks, not empirical market validation.

## References

- [Black & Scholes, The Pricing of Options and Corporate Liabilities (1973)](https://www.journals.uchicago.edu/doi/10.1086/260062)
- [Merton, Option Pricing When Underlying Stock Returns Are Discontinuous (working paper 1975; published 1976)](https://dspace.mit.edu/entities/publication/e63635d9-d2bf-40ce-a79b-67786dd9f105)
- [Damodaran, Excess Returns and Terminal Value](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/valquestions/termvalueexreturns.htm)

## Publishing

The public site is served from the root of [JayChaseAuto.github.io](https://github.com/JayChaseAuto/JayChaseAuto.github.io), with GitHub Pages using its `main` branch. This repository is the maintained source. After building and checking changes, publish the contents of `dist` to that deployment repository, preserving its `.git` directory and `.nojekyll` file.
