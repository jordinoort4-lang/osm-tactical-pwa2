import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ==================== FORMATION PROPERTIES DATABASE ====================
// Structural metadata extracted from adrian2255 guide pt.1 & pt.2, Rachid-Hilmi roadmap.
// Used EXCLUSIVELY by constraint functions — not by the counter lookup.

interface FormationProps {
  defenders: number;
  midfielders: number;
  forwards: number;
  hasCDM: boolean;
  hasCAM: boolean;
  hasWideMFs: boolean;
  hasWingers: boolean;
  hasWingbacks: boolean;
  wideThreats: boolean;
  centralMidCount: number;
  type: "defensive" | "balanced" | "attacking";
}

// OpponentPreset generation moved to client-side (App.tsx computeOppPreset).
// Interface removed — no longer needed server-side.

const FORMATION_PROPS: Record<string, FormationProps> = {
  "532": {
    defenders: 5, midfielders: 3, forwards: 2,
    hasCDM: false, hasCAM: false, hasWideMFs: false, hasWingers: false,
    hasWingbacks: true, wideThreats: true, centralMidCount: 3, type: "defensive"
  },
  "631A": {
    defenders: 6, midfielders: 3, forwards: 1,
    hasCDM: false, hasCAM: false, hasWideMFs: false, hasWingers: false,
    hasWingbacks: false, wideThreats: false, centralMidCount: 3, type: "defensive"
  },
  "541A": {
    defenders: 5, midfielders: 4, forwards: 1,
    hasCDM: false, hasCAM: false, hasWideMFs: true, hasWingers: false,
    hasWingbacks: true, wideThreats: true, centralMidCount: 2, type: "defensive"
  },
  "541B": {
    defenders: 5, midfielders: 4, forwards: 1,
    hasCDM: true, hasCAM: true, hasWideMFs: false, hasWingers: false,
    hasWingbacks: false, wideThreats: false, centralMidCount: 4, type: "defensive"
  },
  "5311": {
    defenders: 5, midfielders: 3, forwards: 1,
    hasCDM: false, hasCAM: true, hasWideMFs: false, hasWingers: false,
    hasWingbacks: true, wideThreats: false, centralMidCount: 3, type: "defensive"
  },
  "442A": {
    defenders: 4, midfielders: 4, forwards: 2,
    hasCDM: false, hasCAM: false, hasWideMFs: true, hasWingers: false,
    hasWingbacks: false, wideThreats: true, centralMidCount: 2, type: "balanced"
  },
  "442B": {
    defenders: 4, midfielders: 4, forwards: 2,
    hasCDM: true, hasCAM: true, hasWideMFs: false, hasWingers: false,
    hasWingbacks: false, wideThreats: false, centralMidCount: 4, type: "balanced"
  },
  "451": {
    defenders: 4, midfielders: 5, forwards: 1,
    hasCDM: true, hasCAM: false, hasWideMFs: true, hasWingers: false,
    hasWingbacks: false, wideThreats: true, centralMidCount: 3, type: "balanced"
  },
  "4231": {
    defenders: 4, midfielders: 5, forwards: 1,
    hasCDM: true, hasCAM: true, hasWideMFs: true, hasWingers: false,
    hasWingbacks: false, wideThreats: true, centralMidCount: 3, type: "balanced"
  },
  "433A": {
    defenders: 4, midfielders: 3, forwards: 3,
    hasCDM: false, hasCAM: true, hasWideMFs: false, hasWingers: true,
    hasWingbacks: false, wideThreats: true, centralMidCount: 2, type: "attacking"
  },
  "433B": {
    defenders: 4, midfielders: 3, forwards: 3,
    hasCDM: true, hasCAM: false, hasWideMFs: false, hasWingers: true,
    hasWingbacks: false, wideThreats: true, centralMidCount: 3, type: "attacking"
  },
  "424": {
    defenders: 4, midfielders: 2, forwards: 4,
    hasCDM: false, hasCAM: false, hasWideMFs: false, hasWingers: true,
    hasWingbacks: false, wideThreats: true, centralMidCount: 2, type: "attacking"
  },
  "343A": {
    defenders: 3, midfielders: 4, forwards: 3,
    hasCDM: false, hasCAM: true, hasWideMFs: true, hasWingers: true,
    hasWingbacks: true, wideThreats: true, centralMidCount: 2, type: "attacking"
  },
  "343B": {
    defenders: 3, midfielders: 4, forwards: 3,
    hasCDM: true, hasCAM: false, hasWideMFs: true, hasWingers: true,
    hasWingbacks: true, wideThreats: true, centralMidCount: 3, type: "attacking"
  },
  "3322": {
    defenders: 3, midfielders: 3, forwards: 4,
    hasCDM: false, hasCAM: true, hasWideMFs: false, hasWingers: true,
    hasWingbacks: false, wideThreats: true, centralMidCount: 3, type: "attacking"
  },
};

// NOTE: Opponent preset generation has been moved entirely to the client side
// (App.tsx → computeOppPreset). The server no longer needs this function.
// The isPresetCalculation branch in the serve handler is kept for backward
// compatibility only and now returns an empty success response.

// ==================== ARCHITECTURAL CONSTRAINT FUNCTIONS ====================
// Hard tactical invariants. These override the DB — they are structural
// impossibilities, not suggestions.

/**
 * RULE 1 – FULLBACK/WINGBACK INVARIANT
 * Source: adrian2255 Part 2 – "Attacking Fullbacks" section
 *
 * 4-DEFENDER SYSTEMS:
 *   NEVER attacking fullbacks when opponent has wide threats (LM/RM/LW/RW).
 *   Structural: exposes our fullback to unavoidable 2v1 in wide area.
 *
 * 3-DEFENDER SYSTEMS:
 *   Wide MFs ARE wingbacks — their advance is structural, not instructional.
 *   Wingback overlaps from 3-CB pair are architecturally different from 4-back.
 *
 * 5-6 DEFENDER SYSTEMS:
 *   Always Defend Deep — defensive formations by design.
 */
function fullbackRule(
  ourProps: FormationProps,
  oppProps: FormationProps,
  oppGamePlan: string,
  strength: string
): string {
  const defCount = ourProps.defenders;
  const oppWide = oppProps.wideThreats || oppProps.hasWideMFs || oppProps.hasWingers;
  const oppWing = oppGamePlan === "wing" || oppGamePlan === "Wing Play";

  if (defCount === 3) {
    if (strength === "much-weaker") return "Defend Deep";
    if (strength === "weaker" && (oppWide || oppWing)) return "Defend Deep";
    return "Support Midfield";
  }

  if (defCount === 4) {
    // HARD INVARIANT: never attacking fullbacks vs wide threats
    if (oppWide || oppWing) return "Defend Deep";

    const safeForAttacking =
      !oppWide && !oppWing && !oppProps.hasWingers && !oppProps.hasWideMFs &&
      (strength === "stronger" || strength === "much-stronger");
    if (safeForAttacking) return "Attacking Fullbacks";
    if (!oppWide && !oppWing && strength === "equal") return "Attacking Fullbacks";
    return "Defend Deep";
  }

  return "Defend Deep"; // 5-6 defenders
}

/**
 * RULE 2 – MARKING INVARIANT
 * Source: adrian2255 Part 2 + Rachid-Hilmi Roadmap Step 8
 *
 * 5-6 defenders: Man-to-Man MANDATORY
 * "With 5-6 defenders, zonal collapses catastrophically on red card."
 */
function markingRule(ourProps: FormationProps, pressing: number): string {
  if (ourProps.defenders >= 5) return "Man-to-Man";
  if (ourProps.defenders === 4) return "Man-to-Man";
  return pressing >= 55 ? "Man-to-Man" : "Zonal";
}

/**
 * RULE 3 – OFFSIDE TRAP INVARIANT
 * Source: Rachid-Hilmi Roadmap Step 9
 *
 * "Only gamble on offside trap with FEW defenders (3 or 4) and HIGH pressure."
 * "AVOID with 5-6 defenders — coordination failure >90% of attempts."
 */
function offsideTrapRule(ourProps: FormationProps, pressing: number): boolean {
  if (ourProps.defenders >= 5) return false;
  if (pressing < 35) return false;
  if (ourProps.defenders === 4 && pressing >= 45) return true;
  if (ourProps.defenders === 3 && pressing >= 35) return true;
  return false;
}

/**
 * RULE 4 – MIDFIELD LINE COHERENCE INVARIANT
 * Source: adrian2255 Part 2 – "Push Forward" and "Protect Defense" sections
 *
 * Low press + Push Forward = defensive collapse
 * High press + Protect Defense = shape impossibility
 * Push Forward requires CDM — without CDM leaves void between MF and defense
 */
function validateMidfieldLine(
  pressing: number,
  midfieldInstruction: string,
  ourProps: FormationProps
): string {
  if (pressing < 35 && midfieldInstruction === "Push Forward") {
    return ourProps.defenders >= 5 ? "Protect Defense" : "Stay in Position";
  }
  if (pressing > 68 && midfieldInstruction === "Protect Defense") {
    return "Stay in Position";
  }
  if (midfieldInstruction === "Push Forward" && !ourProps.hasCDM) {
    return "Stay in Position";
  }
  return midfieldInstruction;
}

/**
 * RULE 5 – FORWARD LINE COHERENCE
 * Source: adrian2255 Part 2 + Rachid-Hilmi Roadmap Step 3
 */
function validateForwardLine(
  forwardInstruction: string,
  pressing: number,
  ourProps: FormationProps,
  oppProps: FormationProps
): string {
  if (forwardInstruction === "Drop Deep" && pressing > 40) return "Attack Only";
  if (
    forwardInstruction === "Support Midfield" &&
    oppProps.defenders < 5 &&
    ourProps.forwards > 1
  ) return "Attack Only";
  return forwardInstruction;
}

/**
 * RULE 6 – CDM/CAM SPATIAL NEUTRALIZATION ANALYSIS
 * Source: adrian2255 Part 1 – "CDM neutralizes CAM" section
 *
 * "By being operational in that area, the CDM neutralises the opponent's CAM,
 *  as he'd constantly bump into the yellow CDM."
 */
