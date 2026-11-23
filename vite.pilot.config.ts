import { mergeConfig } from 'vite';
import baseConfig from './vite.config';

export default mergeConfig(baseConfig, {
  build: {
    rolldownOptions: {
      input: 'pilot.html',
    },
  },
});
