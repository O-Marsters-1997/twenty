import ts from 'typescript';

import { convertCss, placeholderFor, type Placeholder } from './cssToStyles';
import {
  CONSTANTS_MODULE,
  resolveTokenReference,
  TOKENS_MODULE,
} from './tokenPath';

export type Finding = {
  file: string;
  line: number;
  name: string;
  reason: string;
};

export type ConversionResult = {
  output: string;
  convertedCount: number;
  findings: Finding[];
};

type Edit = { start: number; end: number; text: string };

type Candidate = {
  statement: ts.VariableStatement;
  nameNode: ts.Identifier;
  name: string;
  kind: 'styled' | 'css';
  tag: string;
  template: ts.TemplateLiteral;
};

type Usage =
  | {
      kind: 'element';
      opening: ts.JsxOpeningLikeElement;
      closing: ts.JsxClosingElement | undefined;
    }
  | { kind: 'className'; attribute: ts.JsxAttribute };

type Converted = {
  candidate: Candidate;
  key: string;
  styles: string;
  placeholders: Placeholder[];
  usages: Usage[];
};

const LINARIA_MODULES = ['@linaria/react', '@linaria/core'];
const MANAGED_IMPORTS = [
  'styled',
  'css',
  'themeCssVariables',
  'MOBILE_VIEWPORT',
];
const FORBIDDEN_USAGE_ATTRIBUTES = ['className', 'style', 'as'];

const toStyleKey = (name: string) => {
  const bare = name.replace(/^Styled/, '');
  return bare.charAt(0).toLowerCase() + bare.slice(1);
};

const applyEdits = (source: string, edits: Edit[]) =>
  [...edits]
    .sort((left, right) => right.start - left.start || right.end - left.end)
    .reduce(
      (text, edit) =>
        text.slice(0, edit.start) + edit.text + text.slice(edit.end),
      source,
    );

const parse = (fileName: string, source: string) =>
  ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

const lineOf = (sourceFile: ts.SourceFile, node: ts.Node) =>
  sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

const importsFromLinaria = (sourceFile: ts.SourceFile, name: string) =>
  sourceFile.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      LINARIA_MODULES.includes(statement.moduleSpecifier.text) &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) => element.name.text === name,
      ),
  );

const findCandidates = (
  sourceFile: ts.SourceFile,
  findings: Finding[],
): Candidate[] => {
  const hasStyled = importsFromLinaria(sourceFile, 'styled');
  const hasCss = importsFromLinaria(sourceFile, 'css');
  const candidates: Candidate[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    for (const declaration of statement.declarationList.declarations) {
      const { initializer, name } = declaration;
      if (
        initializer === undefined ||
        !ts.isIdentifier(name) ||
        !ts.isTaggedTemplateExpression(initializer)
      ) {
        continue;
      }

      const { tag, template } = initializer;
      const isStyled =
        hasStyled &&
        ts.isPropertyAccessExpression(tag) &&
        ts.isIdentifier(tag.expression) &&
        tag.expression.text === 'styled';
      const isCss = hasCss && ts.isIdentifier(tag) && tag.text === 'css';
      const reportUnsupported = (reason: string) =>
        findings.push({
          file: sourceFile.fileName,
          line: lineOf(sourceFile, statement),
          name: name.text,
          reason,
        });

      if (!isStyled && !isCss) {
        if (hasStyled && tag.getText().startsWith('styled')) {
          reportUnsupported('unsupported styled form');
        }
        continue;
      }

      if (statement.declarationList.declarations.length !== 1) {
        reportUnsupported('multiple declarations in one statement');
        continue;
      }

      if (
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        )
      ) {
        reportUnsupported('exported, importers still expect the component');
        continue;
      }

      candidates.push({
        statement,
        nameNode: name,
        name: name.text,
        kind: isStyled ? 'styled' : 'css',
        tag: isStyled ? (tag as ts.PropertyAccessExpression).name.text : '',
        template,
      });
    }
  }

  return candidates;
};

const isInsideTemplateSpan = (node: ts.Node) => {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isTemplateSpan(current)) return true;
  }
  return false;
};

