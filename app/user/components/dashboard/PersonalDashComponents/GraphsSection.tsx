// components/dashboard/PersonalDashComponents/GraphsSection.tsx
import StockCarousel from "./StockCarousel";
import SectionIntro from "./SectionIntro";
import { TICKER_OPTIONS } from "@/app/user/lib/tickers";

export default function GraphsSection() {
  return (
    <div>
      <SectionIntro title="Markets">
        Live prices for every stock we track. Swipe to move between stocks (or use the arrows on a bigger screen), pick a time
        period under the chart, or use the calendar to rewind to an earlier date.
      </SectionIntro>
      <StockCarousel symbols={TICKER_OPTIONS} />
    </div>
  );
}
