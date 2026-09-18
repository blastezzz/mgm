import { STATUS_LABEL, type CaseStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className="status" data-s={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}
