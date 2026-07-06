// Operating-tab engine: 11 annual points, index 0 = 2025 ... index 10 = 2035.
const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

function sCurve(x0, target, k, midpointYear) {
  const startYear = 2025;
  const logistic = (y) => 1 / (1 + Math.exp(-k * (y - midpointYear)));
  const l0 = logistic(startYear);
  const path = [x0];
  for (let t = 1; t <= 10; t++) {
    const y = YEARS[t];
    path.push(x0 + (target - x0) * (logistic(y) - l0) / (1 - l0));
  }
  return path;
}

function diminishingMargin(margin0, target, speed, realizationPath, penaltyFn) {
  // realizationPath[t] in [0,1] fraction of buildout complete at year t
  const path = [margin0];
  for (let t = 1; t <= 10; t++) {
    let m = target - (target - margin0) * Math.pow(1 - speed, realizationPath[t] * 10);
    if (penaltyFn) m -= penaltyFn(t);
    path.push(m);
  }
  return path;
}

export function runOperating(C) {
  // ---- Space ----
  const launches = sCurve(34, C.spaceCadenceTarget, C.spaceRampSpeed, C.spaceMidpointYear);
  const avgRevPerLaunch = Array.from({ length: 11 }, (_, t) =>
    C.spaceStartPrice + (C.spaceEndPrice - C.spaceStartPrice) * (t / 10)
  );
  const spaceRevenue = [4086];
  for (let t = 1; t <= 10; t++) spaceRevenue.push(launches[t] * avgRevPerLaunch[t]);
  const spaceMargin0 = -657 / 4086;
  const spaceRealization = launches.map((l) => l / C.spaceCadenceTarget);
  const spaceMargin = diminishingMargin(spaceMargin0, C.spaceTargetMargin, C.spaceMarginSpeed, spaceRealization);
  const spaceEBIT = spaceRevenue.map((r, t) => r * spaceMargin[t]);

  // ---- Connectivity ----
  const subscribers = sCurve(6.65, C.connSubPotential, C.connPenetrationSpeed, C.connMidpointYear);
  const arpu = [null];
  arpu.push(C.connArpuStart);
  for (let t = 2; t <= 10; t++) arpu.push(arpu[t - 1] * (1 - C.connArpuDecline));
  const subRevenue = [null];
  for (let t = 1; t <= 10; t++) subRevenue.push(subscribers[t] * arpu[t] * 12);
  const hwRevenue = [null];
  for (let t = 1; t <= 10; t++) hwRevenue.push(subRevenue[t] * C.connHwPct * (1 - C.connHwDecline));
  const connRevenue = [11387];
  for (let t = 1; t <= 10; t++) connRevenue.push(subRevenue[t] + hwRevenue[t]);
  const connMargin0 = 4423 / 11387;
  const connRealization = subscribers.map((s) => s / C.connSubPotential);
  const connMargin = diminishingMargin(connMargin0, C.connTargetMargin, C.connMarginSpeed, connRealization);
  const connEBIT = connRevenue.map((r, t) => r * connMargin[t]);

  // ---- AI ----
  const capacity = sCurve(600, C.aiClusterTarget, C.aiDeploySpeed, C.aiMidpointYear);
  const contracts = [
    { start: 1250, allocStart: 300, allocRate: 0, priceRate: 0, months0: 7 }, // Anthropic
  ];
  // Anthropic
  const anthropicRev = [0, 1250 * 12 * (7 / 12), 1250 * 12 * (1 - C.aiTermRisk), 1250 * 12 * (1 - C.aiTermRisk), 1250 * 12 * (5 / 12) * (1 - C.aiTermRisk), 0, 0, 0, 0, 0, 0];
  const anthropicMW = [0, 300, 300 * (1 - C.aiTermRisk), 300 * (1 - C.aiTermRisk), 300 * (1 - C.aiTermRisk), 0, 0, 0, 0, 0, 0];
  // Google
  const googleRev = [0, 920 * 12 * (3 / 12), 920 * 12 * (1 - C.aiTermRisk), 920 * 12 * (1 - C.aiTermRisk), 920 * 12 * (6 / 12) * (1 - C.aiTermRisk), 0, 0, 0, 0, 0, 0];
  const googleMW = [0, 200, 200 * (1 - C.aiTermRisk), 200 * (1 - C.aiTermRisk), 200 * (1 - C.aiTermRisk), 0, 0, 0, 0, 0, 0];
  // Reflection AI
  const reflRev = [0, 150 * 12 * (6 / 12), 150 * 12, 150 * 12, 150 * 12, 0, 0, 0, 0, 0, 0];
  const reflMW = [0, reflRev[1] / 60 * 2, reflRev[2] / 60, reflRev[3] / 60, reflRev[4] / 60, 0, 0, 0, 0, 0, 0];

  const contractedRevenue = Array.from({ length: 11 }, (_, t) => anthropicRev[t] + googleRev[t] + reflRev[t]);
  const demandContracted = Array.from({ length: 11 }, (_, t) => anthropicMW[t] + googleMW[t] + reflMW[t]);
  const demandNotContracted = capacity.map((c, t) => c - demandContracted[t]);

  const price = [null];
  price.push(C.aiPriceStart);
  for (let t = 2; t <= 10; t++) price.push(price[t - 1] * (1 + C.aiPriceAppreciation));
  const notContractedRevenue = [0];
  for (let t = 1; t <= 10; t++) notContractedRevenue.push(demandNotContracted[t] * price[t]);

  const aiRevenue = [3201];
  for (let t = 1; t <= 10; t++) aiRevenue.push(notContractedRevenue[t] + contractedRevenue[t]);

  const aiMargin = [-6355 / 3201];
  for (let t = 1; t <= 10; t++) {
    let m = aiMargin[t - 1] + (C.aiTargetMargin - aiMargin[t - 1]) * C.aiMarginSpeed;
    if (t <= 5 && capacity[t] - capacity[t - 1] > 0) m -= 0.05; // ramp-inefficiency penalty, only modeled through t=5 (2030)
    aiMargin.push(m);
  }
  const aiEBIT = aiRevenue.map((r, t) => r * aiMargin[t]);

  // ---- Expansion ----
  const realizationSpaceForComposite = [0, ...spaceRealization.slice(1)];
  const realizationConnForComposite = [0, ...connRealization.slice(1)];
  const realizationAIForComposite = [0, ...capacity.slice(1).map((c) => c / C.aiClusterTarget)];
  const composite = [0];
  for (let t = 1; t <= 10; t++) {
    composite.push(
      realizationSpaceForComposite[t] * C.expWeightSpace +
      realizationConnForComposite[t] * C.expWeightConn +
      realizationAIForComposite[t] * C.expWeightAI
    );
  }
  const convexMult = composite.map((c) => Math.pow(Math.max(0, c - C.expStrike), C.expConvexity));
  const revenueScale = C.expMarketPotential / convexMult[10]; // solved so year-10 revenue == market potential exactly
  const expRevenue = convexMult.map((m) => revenueScale * m);
  expRevenue[0] = 0;

  const expMargin = [0];
  for (let t = 1; t <= 10; t++) {
    const num = spaceEBIT[t] + connEBIT[t] + aiEBIT[t];
    const den = spaceRevenue[t] + connRevenue[t] + aiRevenue[t];
    expMargin.push(den === 0 ? 0 : num / den);
  }
  const expEBIT = expRevenue.map((r, t) => r * expMargin[t]);

  // ---- Consolidated ----
  const totalEBIT = Array.from({ length: 11 }, (_, t) => spaceEBIT[t] + connEBIT[t] + aiEBIT[t] + expEBIT[t]);

  return {
    space: { launches, avgRevPerLaunch, revenue: spaceRevenue, margin: spaceMargin, ebit: spaceEBIT },
    connectivity: { subscribers, arpu, revenue: connRevenue, margin: connMargin, ebit: connEBIT },
    ai: { capacity, revenue: aiRevenue, margin: aiMargin, ebit: aiEBIT },
    expansion: { composite, convexMult, revenueScale, revenue: expRevenue, margin: expMargin, ebit: expEBIT },
    totalEBIT,
  };
}

