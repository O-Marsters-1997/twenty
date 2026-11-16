import postcss from 'postcss';
import postcssJs from 'postcss-js';

export type Placeholder = {
  code: string;
  kind: 'token' | 'mobileViewport';
  segments: string[];
};

export type StyleEntry = {
  property: string;
  conditions: string[];
  value: string;
};

export type CssConversion =
  | { styles: string }
  | { unsupported: string };

const PLACEHOLDER_PATTERN = /__X(\d+)__/g;
const MEDIA_MOBILE_PATTERN = /^\(max-width:\s*(__X\d+__)px\)$/;
const PSEUDO_SELECTOR_PATTERN = /^&(::?[a-zA-Z-]+(?:\([^)]*\))?)$/;
const BORDER_STYLES = new Set([
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);

export const placeholderFor = (index: number) => `__X${index}__`;

const quote = (text: string) =>
  text.includes("'") && !text.includes('"') && !text.includes('\\')
    ? `"${text}"`
    : `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const valueToCode = (value: string, placeholders: Placeholder[]) => {
  const parts = value.split(PLACEHOLDER_PATTERN);

  if (parts.length === 1) {
    return quote(value);
  }

  if (parts.length === 3 && parts[0] === '' && parts[2] === '') {
    return placeholders[Number(parts[1])].code;
  }

  const body = parts
    .map((part, index) =>
      index % 2 === 1
        ? `\${${placeholders[Number(part)].code}}`
        : part.replace(/[`\\]|\$\{/g, (match) => `\\${match}`),
    )
    .join('');

  return `\`${body}\``;
};

const splitTopLevel = (value: string) => {
  const tokens: string[] = [];
  let depth = 0;
  let current = '';

  for (const character of value.trim()) {
    if (character === '(') depth++;
    if (character === ')') depth--;
    if (/\s/.test(character) && depth === 0) {
      if (current !== '') tokens.push(current);
      current = '';
    } else {
      current += character;
    }
  }

  return current === '' ? tokens : [...tokens, current];
};

const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
const CORNERS = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'];

const expandBox = (
  prefix: string,
  suffix: string,
  names: string[],
  tokens: string[],
): [string, string][] | undefined => {
  if (tokens.length < 1 || tokens.length > 4) return undefined;

  const [first, second = first, third = first, fourth = second] = tokens;
  const resolved = [first, second, third, fourth];

  return names.map((name, index) => [
    `${prefix}${name}${suffix}`,
    resolved[index],
  ]);
};

