import { Printer } from "lucide-react";
import { useState } from "react";
import { MODULE_SUMMARIES } from "../../data/summaries";
import type { LessonLocation } from "../../lib/course";
import type { CourseModule } from "../../types/course";
import { SectionList } from "../layout/SectionList";
import { Button } from "../ui/Button";
import { SummarySheet } from "./SummarySheet";

interface SummariesViewProps {
  modules: CourseModule[];
  findLesson: (lessonId: string) => LessonLocation | undefined;
  onOpenLesson: (lessonId: string) => void;
}

const SUMMARY_BY_MODULE = new Map(MODULE_SUMMARIES.map((summary) => [summary.moduleId, summary]));

export function SummariesView({ modules, findLesson, onOpenLesson }: SummariesViewProps) {
  const [selectedModuleId, setSelectedModuleId] = useState(() => MODULE_SUMMARIES[0]?.moduleId);
  const selectedModule = modules.find((module) => module.id === selectedModuleId);
  const selectedSummary = selectedModuleId ? SUMMARY_BY_MODULE.get(selectedModuleId) : undefined;

  return (
    <div className="flex min-h-0 flex-1 animate-fade-in flex-col gap-4 overflow-y-auto p-4 print:p-0 lg:flex-row lg:overflow-hidden">
      <SectionList
        label="Resumos por módulo"
        activeId={selectedModuleId}
        onSelect={setSelectedModuleId}
        groups={[
          {
            title: "Resumos (cheat sheets)",
            items: modules.map((module) => ({
              id: module.id,
              label: `${module.number} ${module.title}`,
              isDisabled: !SUMMARY_BY_MODULE.has(module.id),
              hint: SUMMARY_BY_MODULE.has(module.id) ? undefined : "Resumo em preparação",
            })),
          },
        ]}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 lg:overflow-y-auto">
        <div className="flex w-full max-w-[900px] flex-wrap items-center justify-between gap-2 print:hidden">
          <p className="whitespace-pre text-[11px] text-muted">Cabe em 2 páginas A4  ·  sem navegação na impressão</p>
          <Button variant="secondary" className="font-bold" onClick={() => window.print()} disabled={!selectedSummary}>
            <Printer size={14} aria-hidden="true" />
            Imprimir / PDF
          </Button>
        </div>

        {selectedModule && selectedSummary ? (
          <SummarySheet key={selectedModule.id} module={selectedModule} summary={selectedSummary} findLesson={findLesson} onOpenLesson={onOpenLesson} />
        ) : (
          <section className="grid w-full max-w-[900px] flex-1 place-items-center rounded-md border border-line bg-surface p-8">
            <p className="text-[13px] text-muted">Escolha um módulo com resumo disponível.</p>
          </section>
        )}
      </div>
    </div>
  );
}
