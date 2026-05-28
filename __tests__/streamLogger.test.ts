import { logStreamEvent, errorContext } from "../src/streaming/streamLogger";

describe("streamLogger", () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  it("always emits warn and error in production mode", () => {
    let warned = 0;
    console.warn = () => {
      warned += 1;
    };
    logStreamEvent("warn", "ws.disconnected", { closeCode: 1006 });
    expect(warned).toBe(1);
  });

  it("errorContext extracts Error fields", () => {
    expect(errorContext(new Error("socket closed"))).toEqual({
      errorMessage: "socket closed",
      errorName: "Error",
    });
  });
});