const classifyBorderToken = (
  token: string,
  placeholders: Placeholder[],
): 'Width' | 'Style' | 'Color' | undefined => {
  if (BORDER_STYLES.has(token)) return 'Style';

  const placeholderMatch = token.match(/^__X(\d+)__$/);
  if (placeholderMatch !== null) {
    const { segments } = placeholders[Number(placeholderMatch[1])];
    if (segments.includes('color')) return 'Color';
    if (segments.includes('width')) return 'Width';
    return undefined;
  }

  if (/^[\d.]/.test(token) || /^(thin|medium|thick)$/.test(token)) {
    return 'Width';
  }
  if (/^calc\(/.test(token)) return 'Width';

  return /^(#|rgb|hsl|var\(|[a-zA-Z]+$)/.test(token) ? 'Color' : undefined;
};

const BORDER_SIDE_PROPERTIES: Record<string, string> = {
  border: 'border',
  borderTop: 'borderTop',
  borderRight: 'borderRight',
  borderBottom: 'borderBottom',
  borderLeft: 'borderLeft',
};

const expandShorthand = (
  property: string,
  value: string,
  placeholders: Placeholder[],
): [string, string][] | string => {
  const tokens = splitTopLevel(value);

  if (property === 'padding' || property === 'margin') {
    return (
      expandBox(property, '', SIDES, tokens) ?? `unsupported ${property} value`
    );
  }

  if (property === 'borderRadius') {
    if (value.includes('/')) return 'unsupported border-radius slash syntax';
    return (
      expandBox('border', 'Radius', CORNERS, tokens) ??
      'unsupported border-radius value'
    );
  }

  if (property in BORDER_SIDE_PROPERTIES) {
    if (tokens.length === 1 && tokens[0] === '0') {
      return [[`${property}Width`, '0']];
    }

    const expanded: [string, string][] = [];
    for (const token of tokens) {
      const part = classifyBorderToken(token, placeholders);
      if (part === undefined) return `unclassifiable ${property} part ${token}`;
      expanded.push([`${property}${part}`, token]);
    }
    return expanded.length === 0 ? `empty ${property} value` : expanded;
  }

  return [[property, value]];
};

const collectEntries = (
  node: Record<string, unknown>,
  conditions: string[],
  placeholders: Placeholder[],
  entries: StyleEntry[],
): string | undefined => {
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) return `duplicate property ${key}`;

    if (typeof value === 'object' && value !== null) {
      let condition: string;
      const media = key.match(/^@media (.*)$/)?.[1].match(MEDIA_MOBILE_PATTERN);
      const pseudo = key.match(PSEUDO_SELECTOR_PATTERN);

      if (media !== null && media !== undefined) {
        const placeholder = placeholders[Number(media[1].slice(3, -2))];
        if (placeholder.kind !== 'mobileViewport') {
          return 'unsupported @media interpolation';
        }
        condition = '[media.mobile]';
      } else if (pseudo !== null) {
        condition = quote(pseudo[1]);
      } else if (key.startsWith('@')) {
        return `unsupported at-rule ${key}`;
      } else {
        return `nested selector ${key}`;
      }

      const reason = collectEntries(
        value as Record<string, unknown>,
        [...conditions, condition],
        placeholders,
        entries,
      );
      if (reason !== undefined) return reason;
      continue;
    }

    const text = String(value);
    if (/!important/i.test(text)) return '!important';

    if (key.includes('__X')) return 'interpolation in property name';

    const expanded = expandShorthand(key, text, placeholders);
    if (typeof expanded === 'string') return expanded;

    for (const [property, expandedValue] of expanded) {
      entries.push({ property, conditions, value: expandedValue });
    }
  }

  return undefined;
};

const buildValue = (
  entries: StyleEntry[],
  depth: number,
  placeholders: Placeholder[],
): string => {
  const base = entries.filter((entry) => entry.conditions.length === depth);
  const conditioned = entries.filter((entry) => entry.conditions.length > depth);

  if (conditioned.length === 0) {
    return valueToCode(base[base.length - 1].value, placeholders);
  }

  const conditionKeys = [
    ...new Set(conditioned.map((entry) => entry.conditions[depth])),
  ];
  const baseCode =
    base.length === 0
      ? 'null'
      : valueToCode(base[base.length - 1].value, placeholders);
  const members = conditionKeys.map((condition) => {
    const nested = conditioned.filter(
      (entry) => entry.conditions[depth] === condition,
    );
    return `${condition}: ${buildValue(nested, depth + 1, placeholders)}`;
  });

  return `{ default: ${baseCode}, ${members.join(', ')} }`;
};

const toPropertyKey = (property: string) =>
  /^[A-Za-z_$][\w$]*$/.test(property) ? property : quote(property);

export const convertCss = (
  css: string,
  placeholders: Placeholder[],
  location: string,
): CssConversion => {
  let parsed: Record<string, unknown>;
  try {
    parsed = postcssJs.objectify(postcss.parse(css));
  } catch (error) {
    throw new Error(
      `${location}: cannot parse CSS: ${(error as Error).message}`,
    );
  }

  const entries: StyleEntry[] = [];
  const reason = collectEntries(parsed, [], placeholders, entries);
  if (reason !== undefined) return { unsupported: reason };

  const properties = [...new Set(entries.map((entry) => entry.property))];
  const lines = properties.map(
    (property) =>
      `    ${toPropertyKey(property)}: ${buildValue(
        entries.filter((entry) => entry.property === property),
        0,
        placeholders,
      )},`,
  );

  return { styles: `{\n${lines.join('\n')}\n  }` };
};
