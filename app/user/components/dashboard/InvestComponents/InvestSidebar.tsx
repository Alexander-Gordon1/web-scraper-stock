export type SidebarItem = {
  key: string;
  label: string;
};

type InvestSidebarProps = {
  // each group is drawn as its own block, spaced apart from the others
  groups: SidebarItem[][];
  activeKey: string;
  onSelect: (key: string) => void;
};

// left-hand menu for the invest tab. on phones it turns into a sideways-scrolling row above the content
export default function InvestSidebar({ groups, activeKey, onSelect }: InvestSidebarProps) {
  return (
    // md:-ml-[30px] pulls it into the dashboard's 40px side padding, so it sits 10px from the screen edge
    <nav
      aria-label="Invest sections"
      className="flex shrink-0 md:-ml-[30px] gap-6 overflow-x-auto border-b border-[#2f9e5b]/30 md:sticky md:top-4 md:w-52 md:flex-col md:gap-8 md:self-start md:overflow-visible md:border-b-0"
    >
      {groups.map((items, i) => (
        <div key={i} className="flex shrink-0 md:flex-col md:border-r md:border-[#2f9e5b]/30">
          {items.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={`flex shrink-0 items-baseline gap-2 whitespace-nowrap border-b-[3px] md:whitespace-normal px-3 py-2.5 text-left font-mono text-xs font-bold uppercase tracking-[0.15em] transition md:border-b-0 md:border-l-[3px] ${
                  isActive
                    ? "border-[#2f9e5b] bg-[#2f9e5b]/15 text-[#d9ffe6]"
                    : "border-transparent text-[#2f9e5b] hover:bg-[#2f9e5b]/10 hover:text-[#d9ffe6]"
                }`}
              >
                {/* terminal prompt marks the open section */}
                <span aria-hidden="true" className={isActive ? "text-[#2f9e5b]" : "invisible"}>
                  &gt;
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