function camNeutralizationRule(
  ourProps: FormationProps,
  oppProps: FormationProps,
  ourFormationKey: string,
  oppFormationKey: string
): string[] {
  const constraints: string[] = [];

  if (ourProps.hasCDM && oppProps.hasCAM) {
    constraints.push(
      `${ourFormationKey} CDM spatially neutralizes ${oppFormationKey} CAM — operates in identical zone, constant positional collision prevents opponent playmaker from receiving balls through the lines.`
    );
  }
  if (oppProps.hasCAM && !ourProps.hasCDM) {
    constraints.push(
      `⚠ STRUCTURAL VULNERABILITY: Our ${ourFormationKey} has no CDM to cover ${oppFormationKey}'s CAM — CAM operates freely in the space between our midfield and defensive line. Compensate with high pressing and man-marking.`
    );
  }
  if (ourProps.hasCAM && oppProps.hasCDM) {
    constraints.push(
      `Our CAM meets opponent's CDM in same zone — CAM must shift laterally to escape coverage. Use lower tempo and patient build-up to create passing angles around the CDM block.`
    );
  }
  if (ourProps.hasWingers && !oppProps.hasWideMFs && oppProps.defenders === 4) {
    constraints.push(
      `Our wingers exploit space behind opponent's fullbacks — ${oppFormationKey} has no LM/RM defensive cover in wide areas, creating 1v1 and 2v1 opportunities on the flanks.`
    );
  }
  if (ourProps.hasWingbacks && !oppProps.hasWingbacks && oppProps.defenders <= 4) {
    constraints.push(
      `Our wingbacks provide structural width opponent cannot match — opponent ${oppFormationKey} must choose between defending the center or the flanks, never both simultaneously.`
    );
  }
  if (ourProps.centralMidCount > oppProps.centralMidCount) {
    const diff = ourProps.centralMidCount - oppProps.centralMidCount;
    constraints.push(
      `Central midfield superiority: +${diff} player advantage. Opponent ${oppFormationKey}'s midfield is outnumbered — constant passing options available, defensive transitions controlled.`
    );
  }
  if (oppProps.centralMidCount <= 2 && ourProps.centralMidCount >= 4) {
    constraints.push(
      `${oppFormationKey}'s thin central midfield is overwhelmed — exploit numerical dominance by overloading the center before switching wide.`
    );
  }
  return constraints;
}

/**
 * RULE 7 – SLIDER COHERENCE VALIDATION
 * Source: Rachid-Hilmi Roadmap Steps 4-6
 */
function validateSliderCoherence(
  pressing: number,
  style: number,
  tempo: number,
  gamePlan: string,
  ourProps: FormationProps,
  strength: string
): { pressing: number; style: number; tempo: number } {
  let p = pressing, s = style, t = tempo;
  const gp = gamePlan.toLowerCase();
  const isAttacking = gp.includes("wing") || gp.includes("passing") || gp.includes("attacking");
  const isDefensive = gp.includes("counter") || gp.includes("long ball") || gp.includes("shoot");

  if (isAttacking && p < 40) p = 45;
  if (isDefensive && p > 75) p = 70;
  if (ourProps.type === "attacking" && s < 35) s = 40;
  if (ourProps.type === "defensive" && s > 70) s = 65;
  if ((strength === "weaker" || strength === "much-weaker") && t > 72) t = 65;
  if ((strength === "stronger" || strength === "much-stronger") && t < 45) t = 50;

  return { pressing: p, style: s, tempo: t };
}

/**
 * MASTER CONSTRAINT APPLICATOR
 * Takes a raw DB strategy and passes it through ALL seven constraint rules
 * in dependency order. Nothing bypasses this function.
 */
function applyArchitecturalConstraints(
  rawStrategy: any,
  ourFormationKey: string,
  oppFormationKey: string,
  oppGamePlan: string,
  strength: string
): any {
  const ourProps = FORMATION_PROPS[ourFormationKey] ?? FORMATION_PROPS["4231"];
  const oppProps = FORMATION_PROPS[oppFormationKey] ?? FORMATION_PROPS["442A"];

  const s = { ...rawStrategy, lineInstructions: { ...(rawStrategy.lineInstructions ?? {}) } };
  const li = s.lineInstructions;

  // Step 1: Slider coherence (drives all other rules)
  const coherent = validateSliderCoherence(s.pressing, s.style, s.tempo, s.gamePlan, ourProps, strength);
  s.pressing = coherent.pressing;
  s.style    = coherent.style;
  s.tempo    = coherent.tempo;

  // Step 2: Marking rule (absolute for 5+ defenders)
  s.marking = markingRule(ourProps, s.pressing);
  s.defensiveConfig = { ...(s.defensiveConfig ?? {}), marking: s.marking };

  // Step 3: Offside trap
  const offside = offsideTrapRule(ourProps, s.pressing);
  s.offsideTrap = offside;
  s.defensiveConfig.offside = offside ? "Yes" : "No";

  // Step 4: Fullback rule (architectural impossibility)
  const correctedDefLine = fullbackRule(ourProps, oppProps, oppGamePlan, strength);
  li.defense = correctedDefLine;

  // Step 5: Midfield line coherence
  li.midfield = validateMidfieldLine(s.pressing, li.midfield ?? "Stay in Position", ourProps);

  // Step 6: Forward line coherence
  li.attack = validateForwardLine(li.attack ?? "Attack Only", s.pressing, ourProps, oppProps);

  // Step 7: CDM/CAM battle analysis
  s.criticalConstraints = camNeutralizationRule(ourProps, oppProps, ourFormationKey, oppFormationKey);

  // Audit trail
  const corrections: string[] = [];
  if (rawStrategy.marking !== s.marking) {
    corrections.push(`Marking: ${rawStrategy.marking ?? "Zonal"} → ${s.marking} [${ourProps.defenders >= 5 ? "5+ defender invariant" : "red-card resilience"}]`);
  }
  if (rawStrategy.offsideTrap !== offside) {
    corrections.push(`Offside trap: ${rawStrategy.offsideTrap} → ${offside} [${ourProps.defenders >= 5 ? "5+ defender coordination impossible" : `pressing ${s.pressing} below threshold`}]`);
  }
  if ((rawStrategy.lineInstructions?.defense ?? "Defend Deep") !== correctedDefLine) {
    corrections.push(`Defense line: "${rawStrategy.lineInstructions?.defense}" → "${correctedDefLine}" [fullback rule: ${oppProps.wideThreats ? "opponent has wide threats" : "3-back wingback structural rule"}]`);
  }
  if ((rawStrategy.lineInstructions?.midfield) !== li.midfield) {
    corrections.push(`Midfield line: "${rawStrategy.lineInstructions?.midfield}" → "${li.midfield}" [pressing-MF contradiction eliminated]`);
  }
  s.architecturalCorrections = corrections;

  return s;
}

// ==================== ENHANCED FORMATION COUNTER DATABASE ====================
// Base strategies — all values pass through applyArchitecturalConstraints() before delivery.
// Source: 18,900+ match analysis, adrian2255 framework, Rachid-Hilmi framework

