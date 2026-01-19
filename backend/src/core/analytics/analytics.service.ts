/* -------------------------------------------------------------------------- */
/*  CORE / ANALYTICS — ANALYTICS SERVICE (ORCHESTRATOR)                        */
/*  File: core/analytics/analytics.service.ts                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📊 Streaming • Offline • Observable • Scalable • Secure                    */
/*                                                                            */
/* -------------------------------------------------------------------------- */

import {
  AnalyticsEvent,
  AnalyticsStreamID,
} from "./analytics.types";

import {
  AnalyticsEventEntity,
} from "./analytics.event.model";

import {
  AnalyticsPipeline,
  AnalyticsPipelineContext,
  AnalyticsPipelineObserver,
} from "./analytics.pipeline.interface";

/* -------------------------------------------------------------------------- */
/* 🧱 ERREURS                                                                  */
/* -------------------------------------------------------------------------- */

export class AnalyticsServiceError extends Error {
  constructor(message: string) {
    super(`[AnalyticsService] ${message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔭 OBSERVER                                                                 */
/* -------------------------------------------------------------------------- */

export interface AnalyticsServiceObserver {
  onIngest?(event: AnalyticsEvent): void;
  onPipelineStart?(pipelineId: string): void;
  onPipelineError?(pipelineId: string, error: Error): void;
  onDropped?(event: AnalyticsEvent, reason: string): void;
  onMetric?(name: string, value: number): void;
}

/* -------------------------------------------------------------------------- */
/* ⚙️ CONFIGURATION                                                            */
/* -------------------------------------------------------------------------- */

export interface AnalyticsServiceConfig {
  maxOfflineBuffer?: number;
  maxRetry?: number;
  enableBackpressure?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 📦 INTERNAL TYPES                                                           */
/* -------------------------------------------------------------------------- */

interface BufferedEvent {
  event: AnalyticsEvent;
  retry: number;
}

/* -------------------------------------------------------------------------- */
/* 🚀 ANALYTICS SERVICE                                                        */
/* -------------------------------------------------------------------------- */

export class AnalyticsService {
  private readonly pipelines = new Map<
    AnalyticsStreamID,
    AnalyticsPipeline[]
  >();

  private readonly offlineBuffer: BufferedEvent[] = [];

  constructor(
    private readonly observer?: AnalyticsServiceObserver,
    private readonly config: AnalyticsServiceConfig = {}
  ) {}

  /* ------------------------------------------------------------------------ */
  /* 🔗 PIPELINE REGISTRATION                                                  */
  /* ------------------------------------------------------------------------ */

  registerPipeline(
    stream: AnalyticsStreamID,
    pipeline: AnalyticsPipeline
  ) {
    const list = this.pipelines.get(stream) ?? [];
    list.push(pipeline);
    this.pipelines.set(stream, list);
  }

  /* ------------------------------------------------------------------------ */
  /* 📥 INGESTION                                                              */
  /* ------------------------------------------------------------------------ */

  async ingest(raw: {
    stream: AnalyticsStreamID;
    payload: any;
  }): Promise<void> {
    try {
      const entity = AnalyticsEventEntity.create({
        stream: raw.stream,
        payload: raw.payload,
      });

      const event = entity.snapshot;

      this.observer?.onIngest?.(event);

      const pipelines = this.pipelines.get(event.stream);

      if (!pipelines || pipelines.length === 0) {
        this.observer?.onDropped?.(
          event,
          "No pipeline registered"
        );
        return;
      }

      for (const pipeline of pipelines) {
        await this.runPipeline(pipeline, event);
      }
    } catch (err: any) {
      throw new AnalyticsServiceError(err.message);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ♻️ OFFLINE BUFFER                                                         */
  /* ------------------------------------------------------------------------ */

  bufferOffline(event: AnalyticsEvent) {
    const limit = this.config.maxOfflineBuffer ?? 10_000;

    if (this.offlineBuffer.length >= limit) {
      this.offlineBuffer.shift();
      this.observer?.onMetric?.("analytics.buffer.drop", 1);
    }

    this.offlineBuffer.push({ event, retry: 0 });
  }

  async flushOffline(): Promise<void> {
    const buffered = [...this.offlineBuffer];
    this.offlineBuffer.length = 0;

    for (const item of buffered) {
      try {
        const pipelines = this.pipelines.get(
          item.event.stream
        );
        if (!pipelines) continue;

        for (const pipeline of pipelines) {
          await this.runPipeline(pipeline, item.event);
        }
      } catch {
        // re-buffer if still failing
        this.bufferOffline(item.event);
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ⚙️ PIPELINE EXECUTION                                                     */
  /* ------------------------------------------------------------------------ */

  private async runPipeline(
    pipeline: AnalyticsPipeline,
    event: AnalyticsEvent
  ) {
    const context: AnalyticsPipelineContext = {
      pipelineId: pipeline.id,
      mode: pipeline.mode,
      attempt: 1,
      maxAttempts: this.config.maxRetry ?? 3,
      startedAt: Date.now(),
    };

    const observer: AnalyticsPipelineObserver = {
      onStart: () =>
        this.observer?.onPipelineStart?.(pipeline.id),

      onError: (_, error) =>
        this.observer?.onPipelineError?.(
          pipeline.id,
          error
        ),
    };

    try {
      await pipeline.process(event, context, observer);
      this.observer?.onMetric?.(
        "analytics.pipeline.success",
        1
      );
    } catch (err: any) {
      this.observer?.onMetric?.(
        "analytics.pipeline.failure",
        1
      );

      if (event.offline?.persist) {
        this.bufferOffline(event);
      }

      throw err;
    }
  }
}
