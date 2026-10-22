type SkeletonVariant = "dashboard" | "guests" | "wishes" | "editor" | "media";

function Line({ className = "" }: { className?: string }) {
  return <span className={`admin-skeleton ${className}`} />;
}

export function AdminSkeleton({ variant = "dashboard" }: { variant?: SkeletonVariant }) {
  return <div className={`admin-skeleton-layout admin-skeleton-${variant}`} role="status" aria-label="Đang tải dữ liệu">
    <span className="sr-only">Đang tải dữ liệu, vui lòng chờ.</span>
    <div aria-hidden="true">
      {variant === "dashboard" ? <>
        <div className="admin-skeleton-heading"><Line className="skeleton-title" /><Line className="skeleton-subtitle" /></div>
        <Line className="skeleton-banner" />
        <div className="admin-stats">{[1, 2, 3].map(key => <div key={key} className="admin-card skeleton-stat"><Line className="skeleton-avatar" /><Line /><Line className="skeleton-short" /></div>)}</div>
        <div className="admin-dashboard-grid">{[1, 2].map(key => <div key={key} className="admin-card"><Line className="skeleton-title" />{[1, 2, 3].map(row => <div key={row} className="skeleton-row"><Line className="skeleton-avatar" /><div><Line /><Line className="skeleton-short" /></div></div>)}</div>)}</div>
      </> : variant === "editor" ? <div className="admin-card"><Line className="skeleton-tabs" /><div className="admin-editor-fields">{[1, 2, 3, 4, 5, 6].map(key => <div key={key} className="skeleton-field"><Line className="skeleton-short" /><Line className="skeleton-input" /></div>)}</div><Line className="skeleton-button" /></div>
        : variant === "media" ? <div className="admin-media-list">{[1, 2, 3].map(key => <div key={key} className="skeleton-row"><Line className="skeleton-image" /><div><Line /><Line className="skeleton-short" /></div></div>)}</div>
          : <div className={variant === "wishes" ? "admin-wish-grid" : "skeleton-guest-list"}>{[1, 2, 3].map(key => <div key={key} className="admin-card"><div className="skeleton-row"><Line className="skeleton-avatar" /><div><Line /><Line className="skeleton-short" /></div></div>{variant === "wishes" && <Line className="skeleton-copy" />}<div className="skeleton-actions"><Line className="skeleton-button" /><Line className="skeleton-button" /></div></div>)}</div>}
    </div>
  </div>;
}
