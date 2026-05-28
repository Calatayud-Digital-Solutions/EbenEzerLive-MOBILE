type StreamLogLevel = "info" | "warn" | "error" | "verbose";

type StreamLogContext = Record<
  string,
  string | number | boolean | null | undefined
>;

function shouldEmit(level: StreamLogLevel): boolean {
  if (level === "verbose" || level === "info") {
    return __DEV__;
  }
  return true;
}

export function logStreamEvent(
  level: StreamLogLevel,
  event: string,
  context: StreamLogContext = {}
): void {
  if (!shouldEmit(level)) {
    return;
  }

  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...context,
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function errorContext(error: unknown): StreamLogContext {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
    };
  }
  if (typeof error === "string") {
    return { errorMessage: error };
  }
  return { errorMessage: "Unknown error" };
}
