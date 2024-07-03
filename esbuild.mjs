import * as esbuild from 'esbuild';
import * as fs from "fs";

const svgPlugin = {
  name: 'svg',
  setup(build) {
    build.onLoad({ filter: /\.svg$/ }, async (args) => {
      const contents = await fs.promises.readFile(args.path, 'utf8');
      return {
        contents: `export default ${JSON.stringify(contents)}`,
        loader: 'js',
      };
    });
  }
};

const getArgs = () =>
  process.argv.reduce((args, arg) => {
    // long arg
    if (arg.slice(0, 2) === "--") {
      const longArg = arg.split("=");
      const longArgFlag = longArg[0].slice(2);
      const longArgValue = longArg.length > 1 ? longArg[1] : true;
      args[longArgFlag] = longArgValue;
    }
    // flags
    else if (arg[0] === "-") {
      const flags = arg.slice(1).split("");
      flags.forEach((flag) => {
        args[flag] = true;
      });
    }
    return args;
  }, {});

const args = getArgs();

const esmSettings = {
  entryPoints: ['src/index.ts'],
  outdir: 'dist/esm',
  bundle: true,
  minify: true,
  sourcemap: true,
  treeShaking: true,
  format: 'esm',
  plugins: [svgPlugin]
};

const umdSetting = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/umd/index.js',
  bundle: true,
  minify: true,
  sourcemap: true,
  treeShaking: true,
  format: 'iife',
  globalName: "Chat",
  plugins: [svgPlugin]
};

if (args.watch) {
  let esmCtx = await esbuild.context(esmSettings);
  let umdCtx = await esbuild.context(umdSetting);

  await esmCtx.watch();
  await umdCtx.watch();

  console.log('watching...');
} else {
  await esbuild.build(esmSettings);
  await esbuild.build(umdSetting);
}