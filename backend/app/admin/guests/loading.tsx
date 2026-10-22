import { AdminHeading } from "@/components/admin-shell";
import { AdminSkeleton } from "@/components/admin-skeleton";

export default function GuestsLoading() {
  return <main aria-busy="true"><AdminHeading title="Khách mời" description="Đang chuẩn bị danh sách khách mời của bạn." /><AdminSkeleton variant="guests" /></main>;
}
