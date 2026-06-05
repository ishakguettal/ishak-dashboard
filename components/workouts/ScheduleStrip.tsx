import { Card, CardHeader } from "@/components/ui/Card";
import { Select, Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import {
  WEEKDAYS_SHORT,
  WORKOUT_TYPES,
  WORKOUT_TYPE_STYLES,
} from "@/lib/constants";
import { weekdayName } from "@/lib/utils/date";
import { titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { setSchedule } from "@/app/(app)/workouts/actions";

export function ScheduleStrip({
  types,
  todayWeekday,
}: {
  types: string[]; // length 7, index 0 = Sunday
  todayWeekday: number;
}) {
  return (
    <Card>
      <CardHeader
        title="Weekly split"
        action={
          <FormModal
            title="Edit weekly split"
            triggerLabel="Edit"
            triggerVariant="outline"
            showIcon={false}
            action={setSchedule}
          >
            <div className="grid grid-cols-1 gap-2">
              {WEEKDAYS_SHORT.map((_, i) => (
                <Field key={i} label={weekdayName(i)}>
                  <Select name={`type_${i}`} defaultValue={types[i] ?? "rest"}>
                    {WORKOUT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {titleize(t)}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          </FormModal>
        }
      />
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS_SHORT.map((d, i) => {
          const type = types[i] ?? "rest";
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-2 text-center",
                WORKOUT_TYPE_STYLES[type] ?? WORKOUT_TYPE_STYLES.rest,
                i === todayWeekday && "ring-2 ring-primary/60",
              )}
            >
              <div className="text-[10px] opacity-70">{d}</div>
              <div className="mt-0.5 text-[11px] font-semibold leading-tight">
                {titleize(type)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
