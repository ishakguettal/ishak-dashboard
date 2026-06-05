import { Badge } from "@/components/ui/Badge";
import { PRIORITY_STYLES, type Priority } from "@/lib/constants";
import { titleize } from "@/lib/utils/format";

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_STYLES[priority]}>{titleize(priority)}</Badge>;
}
