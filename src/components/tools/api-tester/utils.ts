export interface CurlCommand {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface MongoField {
  path: string;
  type: string;
  value: any;
}

export function parseCurl(curl: string): CurlCommand {
  const methodMatch = curl.match(/-X\s+(\w+)/i);
  const urlMatch = curl.match(/['\"]([^'\"]+)['\"]/);
  // Support both -H and --header, and allow multiple spaces
  const headerMatches = [
    ...curl.matchAll(/(?:-H|--header)\s+['\"]([^'\"]+)['\"]/g)
  ];
  // Support -d, --data, and --data-raw
  const bodyMatch = curl.match(/(?:-d|--data|--data-raw)\s+['\"]([^'\"]+)['\"]/);

  if (!urlMatch) {
    throw new Error('Invalid CURL command: URL not found');
  }

  const headers: Record<string, string> = {};
  for (const match of headerMatches) {
    const [_, header] = match;
    // Only split on the first colon to allow colons in values
    const colonIndex = header.indexOf(':');
    if (colonIndex !== -1) {
      const key = header.slice(0, colonIndex).trim();
      const value = header.slice(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  return {
    method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
    url: urlMatch[1],
    headers,
    body: bodyMatch ? bodyMatch[1] : undefined
  };
}

export function extractCurlComponents(curl: string): {
  method: string;
  url: string;
  headers: string[];
  body?: string;
} {
  const parsed = parseCurl(curl);
  return {
    method: parsed.method,
    url: parsed.url,
    headers: Object.entries(parsed.headers).map(([key, value]) => `${key}: ${value}`),
    body: parsed.body
  };
}

export function replacePlaceholders(
  template: string,
  fields: Record<string, any>
): string {
  return template.replace(/\${([^}]+)}/g, (_, path) => {
    const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], fields);
    return value !== undefined ? value : '';
  });
} 