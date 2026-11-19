const CardSkeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-2xl border border-[#e2e8f0]/80 bg-white p-[25px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] ${className}`}
  >
    <div className="h-5 w-24 rounded bg-[#f1f5f9]" />
    <div className="mt-3 h-3 w-64 rounded bg-[#f1f5f9]" />
    <div className="mt-6 h-11 w-full max-w-[448px] rounded-lg bg-[#f1f5f9]" />
  </div>
);

const WorkspaceSettingsLoading = () => {
  return (
    <div className="h-full w-full overflow-y-auto bg-[#fafafa]">
      <div className="flex w-full flex-col items-start px-8 py-7 lg:px-32">
        <div className="flex w-full max-w-[768px] flex-col gap-6 px-6 pb-20">
          <div className="-mt-3 mb-1 h-5 w-48 animate-pulse rounded bg-[#e2e8f0]" />
          <CardSkeleton className="h-[160px]" />
          <CardSkeleton className="h-[280px]" />
          <CardSkeleton className="h-[160px]" />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSettingsLoading;
