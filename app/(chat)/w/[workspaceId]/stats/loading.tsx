const CardSkeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-2xl border border-[#f1f5f9] bg-white p-[25px] drop-shadow-[0px_1px_1px_rgba(241,245,249,0.5)] ${className}`}
  >
    <div className="h-4 w-24 rounded bg-[#f1f5f9]" />
    <div className="mt-6 h-7 w-32 rounded bg-[#f1f5f9]" />
  </div>
);

const WorkspaceStatsLoading = () => {
  return (
    <div className="h-full w-full overflow-y-auto bg-[#fafafa]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-10">
        <div className="flex items-center justify-between">
          <div className="h-5 w-64 animate-pulse rounded bg-[#e2e8f0]" />
          <div className="h-9 w-32 animate-pulse rounded-xl bg-[#e2e8f0]" />
        </div>

        <div className="flex items-stretch justify-center gap-5">
          <CardSkeleton className="h-[124px] flex-1" />
          <CardSkeleton className="h-[124px] flex-1" />
          <CardSkeleton className="h-[124px] flex-1" />
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-7 h-[385px] animate-pulse rounded-2xl border border-[#f1f5f9] bg-white" />
          <div className="col-span-5 h-[385px] animate-pulse rounded-2xl border border-[#f1f5f9] bg-white" />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceStatsLoading;
