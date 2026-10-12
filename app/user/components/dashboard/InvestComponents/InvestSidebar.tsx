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
    <nav
      aria-label="Invest sections"
      className="flex shrink-0 gap-6 overflow-x-auto border-b border-white/10 md:sticky md:top-4 md:w-60 md:flex-col md:gap-25 md:self-start md:overflow-visible md:border-b-0"
    >
      {groups.map((items, i) => (
        <div key={i} className="flex shrink-0 md:flex-col md:border-r md:border-white/10">
          {items.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap border-b-[3px] px-4 py-3 text-left text-sm font-semibold transition-colors md:border-b-0 md:border-l-[3px] ${
                  isActive
                    ? "border-[#9085e9] bg-white/5 text-white"
                    : "border-transparent text-[#E5EAF5]/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
