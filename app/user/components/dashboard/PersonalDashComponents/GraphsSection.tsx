// components/dashboard/PersonalDashComponents/GraphsSection.tsx
import StockCarousel from "./StockCarousel";
import { TICKER_OPTIONS } from "@/app/user/lib/tickers";

export default function GraphsSection() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#E5EAF5] mb-2">Graphs</h3>
      <StockCarousel symbols={TICKER_OPTIONS} />
    </div>
  );
}
