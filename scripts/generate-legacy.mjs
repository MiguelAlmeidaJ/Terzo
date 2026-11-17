import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'apps', 'web', 'legacy-src', 'build.py');
const output = path.join(root, 'apps', 'web', 'public', 'legacy', 'index.html');
const commands = process.platform === 'win32'
  ? [['py', ['-3', source]], ['python', [source]], ['python3', [source]]]
  : [['python3', [source]], ['python', [source]]];

if (!existsSync(source)) throw new Error('Fontes da interface original não encontrados: ' + source);
let found = false;
for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (result.error?.code === 'ENOENT') continue;
  if (result.error) throw result.error;
  found = true;
  if (result.status !== 0) throw new Error('Geração da interface original falhou: ' + cmd);
  break;
}
if (!found) throw new Error('Python 3 é necessário para reconstruir a interface original. Instale Python 3.12+.');
if (!existsSync(output)) throw new Error('O gerador não produziu: ' + output);
console.log('Interface original gerada:', path.relative(root, output));