const collectUsages = (
  sourceFile: ts.SourceFile,
  candidate: Candidate,
): Usage[] | string => {
  const usages: Usage[] = [];
  let reason: string | undefined;

  const visit = (node: ts.Node) => {
    if (ts.isJsxClosingElement(node)) return;

    if (
      reason === undefined &&
      ts.isIdentifier(node) &&
      node.text === candidate.name &&
      node !== candidate.nameNode
    ) {
      const { parent } = node;

      if (
        candidate.kind === 'styled' &&
        (ts.isJsxOpeningElement(parent) ||
          ts.isJsxSelfClosingElement(parent)) &&
        parent.tagName === node
      ) {
        const forbidden = parent.attributes.properties.find(
          (attribute) =>
            ts.isJsxAttribute(attribute) &&
            FORBIDDEN_USAGE_ATTRIBUTES.includes(attribute.name.getText()),
        );
        if (forbidden !== undefined) {
          reason = `usage passes ${(forbidden as ts.JsxAttribute).name.getText()}`;
        } else {
          usages.push({
            kind: 'element',
            opening: parent,
            closing: ts.isJsxOpeningElement(parent)
              ? (parent.parent as ts.JsxElement).closingElement
              : undefined,
          });
        }
      } else if (
        candidate.kind === 'css' &&
        ts.isJsxExpression(parent) &&
        ts.isJsxAttribute(parent.parent) &&
        parent.parent.name.getText() === 'className'
      ) {
        usages.push({ kind: 'className', attribute: parent.parent });
      } else {
        reason = isInsideTemplateSpan(node)
          ? `\${${candidate.name}} reference`
          : 'used outside a JSX element';
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return reason ?? usages;
};

const classifyExpression = (
  expression: ts.Expression,
  candidateNames: Set<string>,
): Placeholder | string => {
  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
    return 'prop interpolation';
  }

  if (ts.isIdentifier(expression)) {
    if (expression.text === 'MOBILE_VIEWPORT') {
      return { code: 'media.mobile', kind: 'mobileViewport', segments: [] };
    }
    if (candidateNames.has(expression.text)) {
      return `\${${expression.text}} reference`;
    }
  }

  const token = resolveTokenReference(expression);
  if (token !== undefined) {
    return { code: token.code, kind: 'token', segments: token.segments };
  }

  return `unsupported interpolation \${${expression.getText()}}`;
};

const convertCandidate = (
  sourceFile: ts.SourceFile,
  candidate: Candidate,
  candidateNames: Set<string>,
): Omit<Converted, 'usages'> | string => {
  const { template } = candidate;
  const placeholders: Placeholder[] = [];
  let css: string;

  if (ts.isNoSubstitutionTemplateLiteral(template)) {
    css = template.text;
  } else {
    css = template.head.text;
    for (const span of template.templateSpans) {
      const placeholder = classifyExpression(span.expression, candidateNames);
      if (typeof placeholder === 'string') return placeholder;
      css += placeholderFor(placeholders.length) + span.literal.text;
      placeholders.push(placeholder);
    }
  }

  const conversion = convertCss(
    css,
    placeholders,
    `${sourceFile.fileName}:${lineOf(sourceFile, candidate.statement)}`,
  );
  if ('unsupported' in conversion) return conversion.unsupported;

  return {
    candidate,
    key: toStyleKey(candidate.name),
    styles: conversion.styles,
    placeholders,
  };
};

const declaredNames = (sourceFile: ts.SourceFile) => {
  const names = new Set<string>();
  const visit = (node: ts.Node) => {
    if (
      ts.isIdentifier(node) &&
      (ts.isVariableDeclaration(node.parent) ||
        ts.isParameter(node.parent) ||
        ts.isBindingElement(node.parent) ||
        ts.isFunctionDeclaration(node.parent) ||
        ts.isImportSpecifier(node.parent) ||
        ts.isImportClause(node.parent) ||
        ts.isNamespaceImport(node.parent)) &&
      node.parent.name === node
    ) {
      names.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
};

const removeUnusedImports = (fileName: string, source: string) => {
  const sourceFile = parse(fileName, source);
  const used = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isIdentifier(node)) used.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const edits: Edit[] = [];
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause?.namedBindings === undefined ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }

    const { namedBindings } = statement.importClause;
    const kept = namedBindings.elements.filter(
      (element) =>
        !MANAGED_IMPORTS.includes(element.name.text) ||
        used.has(element.name.text),
    );
    if (kept.length === namedBindings.elements.length) continue;

    if (kept.length === 0 && statement.importClause.name === undefined) {
      const end =
        source[statement.end] === '\n' ? statement.end + 1 : statement.end;
      edits.push({ start: statement.getStart(), end, text: '' });
    } else {
      edits.push({
        start: namedBindings.getStart(),
        end: namedBindings.end,
        text: `{ ${kept.map((element) => element.getText()).join(', ')} }`,
      });
    }
  }

  return applyEdits(source, edits);
};

const buildUsageEdits = (entry: Converted): Edit[] => {
  const spread = `{...stylex.props(styles.${entry.key})}`;

  return entry.usages.flatMap((usage): Edit[] => {
    if (usage.kind === 'className') {
      return [
        {
          start: usage.attribute.getStart(),
          end: usage.attribute.end,
          text: spread,
        },
      ];
    }

    const { opening, closing } = usage;
    const renameTag = (tagName: ts.JsxTagNameExpression): Edit => ({
      start: tagName.getStart(),
      end: tagName.end,
      text: entry.candidate.tag,
    });

    return [
      renameTag(opening.tagName),
      {
        start: opening.attributes.end,
        end: opening.attributes.end,
        text: ` ${spread}`,
      },
      ...(closing === undefined ? [] : [renameTag(closing.tagName)]),
    ];
  });
};

export const convertSource = (
  fileName: string,
  source: string,
): ConversionResult => {
  const sourceFile = parse(fileName, source);
  const findings: Finding[] = [];
  const candidates = findCandidates(sourceFile, findings);
  const candidateNames = new Set(candidates.map((candidate) => candidate.name));
  const converted: Converted[] = [];

  for (const candidate of candidates) {
    const result = convertCandidate(sourceFile, candidate, candidateNames);
    const usages =
      typeof result === 'string' ? [] : collectUsages(sourceFile, candidate);

    if (typeof result !== 'string' && typeof usages !== 'string') {
      converted.push({ ...result, usages });
      continue;
    }

    findings.push({
      file: fileName,
      line: lineOf(sourceFile, candidate.statement),
      name: candidate.name,
      reason: typeof result === 'string' ? result : (usages as string),
    });
  }

  if (converted.length === 0) {
    return { output: source, convertedCount: 0, findings };
  }

  const keys = converted.map((entry) => entry.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error(`${fileName}: two blocks map to the same style key`);
  }

  const placeholders = converted.flatMap((entry) => entry.placeholders);
  const tokenGroups = [
    ...new Set(
      placeholders
        .filter((placeholder) => placeholder.kind === 'token')
        .map((placeholder) => placeholder.segments[0]),
    ),
  ];
  const usesMedia = placeholders.some(
    (placeholder) => placeholder.kind === 'mobileViewport',
  );

  const names = declaredNames(sourceFile);
  const clash = [
    'stylex',
    'styles',
    ...tokenGroups,
    ...(usesMedia ? ['media'] : []),
  ].find((name) => names.has(name));
  if (clash !== undefined) {
    throw new Error(`${fileName}: identifier \`${clash}\` is already declared`);
  }

  const imports = [
    "import * as stylex from '@stylexjs/stylex';",
    ...(tokenGroups.length > 0
      ? [`import { ${tokenGroups.join(', ')} } from '${TOKENS_MODULE}';`]
      : []),
    ...(usesMedia ? [`import { media } from '${CONSTANTS_MODULE}';`] : []),
  ].join('\n');

  const stylesDeclaration = `const styles = stylex.create({\n${converted
    .map((entry) => `  ${entry.key}: ${entry.styles},`)
    .join('\n')}\n});`;

  const edits: Edit[] = converted.flatMap((entry, index) => {
    const statementStart = entry.candidate.statement.getStart();
    let end = entry.candidate.statement.end;
    if (index === 0) {
      return [
        { start: statementStart, end, text: stylesDeclaration },
        ...buildUsageEdits(entry),
      ];
    }
    while (source[end] === '\n') end++;
    return [
      { start: statementStart, end, text: '' },
      ...buildUsageEdits(entry),
    ];
  });

  const lastImport = [...sourceFile.statements]
    .reverse()
    .find((statement) => ts.isImportDeclaration(statement));
  edits.push(
    lastImport === undefined
      ? { start: 0, end: 0, text: `${imports}\n\n` }
      : { start: lastImport.end, end: lastImport.end, text: `\n${imports}` },
  );

  return {
    output: removeUnusedImports(fileName, applyEdits(source, edits)),
    convertedCount: converted.length,
    findings,
  };
};
