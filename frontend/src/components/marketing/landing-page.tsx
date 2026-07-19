import { LandingAsk } from "./landing-ask";
import { LandingClosing } from "./landing-closing";
import { LandingEngine } from "./landing-engine";
import { LandingExhibits } from "./landing-exhibits";
import { LandingHero } from "./landing-hero";
import { LandingPain } from "./landing-pain";

/**
 * Marketing home — an evidence dossier that practices what the product
 * preaches: claims up top carry cite chips [A]–[E], the exhibits prove them
 * with real product artifacts, and the footer indexes them as "Sources".
 */
export function LandingPage() {
  return (
    <div className="pb-16">
      <LandingHero />
      <LandingPain />
      <LandingEngine />
      <LandingExhibits />
      <LandingAsk />
      <LandingClosing />
    </div>
  );
}
