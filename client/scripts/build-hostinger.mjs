import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const clientRoot = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, [fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url)), 'build'], {
  cwd: clientRoot,
  stdio: 'inherit',
  env: { ...process.env, VITE_API_BASE_URL: process.env.HOSTINGER_API_BASE_URL || 'https://smart-tracker-o1uh.onrender.com/api/v1' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
writeFileSync(new URL('../dist/.htaccess', import.meta.url), `Options -MultiViews
DirectoryIndex index.html
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]
</IfModule>
<IfModule mod_headers.c>
<Files "index.html">
Header set Cache-Control "no-cache, must-revalidate"
</Files>
</IfModule>
`);
console.log('Hostinger build ready in client/dist, including .htaccess. Upload its contents to your domain document root.');
