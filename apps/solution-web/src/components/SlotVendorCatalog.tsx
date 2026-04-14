"use client";

import { VendorGridCatalog } from "@/components/VendorGridCatalog";

type SlotVendorCatalogProps = {
  className?: string;
  vendorId?: string;
  onVendorChange?: (vendorId: string) => void;
  showTabs?: boolean;
};

export function SlotVendorCatalog({
  className,
  vendorId,
  onVendorChange,
  showTabs = true,
}: SlotVendorCatalogProps) {
  return (
    <VendorGridCatalog
      categories={["slot"]}
      className={className}
      vendorId={vendorId}
      onVendorChange={onVendorChange}
      showVendorTabs={showTabs}
      showCategoryTabs={false}
      showSummary={false}
    />
  );
}