// PP&E rollforward shared by Space/Connectivity/Expansion: capex is a function
// of the change in a driver metric (revenue, or capacity for AI) divided by a
// capital-efficiency ratio, plus a maintenance-capex charge on the prior
// period's driver value. D&A = beginning PP&E x depreciation rate.
function ppeRollforward(startingPPE, driver, capexFn, depreciationRate) {
  const beginPPE = [null, startingPPE];
  const capex = [null];
  const da = [null];
  const endPPE = [startingPPE];
  for (let t = 1; t <= 10; t++) {
    const begin = endPPE[t - 1];
    const cx = capexFn(t);
    const d = begin * depreciationRate;
    const end = begin + cx - d;
    capex.push(cx);
    da.push(d);
    endPPE.push(end);
    beginPPE.push(end); // beginPPE[t+1] = endPPE[t], used only for the next iteration's "begin"
  }
  return { capex, da, endPPE };
}

export function runInvestment(O, C) {
  // Space: capex driven by revenue growth, split capital-efficiency ratio for years 1-5 vs 6-10
  const space = ppeRollforward(8648, O.space.revenue, (t) => {
    const eff = t <= 5 ? C.spaceCapEffY1_5 : C.spaceCapEffY6_10;
    return Math.max(0, (O.space.revenue[t] - O.space.revenue[t - 1]) / eff) + O.space.revenue[t - 1] * C.spaceMaintCapex;
  }, C.spaceDepreciation);

  // Connectivity: same pattern
  const connectivity = ppeRollforward(11886, O.connectivity.revenue, (t) => {
    const eff = t <= 5 ? C.connCapEffY1_5 : C.connCapEffY6_10;
    return Math.max(0, (O.connectivity.revenue[t] - O.connectivity.revenue[t - 1]) / eff) + O.connectivity.revenue[t - 1] * C.connMaintCapex;
  }, C.connDepreciation);

  // AI: capex driven by the CHANGE IN PHYSICAL CAPACITY (MW), not revenue --
  // avoids double-counting when contracted deals expire and roll to merchant pricing.
  const ai = ppeRollforward(22068, O.ai.capacity, (t) => {
    return Math.max(0, (O.ai.capacity[t] - O.ai.capacity[t - 1]) * C.aiBuildCostPerMW) + O.ai.revenue[t - 1] * C.aiMaintCapex;
  }, C.aiDepreciation);

  // Expansion: same shape as Space/Connectivity but single capital-efficiency ratio (no Y1-5/Y6-10 split)
  const expansion = ppeRollforward(0, O.expansion.revenue, (t) => {
    return Math.max(0, (O.expansion.revenue[t] - O.expansion.revenue[t - 1]) / C.expCapEff) + O.expansion.revenue[t - 1] * C.expMaintCapex;
  }, C.expDepreciation);

  return { space, connectivity, ai, expansion };
}