const FORMATION_COUNTER_DATABASE: Record<string, Record<string, any>> = {

  "532": {
    "much-weaker": {
      formation: "442A", gamePlan: "Counter Attack", winProb: 28,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 30, style: 35, tempo: 40, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "4-4-2A wide midfielders exploit the gap between opponent's 3 CBs and 2 FBs. Man-marking mandatory with our 5-defender shape for red-card resilience. Ultra-low press lures opponent into deep overcommitment creating space for counters. Offside trap architecturally disabled with 5 defenders.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 25, style: 30, tempo: 35, explanation: "5-MF numerical overload congests the opponent's thin 3-man midfield. SOS bypasses deep block through speculative long-range shots." }
      ],
      tacticalPrinciples: [
        "Man-to-Man marking MANDATORY with 5+ defenders — zonal collapses on red card",
        "Pressing 30 lures opponent into committed attack, exposes space for counters",
        "Wide MFs target the seam between opponent CBs and FBs",
        "Offside trap disabled — coordination impossible with 5 defenders"
      ]
    },
    "weaker": {
      formation: "433B", gamePlan: "Wing Play", winProb: 38,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 40, style: 45, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "433B CDM spatially neutralizes any opponent CAM by operating in the same zone. Wingers overload the 3-CB system from outside. Reduced pressing lures opponent's wingbacks forward, creating space in behind for counter-attacks.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Passing Game", pressing: 45, style: 50, tempo: 60, explanation: "Midfield diamond controls center. CAM operates in blind spot between opponent's 3 CMs." }
      ],
      tacticalPrinciples: [
        "CDM neutralizes opponent's transitional midfield passes",
        "Wingers isolate 3 CBs — 2v1 in wide areas structurally guaranteed",
        "Reduced press invites overcommitment then triggers quick counter",
        "Man-marking maintains 5-defender shape through any disciplinary event"
      ]
    },
    "equal": {
      formation: "4231", gamePlan: "Passing Game", winProb: 52,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 55, style: 50, tempo: 60, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "4-2-3-1 midfield diamond controls the center versus opponent's 3 narrow CMs. CAM operates in the blind spot between opponent's midfield and defense. With 4 defenders, offside trap becomes viable — pressing 55 maintains adequate high line timing.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Wing Play", pressing: 50, style: 45, tempo: 55, explanation: "CDM + 3-forward width creates overloads. Wingers exploit space behind committed opponent wingbacks." }
      ],
      tacticalPrinciples: [
        "CAM operates in opponent's defensive blind spot between their CMs and CBs",
        "Offside trap viable with 4 defenders + pressing 55 — timing coordination achievable",
        "Man-to-Man marking for 1v1 duels AND red-card shape resilience",
        "Balanced pressing avoids overcommitting while dominating possession"
      ]
    },
    "stronger": {
      formation: "343A", gamePlan: "Wing Play", winProb: 68,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 75, style: 70, tempo: 75, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "3-4-3A wingbacks structurally overwhelm opponent's 5-defender setup — wingbacks advance as the design of the formation, not as an instruction override. High press (75) triggers errors in opponent's narrow 3-man midfield. With only 3 CBs, offside trap coordination is viable.",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 80, style: 75, tempo: 80, explanation: "Double CAMs create permanent central overload. Opponent's 3 CMs cannot cover 2 CAMs + 2 strikers simultaneously." }
      ],
      tacticalPrinciples: [
        "Wingbacks create structural width — 5-back cannot cover their overlapping runs",
        "High press (75) triggers opponent passing errors in congested midfield",
        "Offside trap viable with 3 CBs + high press maintaining coordinated line",
        "Aggressive tackling forces turnovers in opponent's defensive build-up"
      ]
    },
    "much-stronger": {
      formation: "3322", gamePlan: "Attacking", winProb: 82,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 85, style: 80, tempo: 85, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "3-3-2-2 midfield superiority crushes opponent's 3-man structure completely. Double CAMs occupy every central and transitional zone. Maximum pressing (85) makes possession impossible. Offside trap catches desperate long balls from opponent's overwhelmed defense.",
      alternativeStrategies: [
        { formation: "343A", gamePlan: "Wing Play", pressing: 80, style: 75, tempo: 80, explanation: "Wingback width combined with CAM central presence creates uncounterable overloads." }
      ],
      tacticalPrinciples: [
        "Double CAM creates permanent 2v1 in opponent's defensive midfield zone",
        "Offside trap catches desperate long balls from overwhelmed 3-man midfield",
        "Man-marking on 3 CBs: disruption + shape maintained on any red card",
        "Pressing 85 makes controlled build-up physically impossible for opponent"
      ]
    }
  },

  "631A": {
    "much-weaker": {
      formation: "532", gamePlan: "Counter Attack", winProb: 22,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Drop Deep" },
      pressing: 20, style: 25, tempo: 30, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "Mirror opponent's defensive depth. Man-marking CRITICAL with our 5 defenders — zonal collapses catastrophically if CB receives red card. Ultra-low press (20) lures opponent out of their deep shell. Counter through wide areas.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 15, style: 20, tempo: 25, explanation: "Park the bus with 5 midfielders, speculative shots on loose balls." }
      ],
      tacticalPrinciples: [
        "Man-marking MANDATORY: zonal catastrophically fails with 5+ defenders on red card",
        "Pressing 20 lures opponent deep, creates counter space",
        "Offside trap impossible: 5-defender coordination failure rate >90%",
        "Drop deep striker provides 10th outfield player in defensive block"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 32,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 25, style: 30, tempo: 40, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5 midfielders overwhelm opponent's 3-man midfield numerically (+2 advantage). SOS bypasses the ultra-packed 6-defender block — no penetration required. Man-marking mandatory with our 4 defenders for red-card resilience.",
      alternativeStrategies: [
        { formation: "442A", gamePlan: "Counter Attack", pressing: 30, style: 35, tempo: 45, explanation: "Wide MFs exploit the seams behind opponent's committed fullbacks." }
      ],
      tacticalPrinciples: [
        "5-MF overload neutralizes opponent's 3 central midfielders",
        "SOS bypasses the deep block — long shots exploit exposed goalkeeper",
        "Man-marking handles lone striker, prevents him dropping deep for link play",
        "Low press invites opponent forward, then counter through gaps"
      ]
    },
    "equal": {
      formation: "442A", gamePlan: "Wing Play", winProb: 48,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 45, style: 40, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "Wide MFs in 4-4-2A isolate opponent's 3 CBs — width stretches narrow 6-back structure beyond capacity. Crosses target the space between CBs and GK. Offside trap disabled (opponent's 6-defender coordination makes their counters slow).",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Passing Game", pressing: 50, style: 45, tempo: 60, explanation: "CDM controls center, wingers stretch the 3-CB system." }
      ],
      tacticalPrinciples: [
        "Wide MFs create 2v1 vs opponent's CBs in wide areas",
        "Man-marking maintains defensive shape for any red card scenario",
        "Offside trap not needed vs slow 6-defender structure",
        "Wing play exploits narrow defensive setup — opponent cannot cover width"
      ]
    },
    "stronger": {
      formation: "433A", gamePlan: "Wing Play", winProb: 62,
      lineInstructions: { defense: "Attacking Fullbacks", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 60, style: 55, tempo: 65, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "631A has no wide midfielders — no LM/RM threat to expose our advancing fullbacks. Double width (FBs + LW/RW) overwhelms their 4 available wide defenders. CAM exploits the gap between opponent's 3 narrow CMs and 6 CBs.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 65, style: 60, tempo: 70, explanation: "CDM provides security for advancing fullbacks. CAM exploits space behind opponent's defensive midfield gap." }
      ],
      tacticalPrinciples: [
        "631A has no LM/RM — attacking fullbacks safe: no 2v1 wide threat from opponent",
        "CAM operates in space between 3 CMs and 6-back defensive block",
        "Offside trap viable: 4 defenders + pressing 60 = coordinated line movement",
        "Man-marking disrupts opponent's lone striker link play"
      ]
    },
    "much-stronger": {
      formation: "343A", gamePlan: "Attacking", winProb: 75,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 75, style: 70, tempo: 75, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "Total width dominance: 3-4-3A wingbacks advance structurally — opponent's 6-back cannot track them without leaving CBs isolated. High press (75) denies the defensive setup time to organize.",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 80, style: 75, tempo: 80, explanation: "Double CAMs + 2 strikers create 4-player overload in opponent's weak forward area." }
      ],
      tacticalPrinciples: [
        "Wingback structural advance cannot be tracked by static 6-back",
        "3 CBs + high press = viable offside trap coordination",
        "Man-marking on 3 CBs: maximum disruption + red-card resilience",
        "High press (75) triggers errors in opponent's forced long ball game"
      ]
    }
  },

  "541A": {
    "much-weaker": {
      formation: "451", gamePlan: "Counter Attack", winProb: 25,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 25, style: 30, tempo: 40, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "451 matches and overloads opponent's 4-MF line with 5 of our own (+1 CDM advantage). CDM neutralizes any floating midfield presence. Man-marking MANDATORY with our 4 defenders. Low press lures opponent wide MFs forward creating counter space.",
      alternativeStrategies: [
        { formation: "442B", gamePlan: "Counter Attack", pressing: 30, style: 35, tempo: 45, explanation: "Diamond MF nullifies opponent's LM/RM movements. CDM covers the central channel." }
      ],
      tacticalPrinciples: [
        "5 MFs vs 4 MFs: +1 central advantage controls game tempo",
        "Man-to-Man mandatory with 4 defenders for red-card resilience",
        "Low press invites opponent LM/RM forward, creates counter gaps behind",
        "Offside trap disabled: opponent has 5 defenders, coordination impractical"
      ]
    },
    "weaker": {
      formation: "442B", gamePlan: "Counter Attack", winProb: 35,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 35, style: 40, tempo: 45, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "Diamond midfield (CDM-CM-CM-CAM) counters opponent's flat 4-MF line by providing both depth (CDM) and creative threat (CAM) simultaneously. CDM covers the center while CAM exploits space behind opponent's advancing wide MFs.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Passing Game", pressing: 40, style: 45, tempo: 50, explanation: "CDM anchors center, wingers exploit the space behind opponent's wide MFs." }
      ],
      tacticalPrinciples: [
        "Diamond provides both CDM depth and CAM creativity simultaneously",
        "CAM exploits space vacated when opponent's wide MFs advance",
        "Man-marking handles opponent's lone striker, denies drop-deep link play",
        "Reduced press invites forward runs, triggers counter opportunities"
      ]
    },
    "equal": {
      formation: "433B", gamePlan: "Passing Game", winProb: 50,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 50, style: 45, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CDM dominates opponent's CAM-equivalent zone between their MF and defensive lines. LW/RW wingers stretch the 5-back horizontally beyond its coverage capacity. Offside trap viable with our 4 defenders + pressing 50.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 55, style: 50, tempo: 60, explanation: "Fullbacks overload wings against static 5-back. CAM exploits the defensive blind spot." }
      ],
      tacticalPrinciples: [
        "CDM neutralizes opponent's transitional creativity between lines",
        "LW/RW wingers force 5-back to stretch horizontally beyond coverage capacity",
        "Offside trap viable: 4 defenders + pressing 50 = coordinated high line",
        "Man-marking maintains shape for any red card event"
      ]
    },
    "stronger": {
      formation: "4231", gamePlan: "Wing Play", winProb: 65,
      lineInstructions: { defense: "Attacking Fullbacks", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 65, style: 60, tempo: 70, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "541A has LM/RM wide midfielders — but our attacking fullbacks are safe here because those opponent wide MFs are fundamentally defensive (set in a 5-back). Our LM/RM in 4231 will have positional advantage over opponent's committed wide MFs. CAM exploits blind spot.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 70, style: 65, tempo: 75, explanation: "Wingbacks + wingers overwhelm 5-back in all wide zones simultaneously." }
      ],
      tacticalPrinciples: [
        "Opponent LM/RM are defensively committed in 5-back — our FBs advance safely",
        "CAM exploits space between opponent's CMs and defensive 5",
        "Offside trap viable: 4 defenders + pressing 65 = high line timing",
        "Aggressive tackling wins second balls in crowded midfield"
      ]
    },
    "much-stronger": {
      formation: "343B", gamePlan: "Attacking", winProb: 78,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 80, style: 75, tempo: 80, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "343B CDM provides defensive security for the push-forward midfield instruction — even with MF pushed forward, CDM naturally stays deeper providing coverage. Wingbacks create structural width opponent's 5-back cannot track. Man-marking on 3 CBs. Pressing 80 makes opponent's defensive build-up impossible.",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 85, style: 80, tempo: 85, explanation: "Double CAMs + 2 strikers create total forward overload." }
      ],
      tacticalPrinciples: [
        "343B CDM: the only safe formation for 'Push Forward' midfield instruction",
        "Wingbacks + wingers = 4 wide attacking threats opponent's 5-back cannot cover",
        "Man-marking on 3 CBs: maximum disruption + any-red-card resilience",
        "Pressing 80 denies any controlled build-up from 5-back"
      ]
    }
  },

  "541B": {
    "much-weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 24,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 20, style: 25, tempo: 35, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "541B diamond midfield features CDM and CAM — our 5 MFs (+1) overload their diamond through numerical superiority. SOS bypasses their deep CDM block without requiring penetration. Ultra-low press lures their CAM forward creating counter space.",
      alternativeStrategies: [
        { formation: "532", gamePlan: "Counter Attack", pressing: 25, style: 30, tempo: 40, explanation: "Extra CB handles their lone striker, counter through wide areas vacated by their advancing CAM." }
      ],
      tacticalPrinciples: [
        "5 MFs vs diamond 4 MFs: +1 advantage neutralizes their structural depth",
        "SOS bypasses CDM defensive coverage through long-range speculative shots",
        "Man-marking handles lone striker, denies drop-deep movements",
        "Ultra-low press creates counter space when their CAM advances"
      ]
    },
    "weaker": {
      formation: "442B", gamePlan: "Counter Attack", winProb: 34,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 30, style: 35, tempo: 45, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "Our 442B diamond mirrors opponent's diamond — CDM vs CDM, CAM vs CAM. But our 2 forwards create pressure their lone striker cannot reciprocate. Counter through central channels when opponent's CAM overcommits forward.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Passing Game", pressing: 35, style: 40, tempo: 50, explanation: "CDM neutralizes their CAM spatially. LW/RW wingers stretch their narrow diamond structure." }
      ],
      tacticalPrinciples: [
        "Diamond vs diamond: our 2 forwards create asymmetric forward pressure",
        "CDM tracks opponent's CAM — spatial collision prevents their playmaking",
        "Counter through central channels when their CAM overcommits",
        "Man-marking maintains shape through any disciplinary event"
      ]
    },
    "equal": {
      formation: "433B", gamePlan: "Passing Game", winProb: 49,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 45, style: 40, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "433B CDM neutralizes opponent's CAM by operating in the same central zone. LW/RW wingers exploit space behind opponent's wingbacks — 541B has no dedicated wide defensive MFs, only 5 static defenders. Offside trap viable with 4 defenders + pressing 45.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 50, style: 45, tempo: 60, explanation: "CDM + LM/RM in 4231 simultaneously neutralizes their CAM and exploits their wingback space." }
      ],
      tacticalPrinciples: [
        "CDM neutralizes opponent's CAM — spatial collision constant across game",
        "LW/RW exploit space behind opponent's wingbacks who have no LM/RM support",
        "Offside trap viable: 4 defenders + pressing 45 = line timing achievable",
        "Man-marking disrupts rhythm in opponent's narrow diamond"
      ]
    },
    "stronger": {
      formation: "4231", gamePlan: "Wing Play", winProb: 64,
      lineInstructions: { defense: "Attacking Fullbacks", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 60, style: 55, tempo: 70, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "541B's diamond has no wide MFs — attacking fullbacks SAFE: no opponent LM/RM to create 2v1 wide exposure. Our advancing fullbacks + LM/RM in 4231 creates 4-wide attacking presence vs their 5 static defenders. CDM blocks opponent CAM.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 65, style: 60, tempo: 75, explanation: "Wingbacks + CDM create structural width and central security simultaneously." }
      ],
      tacticalPrinciples: [
        "541B diamond has no LM/RM — attacking fullbacks safe from wide 2v1 exposure",
        "4-wide presence (FB+LM / FB+RM) overwhelms static 5-back",
        "Offside trap viable: 4 defenders + pressing 60 = coordinated high line",
        "CDM blocks opponent CAM's passing lanes through the center"
      ]
    },
    "much-stronger": {
      formation: "343B", gamePlan: "Attacking", winProb: 77,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 75, style: 70, tempo: 80, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "343B is the only 3-defender formation with CDM — allowing safe Push Forward midfield instruction. Wingback structural advance cannot be tracked by opponent's 5-back + diamond. Man-marking on 3 CBs provides disciplinary resilience.",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 80, style: 75, tempo: 85, explanation: "Complete structural dominance in every zone." }
      ],
      tacticalPrinciples: [
        "CDM safety: Push Forward safe in 343B because CDM stays deeper automatically",
        "Wingbacks overwhelm opponent's static 5-back in wide areas",
        "Man-marking on 3 CBs: disruption + shape through any red card",
        "High press (75) denies opponent's CAM time on ball"
      ]
    }
  },

  "5311": {
    "much-weaker": {
      formation: "451", gamePlan: "Counter Attack", winProb: 23,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Drop Deep" },
      pressing: 15, style: 20, tempo: 30, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "451 creates 10-man defensive block matching opponent's compactness. Man-marking CRITICAL — our 4 defenders need man-marking for any red-card scenario. Ultra-low press (15) lures opponent's CAM out of position. Counter through wide areas when opponent overcommits.",
      alternativeStrategies: [
        { formation: "532", gamePlan: "Long Ball", pressing: 20, style: 25, tempo: 35, explanation: "5-back handles opponent's front pair. Long balls bypass committed 5-defender block." }
      ],
      tacticalPrinciples: [
        "Man-marking: essential vs 5-back opponent, maintains our 4-defender shape on red card",
        "Press 15 lures opponent's CAM into advanced positions creating space behind",
        "Offside trap impossible: our 4 defenders vs their 5 defenders + CAM complexity",
        "Drop deep striker creates 10-man defensive block"
      ]
    },
    "weaker": {
      formation: "442B", gamePlan: "Counter Attack", winProb: 33,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 25, style: 30, tempo: 40, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "442B diamond provides CDM coverage for opponent's dual-level threat (CAM + forwards). Counter through central channels when opponent overcommits with both CAM and forwards. Man-marking maintains 4-back shape stability.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Passing Game", pressing: 30, style: 35, tempo: 45, explanation: "CDM neutralizes opponent's CAM spatially. Patient passing finds gaps in 5-back." }
      ],
      tacticalPrinciples: [
        "Diamond CDM tracks opponent's CAM — spatial collision constant",
        "Counter through central channels vacated when opponent's CAM goes forward",
        "Man-marking prevents opponent's CAM from dropping deep to receive",
        "Reduced press invites overcommitment then punishes on counter"
      ]
    },
    "equal": {
      formation: "433B", gamePlan: "Passing Game", winProb: 48,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 40, style: 35, tempo: 50, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "433B CDM neutralizes opponent's CAM — same spatial zone, constant collision. LW/RW wingers exploit space behind opponent's 5 static defenders (5311 has no wide MFs, only wingbacks). Offside trap viable with our 4 defenders + pressing 40.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 45, style: 40, tempo: 55, explanation: "CDM + LM/RM combination covers both CAM neutralization and wide exploitation." }
      ],
      tacticalPrinciples: [
        "CDM neutralizes 5311's CAM — spatial collision denies their playmaking",
        "LW/RW exploit gaps behind 5-back which has no wide MF support",
        "Offside trap viable: 4 defenders + pressing 40 = achievable coordination",
        "Man-marking prevents both CAM and forwards from exploiting space"
      ]
    },
    "stronger": {
      formation: "4231", gamePlan: "Wing Play", winProb: 63,
      lineInstructions: { defense: "Attacking Fullbacks", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 55, style: 50, tempo: 65, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "5311 has no LM/RM wide midfielders — attacking fullbacks SAFE from 2v1 exposure. Our advancing fullbacks + 4231's LM/RM creates 4-wide attacking presence vs 5311's central compaction. CDM blocks opponent's CAM.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 60, style: 55, tempo: 70, explanation: "Wingbacks overwhelm opponent's 5-back laterally." }
      ],
      tacticalPrinciples: [
        "5311 has no LM/RM — attacking fullbacks safe: no wide 2v1 created",
        "4-wide presence overwhelms opponent's centrally-packed 5-back",
        "Offside trap viable: 4 defenders + pressing 55",
        "CDM blocks opponent's CAM spatial zone continuously"
      ]
    },
    "much-stronger": {
      formation: "343B", gamePlan: "Attacking", winProb: 76,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 70, style: 65, tempo: 75, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "343B CDM enables safe Push Forward midfield instruction — CDM stays deeper than other MFs even when they push forward, maintaining central defensive coverage. Wingback structural width overwhelms opponent's 5-back.",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 75, style: 70, tempo: 80, explanation: "Double CAMs + 2 strikers create total forward zone overload." }
      ],
      tacticalPrinciples: [
        "CDM in 343B: safety mechanism for 'Push Forward' — stays deeper naturally",
        "Wingbacks overwhelm 5-back's wide coverage capacity",
        "Man-marking on 3 CBs: maximum disruption + red-card resilience",
        "High press (70) denies opponent's CAM time and space to operate"
      ]
    }
  },

  "442B": {
    "much-weaker": {
      formation: "532", gamePlan: "Counter Attack", winProb: 30,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 25, style: 30, tempo: 35, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "Extra CB in 532 handles opponent's 2 forwards simultaneously while 3 central MFs counter opponent's diamond midfield. Man-marking mandatory with 5 defenders. Counter through wide areas — opponent's diamond has no LM/RM so wide channels are unprotected.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 20, style: 25, tempo: 30, explanation: "5-MF vs diamond creates +1 central advantage. SOS exploits weak defensive transitions." }
      ],
      tacticalPrinciples: [
        "532 extra CB handles both opponent forwards — 3v2 defensive superiority",
        "Man-marking mandatory: 5 defenders cannot maintain zonal shape on red card",
        "Diamond has no LM/RM — wide areas completely unprotected for counters",
        "Low press lures diamond forward, creates space behind them"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 40,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 35, style: 40, tempo: 45, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5 MFs vs 4-diamond creates +1 midfield superiority. SOS exploits defensive transitions when opponent's diamond is caught high. Opponent's 442B diamond has no wide players — our wide MFs have 1v1 opportunities against fullbacks.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Passing Game", pressing: 40, style: 45, tempo: 50, explanation: "CDM spatially neutralizes opponent's CAM. LW/RW exploit empty wide areas." }
      ],
      tacticalPrinciples: [
        "+1 central midfield advantage: 5 MFs overload opponent's 4-diamond",
        "Diamond has no LM/RM — our wide MFs face only 1 fullback each",
        "SOS exploits diamond's slow defensive transitions",
        "Man-marking provides 4-defender red-card resilience"
      ]
    },
    "equal": {
      formation: "433B", gamePlan: "Passing Game", winProb: 53,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 55, style: 50, tempo: 60, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "433B CDM spatially neutralizes opponent's CAM — they occupy the same central zone, CDM constantly blocking CAM's passing lanes. LW/RW exploit wide areas empty due to diamond's lack of wide MFs. Offside trap viable with our 4 defenders + pressing 55.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 60, style: 55, tempo: 65, explanation: "CDM + LM/RM creates complete coverage of both CAM neutralization and wide exploitation." }
      ],
      tacticalPrinciples: [
        "CDM neutralizes opponent's CAM — same spatial zone, permanent collision",
        "Diamond's lack of LM/RM: our LW/RW face only fullbacks in wide areas",
        "Offside trap viable: 4 defenders + pressing 55 = line timing achievable",
        "Man-marking disrupts diamond's positional rhythm and passing triangles"
      ]
    },
    "stronger": {
      formation: "4231", gamePlan: "Wing Play", winProb: 67,
      lineInstructions: { defense: "Attacking Fullbacks", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 70, style: 65, tempo: 75, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "442B diamond has NO wide MFs (LM/RM) — attacking fullbacks SAFE: opponent cannot create 2v1 wide situations. Our advancing fullbacks face only opponent fullbacks in wide areas. CDM in 4231 blocks their CAM spatially.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 75, style: 70, tempo: 80, explanation: "Wingbacks overwhelm opponent's fullbacks in wide areas with structural attacking advance." }
      ],
      tacticalPrinciples: [
        "Diamond has no LM/RM — attacking fullbacks SAFE: no opponent wide threat exists",
        "CDM blocks opponent's CAM in same spatial zone continuously",
        "4-wide presence (FB+LM/RM both sides) vs 4 defenders = constant overload",
        "Offside trap viable: 4 defenders + pressing 70"
      ]
    },
    "much-stronger": {
      formation: "343B", gamePlan: "Attacking", winProb: 80,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 80, style: 75, tempo: 85, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "343B CDM enables safe Push Forward instruction — CDM stays deeper naturally providing defensive security. Wingbacks create structural width opponent's diamond cannot track (no wide MFs to respond).",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 85, style: 80, tempo: 85, explanation: "Double CAMs + 2 strikers create permanent 4-player attacking overload." }
      ],
      tacticalPrinciples: [
        "343B CDM: Push Forward safe because CDM anchors defense naturally",
        "Wingback structural advance overwhelms diamond's full-back coverage",
        "Man-marking on 3 CBs: maximum disruption + red-card resilience",
        "Pressing 80 denies opponent's diamond time to build up possession"
      ]
    }
  },

  "442A": {
    "much-weaker": {
      formation: "532", gamePlan: "Counter Attack", winProb: 29,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 25, style: 30, tempo: 35, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "532 provides extra CB to handle opponent's dual wide MF threat — our 3 CBs handle 2 forwards while wingbacks track LM/RM. Man-marking MANDATORY with 5 defenders. 442A's wide MFs would otherwise create 2v1 situations vs our fullbacks — extra defender eliminates this.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 20, style: 25, tempo: 30, explanation: "5-MF overload neutralizes opponent's 4-MF flat line including wide MFs." }
      ],
      tacticalPrinciples: [
        "532 wingbacks specifically counter 442A's LM/RM wide threats",
        "Man-marking MANDATORY: 5 defenders zonal collapses on any red card",
        "Wide MFs lured forward creating space behind — counter exploits gap",
        "Offside trap impossible with 5 defenders"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 39,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 35, style: 40, tempo: 45, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5 MFs vs 4 MFs (+1 advantage) including our own wide MFs to counter opponent's LM/RM. SOS exploits weak defensive transitions when opponent's wide MFs advance. Our LM/RM in 451 directly mirrors and neutralizes opponent's LM/RM in 442A.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Passing Game", pressing: 40, style: 45, tempo: 50, explanation: "CDM provides central security, LW/RW exploit wide areas beyond opponent's coverage." }
      ],
      tacticalPrinciples: [
        "Our LM/RM in 451 directly neutralizes opponent's LM/RM in 442A",
        "+1 central advantage with CDM providing additional defensive coverage",
        "SOS exploits weak defensive transitions after wide MF overcommitment",
        "Man-marking provides 4-defender shape stability"
      ]
    },
    "equal": {
      formation: "433B", gamePlan: "Passing Game", winProb: 52,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 55, style: 50, tempo: 60, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "433B CDM provides central security against opponent's CM penetration while LW/RW exploit the space behind opponent's advancing LM/RM. 442A's wide MFs advance forward — their defensive line becomes thin, offside trap viable.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 60, style: 55, tempo: 65, explanation: "CDM anchors center, fullbacks + LM/RM create 4-wide presence vs 442A's 2+fullbacks." }
      ],
      tacticalPrinciples: [
        "CDM anchors center when opponent's CMs advance through our lines",
        "LW/RW exploit space behind opponent's advancing LM/RM (they leave gaps)",
        "Offside trap viable: 4 defenders + pressing 55 when opponent's MFs advance",
        "Man-marking tracks all 4 opponent MFs including wide threats"
      ]
    },
    "stronger": {
      formation: "4231", gamePlan: "Wing Play", winProb: 66,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 70, style: 65, tempo: 75, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 442A HAS LM/RM wide threats — attacking fullbacks PROHIBITED here. Using 'Defend Deep' is mandatory. Our 4231 fullbacks defend deep, while our own LM/RM in the AM3 provide the width against opponent. CDM provides central security.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 75, style: 70, tempo: 80, explanation: "Wingbacks create structural width. CDM covers center. Opponent's wide MFs face our defensive wingback coverage." }
      ],
      tacticalPrinciples: [
        "⚠ CRITICAL: 442A has LM/RM — attacking fullbacks PROHIBITED (2v1 catastrophe)",
        "Defend Deep mandatory: our LM/RM in 4231 provide width instead",
        "CDM covers center against opponent's 2 CMs",
        "Offside trap viable: 4 defenders + pressing 70 = high line achievable"
      ]
    },
    "much-stronger": {
      formation: "343B", gamePlan: "Attacking", winProb: 79,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 80, style: 75, tempo: 85, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "343B's wingbacks naturally cover width while attacking — they ARE wide defenders by position, so their advance is structural not instructional. CDM ensures Push Forward is safe. Man-marking on 3 CBs. Pressing 80 makes opponent's LM/RM unable to receive effectively.",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 85, style: 80, tempo: 85, explanation: "Complete forward domination — opponent's 2 forwards face 3 CBs + wingbacks." }
      ],
      tacticalPrinciples: [
        "Wingbacks: structural wide advance — opponent's LM/RM face direct 1v1 coverage",
        "CDM safety rule: Push Forward safe because CDM anchors deeper naturally",
        "Man-marking on 3 CBs: maximum disruption + red-card resilience",
        "Pressing 80 denies opponent's LM/RM time to play effective crosses"
      ]
    }
  },

  "451": {
    "much-weaker": {
      formation: "532", gamePlan: "Counter Attack", winProb: 27,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Drop Deep" },
      pressing: 20, style: 25, tempo: 30, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "532 provides 3 CBs to handle opponent's lone striker while wingbacks track opponent's LM/RM. Man-marking MANDATORY with 5 defenders. 451's LM/RM are the primary threat — our wingbacks neutralize them in wide areas. Ultra-low press lures opponent's 5 MFs forward creating massive counter space.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 15, style: 20, tempo: 25, explanation: "Match their 5-MF structure, SOS bypasses their defensive block." }
      ],
      tacticalPrinciples: [
        "532 wingbacks specifically neutralize 451's LM/RM wide threats",
        "Man-marking MANDATORY: zonal fails catastrophically with 5 defenders on red card",
        "Ultra-low press lures 5 MFs forward — massive counter space created",
        "Offside trap impossible with 5 defenders"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 37,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 30, style: 35, tempo: 40, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "Mirror 451 structure: our 5 MFs match their 5 MFs, neutralizing their central + wide advantage. Our CDM provides superior defensive coverage vs their CDM. SOS bypasses their deep defensive block. Man-marking for 4-defender red-card resilience.",
      alternativeStrategies: [
        { formation: "442B", gamePlan: "Counter Attack", pressing: 35, style: 40, tempo: 45, explanation: "Diamond neutralizes opponent's CDM. Counter through their exposed flanks." }
      ],
      tacticalPrinciples: [
        "Mirror 5-5-1 structure neutralizes their midfield numerical advantage",
        "Our CDM vs their CDM: head-to-head spatial battle in defensive midfield zone",
        "SOS bypasses need to penetrate their deep 4-defender block",
        "Man-marking provides 4-defender shape stability"
      ]
    },
    "equal": {
      formation: "433B", gamePlan: "Passing Game", winProb: 51,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 50, style: 45, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "433B CDM neutralizes opponent's CDM zone AND provides coverage when our wingers advance. LW/RW target the space behind opponent's 5 advancing MFs — when 5 MFs push forward, defensive line thins. Offside trap viable with 4 defenders + pressing 50.",
      alternativeStrategies: [
        { formation: "442A", gamePlan: "Wing Play", pressing: 55, style: 50, tempo: 60, explanation: "Wide MF mirror: our LM/RM neutralize their LM/RM, 2 forwards create extra pressure." }
      ],
      tacticalPrinciples: [
        "CDM provides defensive security for our advancing LW/RW wingers",
        "LW/RW exploit thinning of opponent's defensive line when 5 MFs advance",
        "Offside trap viable: 4 defenders + pressing 50 = timing achievable",
        "Man-marking disrupts 5-MF inter-passing rhythm"
      ]
    },
    "stronger": {
      formation: "433A", gamePlan: "Wing Play", winProb: 65,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 65, style: 60, tempo: 70, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 451 has LM/RM — attacking fullbacks PROHIBITED (2v1 catastrophe in wide areas). Our 433A fullbacks stay deep while LW/RW provide width. CAM exploits the space between opponent's CDM and 4-back. High press forces their 5 MFs into rushed decisions.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 70, style: 65, tempo: 75, explanation: "Wingbacks provide structural width — opponent's LM/RM face direct coverage." }
      ],
      tacticalPrinciples: [
        "⚠ CRITICAL: 451 has LM/RM — attacking fullbacks PROHIBITED (2v1 exposure)",
        "Defend Deep mandatory for 4-back vs 451's wide MF threats",
        "CAM exploits space between opponent's CDM and defensive line",
        "High press (65) forces rushed passes from 5-MF structure"
      ]
    },
    "much-stronger": {
      formation: "4231", gamePlan: "Wing Play", winProb: 76,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 70, style: 65, tempo: 75, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 451 has LM/RM — defend deep enforced. Our 4231 provides CDM defensive security + CAM creative threat while fullbacks stay safely deep. LM/RM in our 4231 provide the width. Opponent's 5 MFs overwhelmed by our quality advantage.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 75, style: 70, tempo: 80, explanation: "Wingback structural width + CDM security = complete tactical dominance." }
      ],
      tacticalPrinciples: [
        "⚠ 451 LM/RM threat: Defend Deep always enforced for 4-back",
        "CDM in 4231 provides security for our advancing CAM and LM/RM",
        "Offside trap viable: 4 defenders + pressing 70 = coordinated high line",
        "Man-marking disrupts opponent's 5-MF positional structure"
      ]
    }
  },

  "4231": {
    "much-weaker": {
      formation: "532", gamePlan: "Counter Attack", winProb: 27,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Drop Deep" },
      pressing: 20, style: 25, tempo: 30, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "532 uses 5 defenders to absorb 4231's CDM+CAM+LM/RM combination. Man-marking MANDATORY with 5 defenders. 3 central MFs counter opponent's dual CDM central zone. Counter through wide areas when opponent's LM/RM advance.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 15, style: 20, tempo: 25, explanation: "5 MFs vs 5 MFs: numerical parity. SOS bypasses their technical quality." }
      ],
      tacticalPrinciples: [
        "Man-marking MANDATORY: 5 defenders must maintain shape on any red card",
        "3 CMs counter opponent's 2 CDMs in central zone",
        "LM/RM threats lured forward — wide counter space created",
        "Offside trap impossible with 5 defenders"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 37,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 30, style: 35, tempo: 40, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5 MFs vs 4231's 5 MFs: numerical parity with our CDM providing deeper coverage than opponent's CAM. SOS exploits their weaker defensive transitions after CAM overcommits. Man-marking for 4-defender resilience.",
      alternativeStrategies: [
        { formation: "442B", gamePlan: "Counter Attack", pressing: 35, style: 40, tempo: 45, explanation: "Diamond CDM blocks opponent's CAM spatially. Counter through their LM/RM gaps." }
      ],
      tacticalPrinciples: [
        "5-5-1 mirror structure: MF battle won through CDM vs CAM quality",
        "Our CDM beats their CAM in defensive zone — spatial collision favours us",
        "SOS exploits their transitions when CAM overcommits forward",
        "Man-marking for 4-defender shape stability"
      ]
    },
    "equal": {
      formation: "433B", gamePlan: "Passing Game", winProb: 51,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 50, style: 45, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "433B CDM neutralizes opponent's CAM spatially. LW/RW wingers exploit space behind opponent's advancing LM/RM (when they go wide, they leave gaps). Offside trap viable with 4 defenders + pressing 50. Patient passing game builds around CDM's coverage of opponent CAM zone.",
      alternativeStrategies: [
        { formation: "442A", gamePlan: "Wing Play", pressing: 55, style: 50, tempo: 60, explanation: "Our LM/RM mirror and neutralize opponent's LM/RM. 2 forwards create additional striker pressure." }
      ],
      tacticalPrinciples: [
        "CDM neutralizes opponent's CAM — permanent spatial collision in central zone",
        "LW/RW exploit gaps created when opponent's LM/RM advance wide",
        "Offside trap viable: 4 defenders + pressing 50",
        "Man-marking disrupts opponent's intricate passing triangle structures"
      ]
    },
    "stronger": {
      formation: "433A", gamePlan: "Wing Play", winProb: 65,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 65, style: 60, tempo: 70, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 4231 has LM/RM — attacking fullbacks PROHIBITED in our 433A (2v1 wide catastrophe). Our fullbacks defend deep; our LW/RW provide the width. CAM exploits the gap between opponent's two CDMs and their 4-back.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 70, style: 65, tempo: 75, explanation: "Wingbacks neutralize opponent's LM/RM while CDM secures center." }
      ],
      tacticalPrinciples: [
        "⚠ CRITICAL: 4231 LM/RM — attacking fullbacks PROHIBITED for our 4-back",
        "CAM operates in blind spot between opponent's two CDMs and 4-back",
        "LW/RW provide width from 433A's forward positions — safe structural advance",
        "Offside trap viable: 4 defenders + pressing 65"
      ]
    },
    "much-stronger": {
      formation: "343A", gamePlan: "Attacking", winProb: 78,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 75, style: 70, tempo: 80, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "343A wingbacks create structural width opponent's LM/RM cannot match — wingbacks advance AS their positional role, not as an instruction. Push Forward midfield WARNING: 343A has no CDM — however our CAM's quality superiority compensates. Man-marking on 3 CBs.",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 80, style: 75, tempo: 85, explanation: "Double CAMs + 2 strikers create permanent 4-player overload." }
      ],
      tacticalPrinciples: [
        "Wingback structural advance overwhelms opponent's LM/RM in wide areas",
        "3 CBs + pressing 75 = viable offside trap coordination",
        "Man-marking on 3 CBs: maximum disruption + red-card resilience",
        "High press (75) makes opponent's 5-MF structure unable to build play"
      ]
    }
  },

  "433A": {
    "much-weaker": {
      formation: "541A", gamePlan: "Counter Attack", winProb: 24,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Drop Deep" },
      pressing: 15, style: 20, tempo: 25, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "541A creates 9-player defensive block absorbing opponent's 3-forward + CAM pressure. Man-marking mandatory with 5 defenders. Wide MFs in 541A cover opponent's LW/RW in wide areas. Ultra-low press maintains compact shape.",
      alternativeStrategies: [
        { formation: "532", gamePlan: "Long Ball", pressing: 20, style: 25, tempo: 30, explanation: "3 CBs handle opponent's front 3 numerically. Long balls bypass opponent's high press." }
      ],
      tacticalPrinciples: [
        "Man-marking MANDATORY: 5-defender zonal collapses on any red card vs 3-forward system",
        "Wide MFs in 541A directly cover opponent's LW/RW wide threats",
        "Ultra-low press maintains compact defensive shape",
        "Offside trap impossible: 5-defender coordination failure with 3 forwards threatening"
      ]
    },
    "weaker": {
      formation: "532", gamePlan: "Long Ball", winProb: 33,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 25, style: 30, tempo: 40, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "3 CBs handle opponent's 3 forwards numerically (3v3 in defensive zone). Long balls bypass opponent's high CAM press to isolated strikers. Man-marking maintains 5-defender shape. Opponent's 433A has no CDM — our counters face a vulnerable midfield transition zone.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 30, style: 35, tempo: 45, explanation: "5-MF overload vs opponent's 3-MF line creates +2 central advantage." }
      ],
      tacticalPrinciples: [
        "3 CBs handle opponent's 3 forwards — exact numerical match in defensive zone",
        "Long balls bypass opponent's CAM/press to reach isolated strikers",
        "Man-marking prevents CAM from operating freely (no CDM to cover them)",
        "Opponent lacks CDM — our counters exploit exposed midfield transition"
      ]
    },
    "equal": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 49,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 45, style: 40, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5-MF block (+2 advantage over opponent's 3 MFs) provides both defensive cover and counter platform. SOS exploits opponent's weak defensive transitions from attacking positions. Man-marking preferred — opponent's CAM needs direct tracking, no CDM to cover them.",
      alternativeStrategies: [
        { formation: "442B", gamePlan: "Passing Game", pressing: 50, style: 45, tempo: 60, explanation: "Diamond CDM fills the CAM-coverage gap. 2 forwards create additional striker pressure." }
      ],
      tacticalPrinciples: [
        "+2 central MF advantage overwhelms opponent's thin 3-man midfield",
        "SOS exploits exposed transitions after opponent's CAM commits forward",
        "Man-marking tracks opponent's CAM directly (no CDM — they're vulnerable)",
        "Pressing 45 maintains compact shape while creating transition opportunities"
      ]
    },
    "stronger": {
      formation: "442B", gamePlan: "Passing Game", winProb: 63,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 60, style: 55, tempo: 65, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 433A has LW/RW wide forwards — attacking fullbacks PROHIBITED in our 442B (2v1 catastrophe in wide areas). Diamond CDM fills the vulnerable gap opponent's 433A lacks (no CDM). False 9 drags CBs out of position.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 65, style: 60, tempo: 70, explanation: "CDM covers their dangerous CAM. LM/RM provide width safely vs their LW/RW from deeper positions." }
      ],
      tacticalPrinciples: [
        "⚠ CRITICAL: 433A LW/RW — attacking fullbacks PROHIBITED for our 4-back",
        "Diamond CDM provides coverage opponent's 433A fundamentally lacks",
        "False 9 pulls CBs forward, creating space for CM runs through center",
        "Offside trap viable: 4 defenders + pressing 60"
      ]
    },
    "much-stronger": {
      formation: "4231", gamePlan: "Wing Play", winProb: 76,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 70, style: 65, tempo: 75, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 433A has LW/RW — our 4231 fullbacks must defend deep. LM/RM in our 4231 provide width. CDM blocks their CAM spatially. High quality advantage makes even conservative 4231 dominant.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 75, style: 70, tempo: 80, explanation: "Wingbacks neutralize their LW/RW while CDM covers center." }
      ],
      tacticalPrinciples: [
        "⚠ 433A LW/RW: Defend Deep invariant enforced for our 4-back",
        "CDM blocks their CAM — quality advantage makes spatial control overwhelming",
        "4231 LM/RM provide width safely from deeper positions than LW/RW",
        "Offside trap viable: 4 defenders + pressing 70"
      ]
    }
  },

  "433B": {
    "much-weaker": {
      formation: "541B", gamePlan: "Counter Attack", winProb: 27,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Drop Deep" },
      pressing: 20, style: 25, tempo: 30, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "541B diamond midfield handles opponent's CDM + 2CM structure — our CDM vs their CDM, our CAM vs their open space. Man-marking mandatory with 5 defenders, especially critical against 3 forwards. Counter through central channels when opponent's CDM overcommits.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 15, style: 20, tempo: 25, explanation: "5 MFs vs 3 MFs: massive +2 advantage. SOS bypasses technical quality." }
      ],
      tacticalPrinciples: [
        "Man-marking MANDATORY: 5 defenders vs 3 forwards — zonal fails on red card",
        "Diamond CDM vs opponent CDM: spatial battle in defensive zone",
        "Counter through central channels when their CDM overcommits",
        "Offside trap impossible with 5 defenders"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 37,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 35, style: 40, tempo: 45, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5-MF block creates +2 advantage over opponent's 3 MFs. SOS bypasses opponent's CDM defensive coverage — direct long shots avoid their structural strengths. Man-marking handles opponent's 3 forwards individually.",
      alternativeStrategies: [
        { formation: "442A", gamePlan: "Wing Play", pressing: 40, style: 45, tempo: 50, explanation: "Wide MF stretch opponent's 4-back beyond coverage capacity." }
      ],
      tacticalPrinciples: [
        "+2 central advantage overwhelms opponent's thin 3-MF line",
        "SOS bypasses opponent's CDM structural defense through speculative shots",
        "Man-marking tracks all 3 forwards individually — zonal insufficient",
        "Wide MFs advance freely — opponent has no LM/RM to counter"
      ]
    },
    "equal": {
      formation: "442A", gamePlan: "Wing Play", winProb: 51,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 50, style: 45, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 433B has LW/RW wide forwards. 442A's LM/RM mirror opponent's wingers defensively — our wide MFs track their LW/RW. Our 4 fullbacks defend deep (433B has dangerous LW/RW). Offside trap viable with 4 defenders + pressing 50.",
      alternativeStrategies: [
        { formation: "433A", gamePlan: "Wing Play", pressing: 55, style: 50, tempo: 60, explanation: "CAM exploits the space created by opponent's advancing LW/RW." }
      ],
      tacticalPrinciples: [
        "⚠ 433B has LW/RW — defend deep mandatory for 4-back fullbacks",
        "Our LM/RM in 442A directly neutralize opponent's LW/RW",
        "Offside trap viable: 4 defenders + pressing 50 = achievable coordination",
        "Man-marking tracks 3 forwards + CDM individually"
      ]
    },
    "stronger": {
      formation: "433A", gamePlan: "Wing Play", winProb: 64,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 65, style: 60, tempo: 70, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 433B has LW/RW — attacking fullbacks PROHIBITED in our 433A. Our CAM exploits the space created between opponent's CDM and their 4-back. Pressing 65 forces opponent's CDM into defensive decisions, freeing space for CAM.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 70, style: 65, tempo: 75, explanation: "Our CDM tracks opponent's CDM while our CAM operates in their defensive blind spot." }
      ],
      tacticalPrinciples: [
        "⚠ CRITICAL: 433B LW/RW — attacking fullbacks PROHIBITED for our 433A 4-back",
        "CAM exploits space between opponent's CDM and defensive line",
        "High press (65) forces opponent CDM into rushed defensive decisions",
        "Offside trap viable: 4 defenders + pressing 65"
      ]
    },
    "much-stronger": {
      formation: "343A", gamePlan: "Attacking", winProb: 77,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 75, style: 70, tempo: 80, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "343A wingbacks overwhelm opponent's LW/RW in wide areas — wingback advance is structural (their designed role). Push Forward midfield viable with 343A's attacking formation design. Man-marking on 3 CBs. Pressing 75 makes opponent's CDM defensive coverage irrelevant.",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 80, style: 75, tempo: 85, explanation: "Double CAMs create permanent central overload against opponent's CDM." }
      ],
      tacticalPrinciples: [
        "Wingback structural advance overwhelms opponent's LW/RW in wide duels",
        "3 CBs + pressing 75 = viable offside trap with coordinated defensive line",
        "Man-marking on 3 CBs: disruption + any-red-card resilience",
        "High press makes opponent's CDM defensive coverage zone irrelevant"
      ]
    }
  },

  "343A": {
    "much-weaker": {
      formation: "541B", gamePlan: "Counter Attack", winProb: 20,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Drop Deep" },
      pressing: 10, style: 15, tempo: 20, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "541B creates maximum defensive compaction against 343A's full-width assault (4 wide players + 3 forwards). Diamond CDM provides central security against their CAM. Man-marking MANDATORY with our 5 defenders — critical vs 4 attacking wide players.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Long Ball", pressing: 15, style: 20, tempo: 25, explanation: "5 MFs + CDM provides central dominance. Long balls to striker counter their high press." }
      ],
      tacticalPrinciples: [
        "Man-marking MANDATORY: 5 defenders vs 4 wide+forward threats — zonal collapses on red card",
        "Diamond CDM covers opponent's CAM spatially",
        "Ultra-low press (10) maintains compact shape vs aggressive 343A",
        "Offside trap impossible with 5 defenders"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Long Ball", winProb: 30,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 20, style: 25, tempo: 35, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5-MF block creates central overload vs opponent's 4-MF line. Long balls bypass 343A's high press — their wingbacks advance, leaving counter space in behind. CDM in 451 tracks opponent's CAM. Man-marking handles opponent's 3 forwards.",
      alternativeStrategies: [
        { formation: "442B", gamePlan: "Passing Game", pressing: 25, style: 30, tempo: 40, explanation: "Diamond CDM+CAM structure fights opponent's CAM+wingbacks in central zone." }
      ],
      tacticalPrinciples: [
        "+1 MF advantage with CDM providing central defensive anchor",
        "Long balls bypass 343A's aggressive pressing wingbacks",
        "Opponent's wingbacks advance — counter space created in behind",
        "Man-marking tracks 3 forwards and prevents forward overload"
      ]
    },
    "equal": {
      formation: "442B", gamePlan: "Passing Game", winProb: 47,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Support Midfield" },
      pressing: 40, style: 35, tempo: 50, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 343A has LW/RW + wingbacks. Our 442B diamond fullbacks must defend deep. Diamond CDM+CAM fights their CAM+wingbacks in central zone. Offside trap viable with 4 defenders + pressing 40.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Passing Game", pressing: 45, style: 40, tempo: 55, explanation: "CDM covers center, LW/RW exploit gaps behind opponent's advancing wingbacks." }
      ],
      tacticalPrinciples: [
        "⚠ 343A LW/RW + wingbacks — defend deep mandatory for our 4-back fullbacks",
        "Diamond CDM neutralizes opponent's CAM spatially",
        "Offside trap viable: 4 defenders + pressing 40 = achievable coordination",
        "Gaps appear when opponent's wingbacks overextend forward"
      ]
    },
    "stronger": {
      formation: "433B", gamePlan: "Wing Play", winProb: 61,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 55, style: 50, tempo: 65, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 343A has LW/RW + wingbacks — attacking fullbacks PROHIBITED for our 4-back. 433B CDM anchors defense, LW/RW exploit seams behind opponent's advancing wingbacks. Offside trap viable with 4 defenders + pressing 55. Opponent's 3 CBs are vulnerable when their wingbacks advance.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 60, style: 55, tempo: 70, explanation: "CDM + LM/RM covers both center and width securely." }
      ],
      tacticalPrinciples: [
        "⚠ CRITICAL: 343A LW/RW + wingbacks — defend deep for our 433B 4-back",
        "CDM anchors center when opponent's wingbacks leave defensive gaps",
        "Our LW/RW exploit gaps behind overextended opponent wingbacks",
        "Offside trap viable: 4 defenders + pressing 55"
      ]
    },
    "much-stronger": {
      formation: "4231", gamePlan: "Attacking", winProb: 74,
      lineInstructions: { defense: "Defend Deep", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 70, style: 65, tempo: 75, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 343A has LW/RW + wingbacks — our 4231 fullbacks defend deep. CDM provides security for the Push Forward midfield instruction (CDM prerequisite met). CAM exploits the space between opponent's 3 CBs. Pressing 70 makes opponent's 4-wide attack fragmented.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 75, style: 70, tempo: 80, explanation: "Wingbacks provide structural width. CDM covers center for Push Forward safety." }
      ],
      tacticalPrinciples: [
        "⚠ 343A LW/RW + wingbacks: Defend Deep invariant for our 4-back",
        "CDM enables safe Push Forward: CDM stays deeper naturally even when MF advances",
        "CAM exploits space between opponent's 3 CBs after wingbacks advance",
        "Offside trap viable: 4 defenders + pressing 70"
      ]
    }
  },

  "343B": {
    "much-weaker": {
      formation: "541A", gamePlan: "Counter Attack", winProb: 21,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Drop Deep" },
      pressing: 15, style: 20, tempo: 25, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "541A creates 9-player defensive block. Man-marking MANDATORY with our 5 defenders — critical vs 343B's 3 forwards + wingbacks. Wide MFs in 541A cover opponent's wingback advances. CDM battles opponent's CDM in central zone.",
      alternativeStrategies: [
        { formation: "532", gamePlan: "Long Ball", pressing: 20, style: 25, tempo: 30, explanation: "3 CBs handle opponent's 3 forwards numerically." }
      ],
      tacticalPrinciples: [
        "Man-marking MANDATORY: 5 defenders vs 3 forwards + wingbacks — zonal collapses",
        "Wide MFs in 541A track opponent's advancing wingbacks",
        "Our CDM vs their CDM: spatial battle in defensive midfield zone",
        "Offside trap impossible: 5-defender coordination with 4 wide threats"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 31,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 25, style: 30, tempo: 35, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5-MF block matches opponent's 4-MF (+1 CDM advantage). SOS bypasses opponent's CDM defensive structure. Man-marking tracks opponent's 3 forwards. Wide MFs in 451 neutralize opponent's wingbacks. Low press invites forward runs then exploits counter space.",
      alternativeStrategies: [
        { formation: "442A", gamePlan: "Counter Attack", pressing: 30, style: 35, tempo: 40, explanation: "Wide MFs directly neutralize opponent's wingbacks. Dual forwards create counter threat." }
      ],
      tacticalPrinciples: [
        "+1 MF advantage with CDM providing deeper defensive coverage",
        "Our wide MFs neutralize opponent's wingbacks in defensive transition",
        "SOS bypasses need to penetrate opponent's CDM defensive zone",
        "Man-marking tracks all 3 forwards individually"
      ]
    },
    "equal": {
      formation: "442A", gamePlan: "Wing Play", winProb: 48,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 45, style: 40, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 343B has LW/RW + wingbacks — our 442A fullbacks must defend deep. Our LM/RM mirror and neutralize opponent's wingbacks. Crosses target space between opponent's 3 CBs and GK. Offside trap viable with 4 defenders + pressing 45.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Passing Game", pressing: 50, style: 45, tempo: 60, explanation: "CDM neutralizes opponent's CDM. LW/RW exploit wingback advance gaps." }
      ],
      tacticalPrinciples: [
        "⚠ 343B LW/RW + wingbacks — defend deep mandatory for our 4-back fullbacks",
        "Our LM/RM directly mirror and track opponent's wingbacks",
        "Crosses exploit gaps between opponent's 3 CBs when wingbacks advance",
        "Offside trap viable: 4 defenders + pressing 45"
      ]
    },
    "stronger": {
      formation: "433B", gamePlan: "Wing Play", winProb: 62,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 60, style: 55, tempo: 70, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 343B LW/RW + wingbacks — attacking fullbacks PROHIBITED for our 433B 4-back. CDM anchors defense and neutralizes opponent's CDM spatially. LW/RW exploit the spaces behind opponent's overextended wingbacks.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 65, style: 60, tempo: 75, explanation: "CDM covers center, LM/RM provide width safely." }
      ],
      tacticalPrinciples: [
        "⚠ CRITICAL: 343B LW/RW + wingbacks — defend deep for our 4-back",
        "CDM vs CDM: our quality advantage wins the central spatial battle",
        "LW/RW exploit gaps when opponent's wingbacks overextend forward",
        "Offside trap viable: 4 defenders + pressing 60"
      ]
    },
    "much-stronger": {
      formation: "4231", gamePlan: "Attacking", winProb: 75,
      lineInstructions: { defense: "Defend Deep", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 75, style: 70, tempo: 80, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 343B has LW/RW + wingbacks — our 4231 fullbacks defend deep (invariant enforced). CDM enables safe Push Forward instruction (CDM prerequisite met). CAM exploits space between opponent's CDM coverage and 3-CB line.",
      alternativeStrategies: [
        { formation: "3322", gamePlan: "Attacking", pressing: 80, style: 75, tempo: 85, explanation: "Double CAMs overwhelm opponent's CDM coverage of central zone." }
      ],
      tacticalPrinciples: [
        "⚠ 343B LW/RW + wingbacks: Defend Deep invariant enforced for our 4-back",
        "CDM in 4231 enables safe Push Forward — stays deeper naturally",
        "CAM exploits space between their CDM coverage and 3-CB line",
        "Offside trap viable: 4 defenders + pressing 75"
      ]
    }
  },

  "3322": {
    "much-weaker": {
      formation: "541B", gamePlan: "Counter Attack", winProb: 23,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Drop Deep" },
      pressing: 15, style: 20, tempo: 25, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "541B diamond handles opponent's dual-CAM threat — our CDM covers one, our own CAM tracks the other's influence. Man-marking MANDATORY with 5 defenders. Ultra-low press lures CAMs forward creating massive counter space.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 10, style: 15, tempo: 20, explanation: "5 MFs creates complete midfield shutdown. SOS from distance bypasses 3-CB vulnerabilities." }
      ],
      tacticalPrinciples: [
        "Man-marking MANDATORY: 5 defenders vs 4 attacking players — zonal collapses",
        "Diamond CDM covers one CAM, diamond CAM shadows the other",
        "Ultra-low press (15) lures dual CAMs forward creating counter space",
        "Offside trap impossible with 5 defenders"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 34,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 30, style: 35, tempo: 40, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5-MF block vs 3 MFs creates +2 central advantage. SOS exploits opponent's weak defensive transitions from aggressive positions. Man-marking tracks 4 forward/CAM players individually.",
      alternativeStrategies: [
        { formation: "442A", gamePlan: "Wing Play", pressing: 35, style: 40, tempo: 45, explanation: "Wide MFs isolate opponent's 3 CBs. 3322's limited wingback coverage exposed in wide areas." }
      ],
      tacticalPrinciples: [
        "+2 central MF advantage overwhelms opponent's thin 3-MF structure",
        "SOS exploits weak defensive transitions from dual-CAM attacking positions",
        "Man-marking handles 4 attack-minded players individually",
        "CDM provides anchoring when opponent's CAMs advance forward"
      ]
    },
    "equal": {
      formation: "442A", gamePlan: "Wing Play", winProb: 50,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 45, style: 40, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 3322 has LW/RW wide players — our 442A fullbacks must defend deep. Our LM/RM exploit wide spaces — 3322 has limited wingback coverage (no dedicated LM/RM). Offside trap viable with 4 defenders + pressing 45. Crosses target space between opponent's 3 CBs and goalkeeper.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Passing Game", pressing: 50, style: 45, tempo: 60, explanation: "CDM anchors center, LW/RW exploit the wide areas where 3322 lacks coverage." }
      ],
      tacticalPrinciples: [
        "⚠ CRITICAL: 3322 LW/RW — defend deep for our 4-back",
        "LW/RW exploit wide gaps where opponent lacks LM/RM",
        "Offside trap viable: 4 defenders + pressing 45",
        "Man-marking handles opponent's dual-CAM and dual-striker threat"
      ]
    },
    "stronger": {
      formation: "433B", gamePlan: "Wing Play", winProb: 63,
      lineInstructions: { defense: "Defend Deep", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 60, style: 55, tempo: 70, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 3322 LW/RW — attacking fullbacks PROHIBITED for our 4-back. CDM anchors defense, LW/RW exploit the wide areas where 3322 lacks dedicated coverage. Offside trap viable.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Wing Play", pressing: 65, style: 60, tempo: 75, explanation: "CDM + LM/RM provides both central and wide security." }
      ],
      tacticalPrinciples: [
        "⚠ CRITICAL: 3322 LW/RW — defend deep for our 4-back",
        "CDM anchors defense against 3322's aggressive dual-CAM push",
        "LW/RW exploit wide gaps where opponent lacks LM/RM",
        "Offside trap viable: 4 defenders + pressing 60"
      ]
    },
    "much-stronger": {
      formation: "4231", gamePlan: "Attacking", winProb: 76,
      lineInstructions: { defense: "Defend Deep", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 75, style: 70, tempo: 80, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "CRITICAL: 3322 has LW/RW — fullbacks defend deep. CDM enables safe Push Forward instruction. CAM + LM/RM overwhelm their central/wide structure. Our quality dominance makes compact 4231 more than sufficient.",
      alternativeStrategies: [
        { formation: "343B", gamePlan: "Attacking", pressing: 80, style: 75, tempo: 85, explanation: "Wingbacks + CDM create total width and central control." }
      ],
      tacticalPrinciples: [
        "⚠ 3322 LW/RW: Defend Deep invariant enforced for our 4-back",
        "CDM enables safe Push Forward — stays deeper naturally",
        "CAM exploits space between opponent's thin 3 MFs and 3-CB line",
        "Offside trap viable: 4 defenders + pressing 75"
      ]
    }
  },

  "424": {
    "much-weaker": {
      formation: "541B", gamePlan: "Counter Attack", winProb: 42,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 25, style: 30, tempo: 40, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5-4-1B diamond midfield crushes 424's empty 2-man midfield (+2 advantage). CDM neutralizes any threat from opponent's thin midfield. Man-marking mandatory with 5 defenders. Counter through wide areas when opponent overcommits 4 forwards.",
      alternativeStrategies: [
        { formation: "451", gamePlan: "Shoot on Sight", pressing: 20, style: 25, tempo: 35, explanation: "5 MFs completely overwhelm opponent's 2-man midfield. SOS avoids needing to break down packed defense." }
      ],
      tacticalPrinciples: [
        "Massive central midfield advantage (+2)",
        "Man-marking mandatory with 5 defenders for red-card resilience",
        "Ultra-low press lures opponent forward, then hits on counter",
        "Offside trap disabled — 5 defenders cannot coordinate"
      ]
    },
    "weaker": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 48,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 35, style: 40, tempo: 45, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5 MFs completely dominate 424's 2-man midfield (+3 advantage). SOS exploits this central dominance without needing complex build-up. Man-marking for 4-defender red-card resilience.",
      alternativeStrategies: [
        { formation: "442A", gamePlan: "Wing Play", pressing: 40, style: 45, tempo: 50, explanation: "Wide MFs isolate opponent's fullbacks. Crosses target overloaded central area." }
      ],
      tacticalPrinciples: [
        "Massive +3 central midfield advantage",
        "Shoot on sight bypasses need for penetration into crowded forward zone",
        "Man-marking provides 4-defender shape stability",
        "Low press invites overcommitment then counter"
      ]
    },
    "equal": {
      formation: "451", gamePlan: "Shoot on Sight", winProb: 55,
      lineInstructions: { defense: "Defend Deep", midfield: "Protect Defense", attack: "Attack Only" },
      pressing: 45, style: 40, tempo: 55, tackling: "Normal", marking: "Man-to-Man", offsideTrap: false,
      explanation: "5 MFs completely crush 424's empty 2-man midfield (+3 advantage). Shoot on sight exploits this central dominance without needing complex build-up. Man-marking tracks all 4 forwards individually.",
      alternativeStrategies: [
        { formation: "4231", gamePlan: "Passing Game", pressing: 50, style: 45, tempo: 60, explanation: "CDM + CAM control the midfield vacuum, wide MFs exploit flanks." }
      ],
      tacticalPrinciples: [
        "Massive +3 central midfield advantage overwhelms opponent's 2-man midfield",
        "Shoot on sight bypasses need for penetration",
        "Man-marking handles all 4 forwards — zonal collapses vs 4-forward pressure",
        "Low-medium press conserves energy while maintaining shape"
      ]
    },
    "stronger": {
      formation: "4231", gamePlan: "Wing Play", winProb: 62,
      lineInstructions: { defense: "Attacking Fullbacks", midfield: "Stay in Position", attack: "Attack Only" },
      pressing: 60, style: 55, tempo: 65, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "424's 2-man midfield cannot cope with our 5-MF structure. Fullbacks advance safely because 424 has no wide midfielders to exploit. CAM exploits space between opponent's 2 CMs and their 4-back. Offside trap viable with 4 defenders + pressing 60.",
      alternativeStrategies: [
        { formation: "433B", gamePlan: "Wing Play", pressing: 65, style: 60, tempo: 70, explanation: "CDM anchors center, wingers stretch the 4-back laterally." }
      ],
      tacticalPrinciples: [
        "Central midfield superiority (+3) — total game control",
        "Attacking fullbacks safe: 424 has no LM/RM wide threat",
        "Offside trap viable: 4 defenders + pressing 60",
        "Aggressive tackling forces turnovers high up the pitch"
      ]
    },
    "much-stronger": {
      formation: "3322", gamePlan: "Attacking", winProb: 72,
      lineInstructions: { defense: "Support Midfield", midfield: "Push Forward", attack: "Attack Only" },
      pressing: 80, style: 75, tempo: 80, tackling: "Aggressive", marking: "Man-to-Man", offsideTrap: true,
      explanation: "3-3-2-2's double CAMs and 2 strikers overwhelm 424's fragile midfield. 3322 has CAMs but no CDM, so Push Forward requires quality compenssation — our quality advantage makes pressing overwhelming. Man-marking on 3 CBs maintains defensive shape.",
      alternativeStrategies: [
        { formation: "343A", gamePlan: "Attacking", pressing: 85, style: 80, tempo: 85, explanation: "Wingbacks + wingers create total width dominance across all zones." }
      ],
      tacticalPrinciples: [
        "Double CAM + 2 strikers overload opponent's 2-man midfield catastrophically",
        "High press (80) denies any controlled possession build-up",
        "Man-marking on 3 CBs: disruption + red-card resilience",
        "Offside trap catches desperate long balls from overwhelmed 424 structure"
      ]
    }
  }

}; // END OF FORMATION_COUNTER_DATABASE

