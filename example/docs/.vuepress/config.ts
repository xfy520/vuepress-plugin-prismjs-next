import { defineUserConfig } from '@vuepress/cli';
import { resolve } from 'path';
import type { DefaultThemeOptions } from '@vuepress/theme-default';

const isProd = process.env.NODE_ENV === 'production';

export default defineUserConfig<DefaultThemeOptions>({
  base: '/',
  lang: 'zh-CN',
  title: 'vuepress-plugin-prismjs 例子',
  description: 'vuepress-plugin-prismjs 例子',
  head: [['style', { type: 'text/css' }, `
    .data-uri {
      background: red;
    }
    span[class*="token keyword keyword-"] {
      color: #f92672 !important;
    }
  `]],
  plugins: [[
    resolve(__dirname, '../../../lib'),
    {
      languages: ['less', 'css', 'javascript', 'sass', 'html', 'scss', 'stylus', 'yaml', 'java'],
      plugins: [
        'inline-color', 'autolinker', 'normalize-whitespace', 'show-invisibles', // node
       'diff-highlight', 'treeview', 'highlight-keywords', // prismjs
      'match-braces', 'line-numbers', 'line-highlight', 'toolbar', 'show-language', 'copy-to-clipboard', 'download-button', 'previewers',
      ],
      // theme: 'dark'
    }
  ]],
  themeConfig: {
    navbar: [{
      text: '1',
      link: '/1.md',
    }, {
      text: '2',
      children: [
        {
          text: '2-1',
          link: '/2/1.md'
        },
        {
          text: '2-2',
          link: '/2/2.md'
        }
      ]
    }],
    themePlugins: {
      prismjs: false,
    },
  },
  markdown: {
    code: false,
    customComponent: false,
  },
  bundler: process.env.DOCS_BUNDLER ?? (isProd ? '@vuepress/webpack' : '@vuepress/vite'),
  bundlerConfig: {

  },
  dest: `${__dirname}../../../.dist`,
  temp: `${__dirname}../../../.temp`,
  cache: `${__dirname}../../../.cache`,
  port: 8081,
  open: false
});
