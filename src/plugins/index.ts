import config from 'prismjs/components';
import getLoader from 'prismjs/dependencies';
import rawLoadLanguages from 'prismjs/components/index';
import Prism from 'prismjs';
import MarkdownIt from 'markdown-it';
import uglifycss from 'uglifycss';
import fs from 'fs';
import { path } from '@vuepress/utils';
import Token from 'markdown-it/lib/token';
import Normalizer from 'prismjs/plugins/normalize-whitespace/prism-normalize-whitespace';
import { lineNumbers, setWhiteSpaceStyle } from './utils/line-numbers';
import { optionsType } from '..';
import newCode from './style/new_code';
import oldCode from './style/old_code';
import { initPluginSwitch, sitePluginSwitch } from './utils/pluginSwitch';

rawLoadLanguages.silent = true;

let globalPluginsLoad = true;

const nodePlugins = {
  'inline-color': true,
  autolinker: true,
  'show-invisibles': true,
  previewers: true,
};

const prismjsPlugins = {
  treeview: true,
  'diff-highlight': true,
  'highlight-keywords': true,
};

const pluginMap: {
  [key: string]: boolean
} = {};

function isVPre(info: string): boolean | null {
  if (/:v-pre\b/.test(info)) {
    return true;
  }
  if (/:no-v-pre\b/.test(info)) {
    return false;
  }
  return null;
}

function mdPlugin(md: MarkdownIt, options: optionsType, pluginMap: {[key: string]: boolean}) {
  const normalize = new Normalizer({
    'remove-trailing': true,
    'remove-indent': true,
    'left-trim': true,
    'right-trim': true,
    ...options.NormalizeWhitespace,
  });
  md.renderer.rules.fence = (tokens: Array<Token>, idx: number, opts: MarkdownIt.Options) => {
    const preClassList: Array<string> = [];
    const codeClassList: Array<string> = [];
    const preStyleList: Array<string> = [];
    const codeStyleList: Array<string> = [];
    const preAttrList: Array<string> = [];
    let lines: [number, string] | null = null;
    const token = tokens[idx];
    if (token.tag !== 'code') {
      return token.content;
    }
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
    const lang = info.match(/^([a-zA-Z]+)/)?.[1] || 'text';
    sitePluginSwitch(info, preAttrList);
    let code = token.content;
    if (/:normalize-whitespace|nw\b/.test(info) && pluginMap['normalize-whitespace']) {
      code = normalize.normalize(code);
    }
    const html = opts.highlight?.(code, lang, '') || md.utils.escapeHtml(code);
    initPluginSwitch();
    const languageClass = `${md.options.langPrefix}${md.utils.escapeHtml(lang)}`;
    preClassList.push(languageClass);
    if (pluginMap['line-numbers']) {
      lines = lineNumbers(info, code, preStyleList, codeStyleList, options);
      if (lines) {
        preClassList.push('line-numbers');
        preStyleList.push(`counter-reset: linenumber ${lines[0] - 1};`);
      }
    } else {
      setWhiteSpaceStyle(info, codeStyleList);
    }
    if (pluginMap['match-braces']) {
      codeClassList.push('match-braces');
      if (!(/:brace-hover\b/.test(info))) {
        codeClassList.push('no-brace-hover');
      }
      if (!(/:brace-select\b/.test(info))) {
        codeClassList.push('no-brace-select');
      }
      if (!(/:no-rainbow-braces\b/.test(info))) {
        codeClassList.push('rainbow-braces');
      }
    }
    let codeStr = `<code class='${languageClass} ${codeClassList.join(' ')}' style='${codeStyleList.join('')}'>${html}${lines ? lines[1] : ''}</code>`;
    const useVPre = isVPre(info) ?? options.vPre;
    const maxHeightMatch = info.match(/max-height\[([\d,-]+)\]/);
    if (maxHeightMatch) {
      preStyleList.push(`max-height: ${maxHeightMatch[1]}px;`);
    }
    if (useVPre) {
      codeStr = `<code v-pre${codeStr.slice('<code'.length)}`;
    }
    const match = info.match(/{([\d,-]+)}/);
    return `<pre v-pre-load ${preAttrList.join(' ')} ${match ? `data-line=${match[1]}` : ''} lang=${lang} class='${preClassList.join(' ')}' style='${preStyleList.join('')}'>${codeStr}</pre>`;
  };
}

