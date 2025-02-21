import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: [
    './index.ts',
  ],
  declaration: 'node16',
  clean: true,
})
