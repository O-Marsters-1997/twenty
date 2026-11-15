const babel = require('@babel/core');
const swcJest = require('@swc/jest');
const stylexBabelPlugin = require('@stylexjs/babel-plugin');

const STYLEX_IMPORT = '@stylexjs/stylex';

const createTransformer = (swcOptions) => {
  const swc = swcJest.createTransformer(swcOptions);

  return {
    canInstrument: swc.canInstrument,
    getCacheKey: (sourceText, sourcePath, options) =>
      swc.getCacheKey(sourceText, sourcePath, options) +
      require('@stylexjs/babel-plugin/package.json').version,
    process: (sourceText, sourcePath, options) => {
      if (!sourceText.includes(STYLEX_IMPORT)) {
        return swc.process(sourceText, sourcePath, options);
      }

      const { code } = babel.transformSync(sourceText, {
        filename: sourcePath,
        babelrc: false,
        configFile: false,
        plugins: [
          [require.resolve('@babel/plugin-syntax-typescript'), { isTSX: true }],
          [
            stylexBabelPlugin,
            { test: true, unstable_moduleResolution: { type: 'commonJS' } },
          ],
        ],
      });

      return swc.process(code, sourcePath, options);
    },
  };
};

module.exports = { createTransformer };
