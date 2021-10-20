import Prism from 'prismjs';
import 'prismjs/components/prism-css-extras';
import beforeTokenize from './utils/previewers';

Prism.hooks.add('before-tokenize', (env) => {
  if (env.previewers) {
    return;
  }
  env.previewers = true;
  beforeTokenize(env);
});
