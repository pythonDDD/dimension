import { mkdir, cp, rm, writeFile, readdir } from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const item of await readdir('dist'))await rm(`dist/${item}`,{recursive:true,force:true});
for(const name of ['index.html','assets'])await cp(name,`dist/${name}`,{recursive:true});
await writeFile('dist/.nojekyll','');
console.log('Static site assembled in dist/; root index.html also works directly on GitHub Pages.');
