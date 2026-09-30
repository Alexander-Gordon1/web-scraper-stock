// components/dashboard/PersonalDashTab.tsx
import ProfileSection from "./PersonalDashComponents/ProfileSection";
import GraphsSection from "./PersonalDashComponents/GraphsSection";
import CompareStocksSection from "./PersonalDashComponents/CompareStocksSection";
import WhatHappenedSection from "./PersonalDashComponents/WhatHappenedSection";
import TickerBar from "./PersonalDashComponents/TickerBar";

export default function PersonalDashTab() {
  return (
    <div className="flex flex-col gap-6 ">
      <TickerBar />
      <GraphsSection />
      <CompareStocksSection />
      <WhatHappenedSection />
    </div>
  );
}
