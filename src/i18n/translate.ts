type MessageNode = string | { [key: string]: MessageNode };

function readPath(root: MessageNode, segments: readonly string[]): string | null {
  let node: MessageNode = root;
  for (let i = 0; i < segments.length; i++) {
    const key = segments[i];
    if (typeof node !== "object" || node === null) {
      return null;
    }
    const next = node[key];
    if (next === undefined) {
      return null;
    }
    if (i === segments.length - 1) {
      return typeof next === "string" ? next : null;
    }
    if (typeof next === "string") {
      return null;
    }
    node = next;
  }
  return null;
}

export function translatePath(messages: MessageNode, path: string): string {
  const segments = path.split(".").filter((segment) => segment.length > 0);
  const result = readPath(messages, segments);
  return result ?? path;
}

export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value !== undefined ? value : "";
  });
}