// ---- Adjustments: two-waterfall cash tax schedule (Federal + State NOL/credits) ----
function taxWaterfall(ebit, beginningNOL0, beginningCredits0, statutoryRate) {
  const beginNOL = [null, beginningNOL0];
  const nolUsed = [null];
  const nolAdded = [null];
  const endNOL = [null];
  const taxableIncome = [null];
  const taxBeforeCredits = [null];
  const beginCredits = [null, beginningCredits0];
  const creditsUsed = [null];
  const endCredits = [null];
  const cashTax = [null];
  for (let t = 1; t <= 10; t++) {
    const bNOL = beginNOL[t];
    const used = ebit[t] > 0 ? Math.min(bNOL, 0.8 * ebit[t]) : 0;
    const added = Math.max(0, -ebit[t]);
    const eNOL = bNOL - used + added;
    const ti = Math.max(0, ebit[t] - used);
    const tbc = ti * statutoryRate;
    const bCred = beginCredits[t];
    const cUsed = Math.min(bCred, tbc);
    const eCred = bCred - cUsed;
    const tax = tbc - cUsed;

    nolUsed.push(used); nolAdded.push(added); endNOL.push(eNOL); taxableIncome.push(ti);
    taxBeforeCredits.push(tbc); creditsUsed.push(cUsed); endCredits.push(eCred); cashTax.push(tax);
    if (t < 10) { beginNOL.push(eNOL); beginCredits.push(eCred); }
  }
  return { cashTax };
}

export function runAdjustments(ebit, AC) {
  const federal = taxWaterfall(ebit, AC.fedNOL0, AC.fedCredits0, AC.fedStatutoryRate);
  const state = taxWaterfall(ebit, AC.stateNOL0, AC.stateCredits0, AC.stateLTRate - AC.fedStatutoryRate);
  const cashTax = [null];
  const effectiveRate = [null];
  for (let t = 1; t <= 10; t++) {
    const tax = federal.cashTax[t] + state.cashTax[t];
    cashTax.push(tax);
    effectiveRate.push(ebit[t] > 0 ? tax / ebit[t] : 0);
  }
  return { cashTax, effectiveRate };
}

