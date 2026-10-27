// components/dashboard/ProfileSection.tsx
export default function ProfileSection() {
  return (
    <div className="flex items-center gap-4 p-4 bg-[#262826] rounded-lg shadow-sm border border-[#8458B3]">
      <div className="w-16 h-16 rounded-full bg-[#8458B3] shrink-0" />
      <div>
        <h2 className="text-lg font-bold text-[#494D5F]">Placeholder Name</h2>
        <p className="text-sm text-[#494D5F]/70">Placeholder bio goes here.</p>
      </div>
    </div>
  );
}
