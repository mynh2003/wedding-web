import { AdminHeading } from "@/components/admin-shell";
import { AdminSkeleton } from "@/components/admin-skeleton";

export default function WishesLoading() {
  return <main aria-busy="true"><AdminHeading title="Lời chúc yêu thương" description="Đang tải những lời chúc gửi đến hai bạn." /><AdminSkeleton variant="wishes" /></main>;
}
