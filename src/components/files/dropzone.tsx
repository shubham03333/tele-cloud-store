"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useUploader } from "@/hooks/use-uploader";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function Dropzone({
  children,
  onUploaded,
  folderId,
}: {
  children: React.ReactNode;
  onUploaded?: () => void;
  folderId?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const { jobs, uploadFile, pause, resume, cancel } = useUploader();
  const [hover, setHover] = useState(false);

  function collectFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      void uploadFile(file, folderId, onUploaded);
    });
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(event) => {
        event.preventDefault();
        setHover(false);
        collectFiles(event.dataTransfer.files);
      }}
      className={hover ? "rounded-[28px] ring-2 ring-primary/40" : ""}
    >
      <div className="mb-5 flex flex-wrap gap-2 sm:mb-4">
        <Button className="h-12 min-w-0 flex-1 sm:h-10 sm:flex-none" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
        <Button
          variant="secondary"
          className="h-12 min-w-0 flex-1 sm:h-10 sm:flex-none"
          onClick={() => folderRef.current?.click()}
        >
          <span className="sm:hidden">Folder</span>
          <span className="hidden sm:inline">Upload folder</span>
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => collectFiles(event.target.files)} />
        <input
          ref={folderRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => collectFiles(event.target.files)}
          {...{ webkitdirectory: "true", directory: "true" }}
        />
      </div>
      {jobs.length > 0 ? (
        <div className="glass mb-5 space-y-3 rounded-3xl border border-primary/10 bg-primary/[0.03] p-3 shadow-sm shadow-primary/5 sm:p-4">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-2xl bg-background/65 p-3 ring-1 ring-border/60 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {job.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{job.name}</span>
                    <span className="shrink-0 text-xs font-medium capitalize text-primary">{job.status}</span>
                  </div>
                  <Progress value={job.progress} className="mt-2.5" />
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{job.progress}%</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pl-12">
                <Button size="sm" variant="ghost" onClick={() => void pause(job.id)} disabled={job.status !== "uploading"}>
                  Pause
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void resume(job.id)} disabled={job.status !== "paused"}>
                  Resume
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void cancel(job.id)}>
                  Cancel
                </Button>
              </div>
              {job.error ? <p className="mt-2 pl-12 text-xs text-destructive">{job.error}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
}
