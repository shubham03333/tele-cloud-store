import type { VirusScanResult } from "@/types";

export interface VirusScanner {
  scan(buffer: Buffer, filename: string): Promise<VirusScanResult>;
}

export class NoOpVirusScanner implements VirusScanner {
  async scan(buffer: Buffer, filename: string): Promise<VirusScanResult> {
    void buffer;
    void filename;
    return { clean: true, engine: "noop-placeholder" };
  }
}
