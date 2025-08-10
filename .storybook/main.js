

import path from 'path';

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest"
  ],
  "framework": {
    "name": "@storybook/react-vite",
    "options": {}
  },
  async viteFinal(config) {
    // 添加路径别名支持
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
      '@/components': path.resolve(__dirname, '../src/components'),
      '@/common': path.resolve(__dirname, '../src/common'),
      '@/utils': path.resolve(__dirname, '../src/utils'),
      '@/main': path.resolve(__dirname, '../src/main'),
    };

    // 确保 CSS 正确处理 - Tailwind CSS v4
    config.css = {
      ...config.css,
      postcss: './postcss.config.js',
    };

    return config;
  },
};
export default config;