/** Microsoft Edge Writing Assistance APIs (experimental). */

type EdgeAiAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available"
  | "readily";

interface EdgeAiDownloadMonitorEvent {
  loaded: number;
  total: number;
}

interface SummarizerCreateOptions {
  type?: "tl;dr" | "key-points" | "teaser" | "headline";
  length?: "short" | "medium" | "long";
  format?: "plain-text" | "markdown";
  sharedContext?: string;
  monitor?: (event: EdgeAiDownloadMonitorEvent) => void;
}

interface SummarizerSession {
  summarize(
    input: string,
    options?: { context?: string }
  ): Promise<string>;
  summarizeStreaming?(
    input: string,
    options?: { context?: string }
  ): AsyncIterable<string>;
  destroy(): void;
}

interface SummarizerStatic {
  availability(): Promise<EdgeAiAvailability>;
  create(options?: SummarizerCreateOptions): Promise<SummarizerSession>;
}

declare const Summarizer: SummarizerStatic | undefined;