// ---- WACC: pure CAPM + static (non-circular) capital structure weight ----
export function runWACC(WC) {
  const equityWeight = WC.staticEquityValue / (WC.staticEquityValue + WC.totalDebt);
  const debtWeight = WC.totalDebt / (WC.staticEquityValue + WC.totalDebt);
  const afterTaxCostOfDebt = WC.costOfDebt * (1 - WC.statutoryRateLT);
  const wacc = (beta, riskPremium) =>
    (WC.riskFree + WC.erp * beta + riskPremium) * equityWeight + afterTaxCostOfDebt * debtWeight;
  return {
    space: wacc(WC.betaSpace, WC.riskPremiumSpace),
    connectivity: wacc(WC.betaConn, WC.riskPremiumConn),
    ai: wacc(WC.betaAI, WC.riskPremiumAI),
    expansion: wacc(WC.betaExp, WC.riskPremiumExp),
  };
}

// ---- EV: unlevered FCF, discounting, terminal value per segment ----
function segmentEV(revenue, ebit, D_and_A, capex, nwcDeltaFactor, cashTaxRate, waccRate, termGrowth, termRRss) {
  const cashTax = [null], nopat = [null], nwcDelta = [null], fcf = [null], discFactor = [null], pvFCF = [null];
  for (let t = 1; t <= 10; t++) {
    const tax = Math.max(0, ebit[t]) * cashTaxRate[t];
    const np = ebit[t] - tax;
    const nwc = nwcDeltaFactor * (revenue[t] - revenue[t - 1]);
    const f = np + D_and_A[t] - capex[t] - nwc;
    const df = 1 / Math.pow(1 + waccRate, t);
    cashTax.push(tax); nopat.push(np); nwcDelta.push(nwc); fcf.push(f); discFactor.push(df); pvFCF.push(f * df);
  }
  const terminalValue = nopat[10] * (1 + termGrowth) * (1 - termRRss) / (waccRate - termGrowth);
  const sumPV = pvFCF.slice(1).reduce((a, b) => a + b, 0); // skip index 0 (null placeholder for year 2025)
  const enterpriseValue = sumPV + terminalValue * discFactor[10]; // discFactor[10] = year-10 (2035) factor
  return { cashTax, nopat, nwcDelta, fcf, discFactor, pvFCF, terminalValue, enterpriseValue };
}

