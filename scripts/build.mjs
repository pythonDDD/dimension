import { mkdir, cp, rm, writeFile } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const name of ['index.html','assets','data'])await cp(name,`dist/${name}`,{recursive:true});
await writeFile('dist/.nojekyll','');
console.log('Static site assembled in dist/; root index.html also works directly on GitHub Pages.');
