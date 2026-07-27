export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0c]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
      <p className="text-emerald-500 font-medium animate-pulse">Loading chapter...</p>
    </div>
  );
}
