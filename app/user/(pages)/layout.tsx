// app/user/(pages)/layout.tsx
// shared by every page with the top nav. layouts stay mounted between pages,
// so the nav (and its rain) doesn't restart on each click
import TabNav from "@/app/user/components/shared/TabNav";

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TabNav />
      <main className="px-4 py-4 md:px-10">{children}</main>
    </div>
  );
}