// ==================== CORS HEADERS ====================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==================== EDGE FUNCTION RUNTIME ====================
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      formation,                    // opponent formation key
      strength,                     // our relative strength
      oppPlayStyle = "passing",     // frontend sends oppPlayStyle (also accept playStyle legacy)
      playStyle,                    // legacy param — fallback
      myPressing,
      myStyle,
      myTempo,
      myForwards,
      myMidfielders,
      myDefenders,
      myMarking,
      userId,
      isPresetCalculation,
      isFreeCalculation,
      isAdvancedCalculation,
    } = body;

    // Resolve play style (support both param names)
    const resolvedPlayStyle: string = oppPlayStyle || playStyle || "passing";

    // ── Payload validation ──────────────────────────────────────────────
    if (!formation || !strength) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: formation and strength" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const oppFormationData = FORMATION_COUNTER_DATABASE[formation];
    if (!oppFormationData) {
      const available = Object.keys(FORMATION_COUNTER_DATABASE).join(", ");
      return new Response(
        JSON.stringify({ success: false, error: `Formation '${formation}' not found. Available: ${available}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const oppProps = FORMATION_PROPS[formation] ?? FORMATION_PROPS["442A"];

    // ─── 1. PRESET CALCULATION (legacy route — kept for backward compat) ──
    // Opponent preset logic has fully moved to client-side (App.tsx computeOppPreset).
    // Any old client still sending isPresetCalculation gets a graceful empty success.
    if (isPresetCalculation) {
      return new Response(
        JSON.stringify({ success: true, preset: null, message: "Preset now computed client-side." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ─── 2. FREE & ADVANCED STRATEGY CALCULATION ───────────────────────
    let rawStrategy = oppFormationData[strength];

    // Graceful fallback if exact strength not found
    if (!rawStrategy) {
      rawStrategy =
        oppFormationData["equal"] ??
        Object.values(oppFormationData)[0];
    }
    if (!rawStrategy) {
      return new Response(
        JSON.stringify({ success: false, error: "No strategy found for this formation/strength combination" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Clone to avoid mutating the DB object
    rawStrategy = JSON.parse(JSON.stringify(rawStrategy));

    // Apply user slider overrides (only for advanced calculation)
    if (isAdvancedCalculation) {
      if (myPressing !== undefined && myPressing !== null)
        rawStrategy.pressing = parseInt(String(myPressing), 10);
      if (myStyle !== undefined && myStyle !== null)
        rawStrategy.style = parseInt(String(myStyle), 10);
      if (myTempo !== undefined && myTempo !== null)
        rawStrategy.tempo = parseInt(String(myTempo), 10);
      if (myForwards) rawStrategy.lineInstructions.attack = myForwards;
      if (myMidfielders) rawStrategy.lineInstructions.midfield = myMidfielders;
      if (myDefenders) rawStrategy.lineInstructions.defense = myDefenders;
      if (myMarking) rawStrategy.marking = myMarking;
    }

    const myFormationKey: string = rawStrategy.formation;

    // Apply all architectural constraints
    const finalizedStrategy = applyArchitecturalConstraints(
      rawStrategy,
      myFormationKey,
      formation,
      resolvedPlayStyle,
      strength
    );

    // Build alternative strategies list for advanced calculation
    const finalizedAlternatives: any[] = [finalizedStrategy];

    if (isAdvancedCalculation && Array.isArray(rawStrategy.alternativeStrategies)) {
      for (const alt of rawStrategy.alternativeStrategies) {
        const rawAlt = { ...rawStrategy, ...alt };
        rawAlt.lineInstructions = { ...(rawStrategy.lineInstructions ?? {}), ...(alt.lineInstructions ?? {}) };
        const finalAlt = applyArchitecturalConstraints(
          rawAlt,
          alt.formation,
          formation,
          resolvedPlayStyle,
          strength
        );
        finalizedAlternatives.push(finalAlt);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        strategy: finalizedStrategy,
        strategies: isAdvancedCalculation ? finalizedAlternatives : undefined,
        meta: {
          oppFormation: formation,
          strength,
          playStyle: resolvedPlayStyle,
          calculationType: isAdvancedCalculation ? "advanced" : "free",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message ?? "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});