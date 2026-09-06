"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
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
  const { jobs, uploadFile, pause, resume, cancel } = useUploader(onUploaded);
  const [hover, setHover] = useState(false);

  function collectFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      void uploadFile(file, folderId);
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
      <div className="mb-4 flex gap-2">
        <Button className="h-12 flex-1 sm:h-10 sm:flex-none" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
        <Button
          variant="secondary"
          className="hidden h-10 sm:inline-flex"
          onClick={() => folderRef.current?.click()}
        >
          Upload folder
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
      {children}
      {jobs.length > 0 ? (
        <div className="glass mt-4 space-y-3 rounded-3xl p-4">
          {jobs.map((job) => (
            <div key={job.id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{job.name}</span>
                <span className="shrink-0 text-muted-foreground">{job.status}</span>
              </div>
              <Progress value={job.progress} />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void pause(job.id)}>
                  Pause
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void resume(job.id)}>
                  Resume
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void cancel(job.id)}>
                  Cancel
                </Button>
              </div>
              {job.error ? <p className="mt-1 text-xs text-destructive">{job.error}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
