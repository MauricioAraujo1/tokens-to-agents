import { useState } from "react";
import { DEFAULT_PLAYGROUND_ID, GUIDED_PROJECTS, PLAYGROUNDS, SAMPLING_LESSON_ID } from "../../data/labs";
import { formatLessonCode, type LessonLocation } from "../../lib/course";
import type { PlaygroundId } from "../../types/practice";
import { SectionList } from "../layout/SectionList";
import { SamplingPlayground } from "./SamplingPlayground";

interface LabViewProps {
  findLesson: (lessonId: string) => LessonLocation | undefined;
}

const COMING_SOON_HINT = "Em breve";

export function LabView({ findLesson }: LabViewProps) {
  const [selectedPlaygroundId, setSelectedPlaygroundId] = useState<PlaygroundId>(DEFAULT_PLAYGROUND_ID);
  const samplingLesson = findLesson(SAMPLING_LESSON_ID);
  const lessonCode = samplingLesson ? formatLessonCode(samplingLesson.module, samplingLesson.lessonIndex) : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden">
      <SectionList
        label="Playgrounds e projetos"
        activeId={selectedPlaygroundId}
        hasActiveMarker
        onSelect={(id) => setSelectedPlaygroundId(id as PlaygroundId)}
        groups={[
          {
            title: "Playgrounds",
            items: PLAYGROUNDS.map((playground) => ({
              id: playground.id,
              label: playground.title,
              isDisabled: !playground.isAvailable,
              hint: playground.isAvailable ? undefined : COMING_SOON_HINT,
            })),
          },
          {
            title: "Projetos guiados",
            items: GUIDED_PROJECTS.map((project) => ({
              id: `project-${project.number}`,
              label: `${project.number} ${project.title}`,
              isDisabled: true,
              hint: COMING_SOON_HINT,
            })),
          },
        ]}
      />

      {selectedPlaygroundId === "sampling" && <SamplingPlayground lessonCode={lessonCode} />}
    </div>
  );
}
