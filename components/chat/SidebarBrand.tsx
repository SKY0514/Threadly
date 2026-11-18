import { PanelLeft } from "lucide-react";
import BrandLogo from "../BrandLogo";

const SidebarBrand = () => {
  return (
    <div className="flex w-full items-center justify-between px-2 py-0.75">
      {/* 왼쪽 */}
      <BrandLogo />
      {/* 오른쪽 */}
      <button
        type="button"
        disabled
        title="사이드바 접기 (준비 중)"
        className="flex items-center justify-center p-1"
      >
        <PanelLeft className="size-3.5" color="#64748B" />
      </button>
    </div>
  );
};

export default SidebarBrand;
