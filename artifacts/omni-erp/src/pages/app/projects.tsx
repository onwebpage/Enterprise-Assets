import { FolderKanban, Database, ArrowRight } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";

export default function Projects() {
  return (
    <AppLayout breadcrumbs={[{ label: "Business" }, { label: "Projects" }]}>
      <div className="mx-auto flex min-h-[520px] max-w-[900px] items-center justify-center p-6">
        <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
            <FolderKanban className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-white">Projects</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/45">
            Project tracking is not connected to a live data source in this workspace yet.
            No sample projects or fabricated metrics are shown.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-blue-600 hover:bg-blue-500">
              <a href="/app/workflow">
                <ArrowRight className="mr-2 h-4 w-4" />
                Open Workflow Automation
              </a>
            </Button>
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/35">
              <Database className="h-3.5 w-3.5" />
              Waiting for project data
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}