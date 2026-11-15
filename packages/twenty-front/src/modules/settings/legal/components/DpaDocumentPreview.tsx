import { type DpaDocument } from '@/settings/legal/types/Dpa';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  document: {
    background: background['--t-background-primary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: '1.5',
    maxHeight: '460px',
    overflowY: 'auto',
    paddingTop: spacing['--t-spacing-6'],
    paddingRight: spacing['--t-spacing-6'],
    paddingBottom: spacing['--t-spacing-6'],
    paddingLeft: spacing['--t-spacing-6'],
  },
  title: {
    fontSize: fontSize['--t-font-size-lg'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginTop: '0',
    marginRight: '0',
    marginBottom: '0',
    marginLeft: '0',
  },
  lastUpdated: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xs'],
    marginBottom: spacing['--t-spacing-4'],
    marginTop: spacing['--t-spacing-1'],
  },
  heading: {
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBottom: spacing['--t-spacing-1'],
    marginTop: spacing['--t-spacing-4'],
  },
  paragraph: {
    color: fontColor['--t-font-color-secondary'],
    marginTop: spacing['--t-spacing-2'],
    marginRight: '0',
    marginBottom: spacing['--t-spacing-2'],
    marginLeft: '0',
    textAlign: 'justify',
  },
  signatureField: {
    marginTop: spacing['--t-spacing-2'],
    marginRight: '0',
    marginBottom: spacing['--t-spacing-2'],
    marginLeft: '0',
  },
  signatureLabel: {
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  signatureValue: {
    color: fontColor['--t-font-color-secondary'],
    whiteSpace: 'pre-wrap',
  },
});

type DpaDocumentPreviewProps = {
  document: DpaDocument;
};

export const DpaDocumentPreview = ({ document }: DpaDocumentPreviewProps) => (
  // tabIndex makes the scrollable region focusable so keyboard-only users can
  // scroll the agreement with the arrow keys.
  <div
    tabIndex={0}
    role="region"
    aria-label={document.title}
    {...stylex.props(styles.document)}
  >
    <h1 {...stylex.props(styles.title)}>{document.title}</h1>
    <div {...stylex.props(styles.lastUpdated)}>
      Last Updated: {document.lastUpdatedLabel}
    </div>
    {document.blocks.map((block, index) => {
      if (block.kind === 'heading') {
        return (
          <h2 key={index} {...stylex.props(styles.heading)}>
            {block.text}
          </h2>
        );
      }

      if (block.kind === 'signatureField') {
        return (
          <div key={index} {...stylex.props(styles.signatureField)}>
            <div {...stylex.props(styles.signatureLabel)}>{block.label}</div>
            <div {...stylex.props(styles.signatureValue)}>{block.value}</div>
          </div>
        );
      }

      return (
        <p key={index} {...stylex.props(styles.paragraph)}>
          {block.text}
        </p>
      );
    })}
  </div>
);
