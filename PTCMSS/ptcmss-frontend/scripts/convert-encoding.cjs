const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const files = [
  'src/AppLayout.jsx',
  'src/components/module 1/SystemSettingsPage.jsx',
  'src/components/module 1/AdminBranchesPage.jsx',
  'src/components/module 1/AdminCreateUserPage.jsx',
  'src/components/module 1/LoginPage.jsx',
  'src/components/module 1/UserDetailPage.jsx',
  'src/components/module 1/AdminManagersPage.jsx',
];

function convertIfNeeded(file) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return console.log('[skip] not found:', file);
  const buf = fs.readFileSync(p);
  const utf8Text = buf.toString('utf8');
  const hasMojibake = /�|A�|��|\uFFFD/.test(utf8Text);
  if (!hasMojibake) {
    console.log('[ok] utf8:', file);
    return;
  }
  let decoded = iconv.decode(buf, 'cp1258');
  if (/�/.test(decoded)) {
    decoded = iconv.decode(buf, 'windows-1252');
  }
  fs.writeFileSync(p, decoded, { encoding: 'utf8' });
  console.log('[fix] converted:', file);
}

for (const f of files) convertIfNeeded(f);