export function runEV(O, I, adj, wacc, EVC) {
  const space = segmentEV(O.space.revenue, O.space.ebit, I.space.da, I.space.capex, EVC.nwcSpaceAI_Exp, adj.effectiveRate, wacc.space, EVC.growthSpace, EVC.rrSpace);
  const connectivity = segmentEV(O.connectivity.revenue, O.connectivity.ebit, I.connectivity.da, I.connectivity.capex, EVC.nwcConn, adj.effectiveRate, wacc.connectivity, EVC.growthConn, EVC.rrConn);
  const ai = segmentEV(O.ai.revenue, O.ai.ebit, I.ai.da, I.ai.capex, EVC.nwcSpaceAI_Exp, adj.effectiveRate, wacc.ai, EVC.growthAI, EVC.rrAI);

  // Expansion: standard FCF/PV build, but terminal value is the scenario-weighted H-model value
  const expFCF = segmentEV(O.expansion.revenue, O.expansion.ebit, I.expansion.da, I.expansion.capex, EVC.nwcSpaceAI_Exp, adj.effectiveRate, wacc.expansion, EVC.growthExp, EVC.rrExp);

  const finalComposite = O.expansion.composite[10]; // Operating!M60
  const scenarios = ['bear', 'base', 'bull'];
  const multiplier = { bear: EVC.scenarioMultBear, base: EVC.scenarioMultBase, bull: EVC.scenarioMultBull };
  const scenarioComposite = {}, payoff = {}, scenRevenue = {}, scenEBIT = {}, scenTax = {}, scenNOPAT = {}, scenTV = {};
  for (const s of scenarios) {
    scenarioComposite[s] = Math.min(1, finalComposite * multiplier[s]);
    payoff[s] = Math.pow(Math.max(0, scenarioComposite[s] - EVC.expStrike), EVC.expConvexity);
    scenRevenue[s] = EVC.revenueScale * payoff[s] * (s === 'bull' ? EVC.bullBoost : 1);
    scenEBIT[s] = scenRevenue[s] * O.expansion.margin[10]; // Operating!M65, held constant across scenarios
    scenTax[s] = Math.max(0, scenEBIT[s]) * adj.effectiveRate[10]; // Adjustments!M13
    scenNOPAT[s] = scenEBIT[s] - scenTax[s];
    // H-model: TV = NOPAT*(1-RRss)*[(1+g_L) + H*(g_S - g_L)] / (WACC - g_L)
    scenTV[s] = scenNOPAT[s] * (1 - EVC.rrExp) *
      ((1 + EVC.growthExp) + EVC.growthHalfLife * (EVC.startingGrowth - EVC.growthExp)) /
      (wacc.expansion - EVC.growthExp);
  }
  const expectedTerminalValue = scenTV.bear * EVC.probBear + scenTV.base * EVC.probBase + scenTV.bull * EVC.probBull;
  const expEnterpriseValue = expFCF.pvFCF.slice(1).reduce((a, b) => a + b, 0) + expectedTerminalValue * expFCF.discFactor[10];

  return {
    space, connectivity, ai,
    expansion: { ...expFCF, terminalValue: expectedTerminalValue, enterpriseValue: expEnterpriseValue, scenarioComposite, payoff, scenRevenue, scenEBIT, scenTax, scenNOPAT, scenTV },
  };
}

// ---- Valuation: share count, net cash, equity bridge, per-share, ROIC/WACC/Spread diagnostic ----
// Share count and net cash are static 424B4-sourced figures -- not slider-dependent.
export function runValuation(evResult, VC) {
  const totalClassAB = VC.classA + VC.classB;
  const totalBasicShares = totalClassAB + VC.anysphereShares + VC.echoStarShares;
  const dilutedShares = totalBasicShares + VC.options + VC.rsus;

  const cashPostAll = VC.cashPF + VC.ipoProceeds + VC.bondProceeds + VC.bridgeRepay; // bridgeRepay is negative
  const debtPostAll = VC.debtPF + VC.bridgeRepaidAgain + VC.newSeniorNotes; // bridgeRepaidAgain is negative
  const netCash = cashPostAll - debtPostAll;

  const totalEV = evResult.space.enterpriseValue + evResult.connectivity.enterpriseValue +
                   evResult.ai.enterpriseValue + evResult.expansion.enterpriseValue;
  const anysphereEV = VC.cursorAnnualizedRevenue * VC.anysphereMultiple; // EV!C84 = EV!C81 * Control!C46
  const equityValue = totalEV + netCash + anysphereEV + VC.echoStarCommitment; // echoStarCommitment is negative
  const perShareExact = equityValue / dilutedShares;
  const perShareRounded = Math.round(perShareExact);
  const impliedUpsideDownside = perShareRounded / VC.currentMarketPrice - 1;

  // Diagnostic: ROIC_ss vs WACC vs Spread. Expansion's ROIC_ss = g / RRss, and since
  // RRss itself = g / WACC (Control!C39), Expansion's spread is always exactly zero --
  // a structural identity, not a forecast (see the app note on this).
  const roicWaccSpread = {
    space: { roicSS: VC.growthSpace / VC.rrSpace, wacc: VC.waccSpace, spread: VC.growthSpace / VC.rrSpace - VC.waccSpace },
    connectivity: { roicSS: VC.growthConn / VC.rrConn, wacc: VC.waccConn, spread: VC.growthConn / VC.rrConn - VC.waccConn },
    ai: { roicSS: VC.growthAI / VC.rrAI, wacc: VC.waccAI, spread: VC.growthAI / VC.rrAI - VC.waccAI },
    expansion: { roicSS: VC.growthExp / VC.rrExp, wacc: VC.waccExp, spread: VC.growthExp / VC.rrExp - VC.waccExp },
  };

  return {
    totalBasicShares, dilutedShares, netCash, totalEV, anysphereEV, equityValue,
    perShareExact, perShareRounded, impliedUpsideDownside, roicWaccSpread,
    echoStarCommitment: VC.echoStarCommitment, currentMarketPrice: VC.currentMarketPrice,
    cashPF: VC.cashPF, ipoProceeds: VC.ipoProceeds, bondProceeds: VC.bondProceeds, bridgeRepay: VC.bridgeRepay,
    cashPostAll, debtPF: VC.debtPF, bridgeRepaidAgain: VC.bridgeRepaidAgain, newSeniorNotes: VC.newSeniorNotes,
    debtPostAll,
    classA: VC.classA, classB: VC.classB, totalClassAB, anysphereShares: VC.anysphereShares,
    echoStarShares: VC.echoStarShares, options: VC.options, rsus: VC.rsus,
  };
}