const getPath = (type: string) => (name: string) => `prismjs/${config[type].meta.path.replace(/\{id\}/g, name)}`;

const isPlugin = (dep: string) => config.plugins[dep] != null;

const getNoCSS = (type: string, name: string) => !!config[type][name].noCSS;

const getThemePath = (theme) => {
  if (theme.includes('/')) {
    const [themePackage, themeName] = theme.split('/');
    return `${themePackage}/themes/prism-${themeName}.css`;
  }
  if (theme === 'default') {
    theme = 'prism';
  } else {
    theme = `prism-${theme}`;
  }
  return getPath('themes')(theme);
};

const getPluginPath = getPath('plugins');

function loadPlugins(md: MarkdownIt, options: optionsType): undefined {
  if (!globalPluginsLoad) {
    return;
  }
  const plugins = options?.plugins;
  globalPluginsLoad = false;
  if (plugins) {
    for (let index = 0; index < plugins.length;) {
      const plugin = plugins[index];
      if (nodePlugins[plugin]) {
        import(path.resolve(__dirname, `./node/${plugin}`));
      }
      if (prismjsPlugins[plugin]) {
        import(`prismjs/plugins/${plugin}/prism-${plugin}`);
      }
      pluginMap[plugin] = true;
      index += 1;
    }
  }
  mdPlugin(md, options, pluginMap);
}

function loadLanguages(languages?: Array<string>) {
  const langsToLoad = languages?.filter((item) => !Prism.languages[item]);
  if (langsToLoad?.length) {
    rawLoadLanguages(langsToLoad);
  }
}

function getPluginCssList(plugins: Array<string>): Array<string> {
  const cssList = getLoader(config, [...plugins]).getIds().reduce((deps: Array<string>, dep: string) => {
    const temp = [];
    if (isPlugin(dep) && !getNoCSS('plugins', dep)) {
      temp.unshift(`${getPluginPath(dep)}.css` as never);
    }
    return [...deps, ...temp];
  }, ([]));
  return cssList;
}

function getFileString(file: string): string {
  const data = fs.readFileSync(`node_modules/${file}`);
  return uglifycss.processString(data.toString(), { maxLineLen: 500, expandVars: true });
}

function defaultCss(scssStr: string) {
  let codeScssPath = '../../../@vuepress/theme-default/lib/client/styles/code.scss';
  if (process.env.VUEPRESS_PLUGINS_PRISMJS_NEXT && process.env.VUEPRESS_PLUGINS_PRISMJS_NEXT.indexOf('true') !== -1) {
    codeScssPath = '../../example/node_modules/@vuepress/theme-default/lib/client/styles/code.scss';
  }
  fs.writeFileSync(path.resolve(__dirname, path.resolve(__dirname, codeScssPath)), scssStr);
}

function loadCss(options?: optionsType): string | undefined {
  let cssPathList: Array<string> = [];
  let themeCssPath: string | undefined;
  if (options && options.plugins) {
    cssPathList = getPluginCssList(options.plugins);
  }
  if (options && options.theme) {
    themeCssPath = getThemePath(options.theme);
  }
  const cssStrList: Array<string> = [];
  if (themeCssPath) {
    cssStrList.push(getFileString(themeCssPath));
    defaultCss(newCode);
  } else {
    defaultCss(oldCode);
  }
  cssPathList.forEach((file) => {
    cssStrList.push(getFileString(file));
  });
  if (cssStrList.length === 0) {
    return;
  }
  let cssStr = '';
  cssStrList.forEach((css) => {
    if (css) {
      cssStr += `${css}\n`;
    }
  });
  return cssStr;
}
export {
  loadPlugins,
  loadLanguages,
  loadCss,
};
