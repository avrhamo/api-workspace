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
  const methodMatch = curl.match(/(?:-X|--request)\s+(\w+)/i);
  const urlMatch = curl.match(/['\"]([^'\"]+)['\"]/);

  // Support both -H and --header, and allow multiple spaces
  const headerMatches = [
    ...curl.matchAll(/(?:-H|--header)\s+['\"]([^'\"]+)['\"]/g)
  ];
  
  // Support -d, --data, and --data-raw with multi-line JSON
  // First, join all lines and normalize whitespace
  const normalizedCurl = curl.replace(/\\\n\s*/g, '');
  
  // Then match the data portion, being careful with --data-raw to not include 'raw' in the match
  const dataRawMatch = normalizedCurl.match(/--data-raw\s+['"]([\s\S]*?)['"]$/);
  const dataMatch = !dataRawMatch ? normalizedCurl.match(/(?:-d|--data)\s+['"]([\s\S]*?)['"]$/) : null;
  
  const bodyMatch = dataRawMatch || dataMatch;

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

  const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
  let body = undefined;

  // Only try to parse body for non-GET requests or if explicitly provided
  if (method !== 'GET' || bodyMatch) {
    if (bodyMatch) {
      try {
        // Clean up the body content - using group 1 which is the content between quotes
        let bodyContent = bodyMatch[1];
        
        // Then handle escapes
        bodyContent = bodyContent
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, '\\')
          .trim();

        // Validate JSON structure before parsing
        if (bodyContent.startsWith('{') && bodyContent.endsWith('}')) {
          try {
            // Try to parse as JSON
            body = JSON.parse(bodyContent);
          } catch (firstError) {
            // If first attempt fails, try cleaning up common JSON issues
            const cleanContent = bodyContent
              .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
              .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
              .replace(/\n\s*/g, '')   // Remove newlines and whitespace
              .replace(/\r/g, '')      // Remove carriage returns
              .trim();

            try {
              body = JSON.parse(cleanContent);
            } catch (secondError) {
              throw new Error('Invalid JSON in request body');
            }
          }
        } else {
          body = bodyContent;
        }
      } catch (e) {
        throw new Error('Failed to parse request body: ' + (e instanceof Error ? e.message : String(e)));
      }
    }
  }

  const result = {
    method,
    url: urlMatch[1],
    headers,
    body
  };

  return result;
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