// ============================================================
// Schema-driven input mapping. Pulls every slider value from
// spcx_control_schema.json by row number (Control!C<row>) instead of
// hardcoding constants -- this is what makes the engine respond to
// slider movements in the app rather than only reproducing one static
// scenario. A handful of values are display_only/hidden in the schema
// (never sliders) and are computed live here instead, exactly as the
// model computes them: the Connectivity segment-weight residual, the
// Bear/Base/Bull scenario multipliers/probabilities, growth half-life,
// starting growth, and Expansion's revenue scale.
// ============================================================
export function buildEngineInputs(schema) {
  const byRow = {};
  for (const c of schema.controls) byRow[c.row] = c.value;
  const v = (r) => byRow[r];

  const C = {
    spaceCadenceTarget: v(51), spaceRampSpeed: v(52), spaceMidpointYear: v(53),
    spaceStartPrice: v(56), spaceEndPrice: v(57), spaceTargetMargin: v(60), spaceMarginSpeed: v(61),
    connSubPotential: v(74), connPenetrationSpeed: v(75), connMidpointYear: v(76),
    connArpuStart: v(79), connArpuDecline: v(80), connHwPct: v(83), connHwDecline: v(84),
    connTargetMargin: v(87), connMarginSpeed: v(88),
    aiClusterTarget: v(101), aiDeploySpeed: v(102), aiMidpointYear: v(103),
    aiPriceStart: v(106), aiPriceAppreciation: v(107), aiTargetMargin: v(110), aiMarginSpeed: v(111),
    aiTermRisk: v(120),
    expWeightSpace: v(124), expWeightConn: 1 - v(124) - v(126) /* Control!C125: display-only residual */, expWeightAI: v(126),
    expStrike: v(129), expConvexity: v(130), expMarketPotential: v(153),
  };

  const IC = {
    spaceDepreciation: v(64), spaceMaintCapex: v(65), spaceCapEffY1_5: v(66), spaceCapEffY6_10: v(67),
    connDepreciation: v(91), connMaintCapex: v(92), connCapEffY1_5: v(93), connCapEffY6_10: v(94),
    aiDepreciation: v(114), aiMaintCapex: v(115), aiBuildCostPerMW: v(116),
    expDepreciation: v(134), expCapEff: v(135), expMaintCapex: v(136),
  };

  // Not exposed as Control sliders -- fixed 424B4/statutory figures embedded
  // directly in the Adjustments and Valuation sheets, not user-editable.
  const AC = { fedNOL0: 9728, fedCredits0: 3586, fedStatutoryRate: 0.21, stateNOL0: 5234, stateCredits0: 2104, stateLTRate: 0.23 };

  const WC = {
    riskFree: v(7), erp: v(8), costOfDebt: v(9), statutoryRateLT: 0.23,
    staticEquityValue: 877186, totalDebt: 29111, // Valuation!C51, C22 -- not Control rows
    betaSpace: v(12), betaConn: v(13), betaAI: v(14), betaExp: v(15),
    riskPremiumSpace: v(18), riskPremiumConn: v(19), riskPremiumAI: v(20), riskPremiumExp: v(21),
  };

  const growthSpace = v(30), growthConn = v(31), growthAI = v(32), growthExp = v(33);
  const rrSpace = v(36), rrConn = v(37), rrAI = v(38);
  // Bear/Base/Bull multipliers and probabilities are calculated rows (141-143,
  // 146-148) with no App tag of their own -- derive from the spread (140) and
  // odds (145) sliders, exactly as Control!C141:C148 do.
  const spread = v(140), odds = v(145);
  const scenarioMultBear = 1 - spread, scenarioMultBase = 1, scenarioMultBull = 1 + spread;
  const probBear = odds, probBase = 1 - 2 * odds, probBull = odds;

  return { schemaByRow: byRow, C, IC, AC, WC, growthSpace, growthConn, growthAI, growthExp, rrSpace, rrConn, rrAI,
    nwcSpaceAI_Exp: v(42), nwcConn: v(43), bullBoost: v(150), anysphereMultiple: v(46),
    yearsToMature: v(157), scenarioMultBear, scenarioMultBase, scenarioMultBull, probBear, probBase, probBull };
}

