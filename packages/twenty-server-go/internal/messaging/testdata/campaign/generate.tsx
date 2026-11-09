import { readFileSync, writeFileSync } from 'node:fs';
import { render, toPlainText } from 'react-email';
import { reactMarkupFromJSON } from 'src/utils/email-renderer/email-renderer';

const [directory, name] = process.argv.slice(2);
const variables: Record<string, unknown> = JSON.parse(
  readFileSync(`${directory}/${name}.variables.json`, 'utf8'),
);
let template = readFileSync(`${directory}/${name}.json`, 'utf8');
for (const [key, value] of Object.entries(variables)) {
  template = template.replaceAll(
    `{{${key}}}`,
    typeof value === 'string' ? JSON.stringify(value).slice(1, -1) : String(value),
  );
}
const html = (await render(reactMarkupFromJSON(JSON.parse(template)))).replace(/<!--.*?-->/g, '');
writeFileSync(`${directory}/${name}.html`, html);
writeFileSync(`${directory}/${name}.txt`, toPlainText(html));
