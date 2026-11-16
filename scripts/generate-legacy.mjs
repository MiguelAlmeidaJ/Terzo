import { spawnSync } from 'node:child_process';
import process from 'node:process';

const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];

for (const command of candidates) {
  const args = command === 'py' ? ['-3', 'src/build.py'] : ['src/build.py'];
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (!result.error) process.exit(result.status ?? 1);
  if (result.error.code !== 'ENOENT') throw result.error;
}

throw new Error('Python 3 não foi encontrado. Instale-o para gerar a interface legada.');