export function runFullEngine(schema) {
  const inputs = buildEngineInputs(schema);
  const operating = runOperating(inputs.C);
  const investment = runInvestment(operating, inputs.IC);
  const adjustments = runAdjustments(operating.totalEBIT, inputs.AC);
  const wacc = runWACC(inputs.WC);

  const growthExp = inputs.growthExp;
  const rrExp = growthExp / wacc.expansion; // Control!C39: dynamic RR_ss = g / WACC
  const L62 = operating.expansion.revenue[9], M62 = operating.expansion.revenue[10];
  const startingGrowthRaw = M62 / L62 - 1;
  const startingGrowth = Number.isFinite(startingGrowthRaw) ? startingGrowthRaw : growthExp; // Control!C156
  const growthHalfLife = inputs.yearsToMature / 2; // Control!C158

  const EVC = {
    nwcSpaceAI_Exp: inputs.nwcSpaceAI_Exp, nwcConn: inputs.nwcConn,
    growthSpace: inputs.growthSpace, rrSpace: inputs.rrSpace,
    growthConn: inputs.growthConn, rrConn: inputs.rrConn,
    growthAI: inputs.growthAI, rrAI: inputs.rrAI,
    growthExp, rrExp,
    expStrike: inputs.C.expStrike, expConvexity: inputs.C.expConvexity, revenueScale: operating.expansion.revenueScale,
    scenarioMultBear: inputs.scenarioMultBear, scenarioMultBase: inputs.scenarioMultBase, scenarioMultBull: inputs.scenarioMultBull,
    bullBoost: inputs.bullBoost,
    probBear: inputs.probBear, probBase: inputs.probBase, probBull: inputs.probBull,
    growthHalfLife, startingGrowth,
  };
  const ev = runEV(operating, investment, adjustments, wacc, EVC);

  // Additive, display-only re-exposure of values already computed above --
  // none of these feed back into any calculation, they just surface
  // intermediate results (Control!C39/C125/C131/C156/C158 and the
  // Bear/Base/Bull scenario snapshot) for the UI.
  const expansionDiagnostics = {
    rrExp, growthHalfLife, startingGrowth,
    connWeightResidual: inputs.C.expWeightConn,
    scenarioMultBear: inputs.scenarioMultBear, scenarioMultBase: inputs.scenarioMultBase, scenarioMultBull: inputs.scenarioMultBull,
    probBear: inputs.probBear, probBase: inputs.probBase, probBull: inputs.probBull,
  };

  const VC = {
    // Static 424B4-sourced share count / net cash figures -- not Control rows.
    classA: 7463.53, classB: 5695.668, anysphereShares: 444.444, echoStarShares: 261.792,
    options: 442.751494222222, rsus: 153.2,
    cashPF: 15852, ipoProceeds: 85698, bondProceeds: 25000, bridgeRepay: -20000,
    debtPF: 29111, bridgeRepaidAgain: -20000, newSeniorNotes: 25000,
    cursorAnnualizedRevenue: 4000, anysphereMultiple: inputs.anysphereMultiple,
    echoStarCommitment: -2069, currentMarketPrice: 164,
    growthSpace: inputs.growthSpace, rrSpace: inputs.rrSpace, waccSpace: wacc.space,
    growthConn: inputs.growthConn, rrConn: inputs.rrConn, waccConn: wacc.connectivity,
    growthAI: inputs.growthAI, rrAI: inputs.rrAI, waccAI: wacc.ai,
    growthExp, rrExp, waccExp: wacc.expansion,
  };
  const valuation = runValuation(ev, VC);

  return { operating, investment, adjustments, wacc, ev, valuation, expansionDiagnostics };
}

