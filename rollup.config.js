
import typescript from 'rollup-plugin-typescript2';import resolve from 'rollup-plugin-node-resolve';
import pkg from './package.json';
export default {
  input: './src/autoLoadingScroll/index.tsx',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: pkg.unpkg,
      format: 'iife',
      sourcemap: true,
      name: 'AutoLoadingScroll',
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
  ],
  external: [...Object.keys(pkg.peerDependencies || {})],
  plugins: [resolve(), typescript({ useTsconfigDeclarationDir: true })],
};
