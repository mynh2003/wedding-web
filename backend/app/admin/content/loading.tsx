import { AdminHeading } from "@/components/admin-shell";
import { AdminSkeleton } from "@/components/admin-skeleton";

export default function ContentLoading() {
  return <main aria-busy="true"><AdminHeading title="Nội dung & hình ảnh" description="Đang chuẩn bị không gian chỉnh sửa thiệp cưới." /><AdminSkeleton variant="editor" /></main>;
}
