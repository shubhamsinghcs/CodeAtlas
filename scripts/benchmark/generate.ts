import * as fs from 'fs';
import * as path from 'path';

export interface FixtureOptions {
  size: 'small' | 'medium' | 'large';
  language: 'typescript' | 'javascript' | 'python';
  isMonorepo: boolean;
  baseDir: string;
}

const SIZE_MAP = {
  small: { files: 100, dirs: 10 },
  medium: { files: 1000, dirs: 50 },
  large: { files: 5000, dirs: 200 },
};

export function generateSyntheticFixture(options: FixtureOptions): string {
  const { size, language, isMonorepo, baseDir } = options;
  const config = SIZE_MAP[size];

  const repoName = `synth-${size}-${language}${isMonorepo ? '-monorepo' : ''}`;
  const repoPath = path.join(baseDir, repoName);

  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
  }
  fs.mkdirSync(repoPath, { recursive: true });

  const ext = language === 'python' ? '.py' : language === 'typescript' ? '.ts' : '.js';
  const importSyntax = language === 'python' ? 'import' : 'import * as';

  const packages = isMonorepo ? ['packages/pkg-a', 'packages/pkg-b', 'apps/web'] : ['.'];
  
  const filesCreated: string[] = [];

  packages.forEach((pkg) => {
    const pkgPath = path.join(repoPath, pkg);
    fs.mkdirSync(pkgPath, { recursive: true });
    
    const numFiles = Math.floor(config.files / packages.length);
    const numDirs = Math.floor(config.dirs / packages.length);

    for (let i = 0; i < numDirs; i++) {
      fs.mkdirSync(path.join(pkgPath, `dir_${i}`), { recursive: true });
    }

    for (let i = 0; i < numFiles; i++) {
      const dirIndex = i % numDirs;
      const fileName = `file_${i}${ext}`;
      const filePath = path.join(pkgPath, `dir_${dirIndex}`, fileName);
      
      let content = '';
      
      // Add random imports to previous files
      const numImports = Math.min(5, i);
      for (let j = 1; j <= numImports; j++) {
        const prevIndex = i - j;
        const prevDirIndex = prevIndex % numDirs;
        
        let relativePath = path.posix.relative(`dir_${dirIndex}`, `dir_${prevDirIndex}/file_${prevIndex}`);
        if (!relativePath.startsWith('.')) relativePath = `./${relativePath}`;
        
        if (language === 'python') {
          // crude python import
          const modName = `dir_${prevDirIndex}.file_${prevIndex}`;
          content += `import ${modName}\n`;
        } else {
          content += `import * as mod${j} from '${relativePath}';\n`;
        }
      }

      // Add exports
      if (language === 'python') {
        content += `\ndef func_${i}():\n    pass\n`;
      } else {
        content += `\nexport function func_${i}() { return true; }\n`;
        content += `export class Class${i} {}\n`;
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      filesCreated.push(filePath);
    }
  });

  return repoPath;
}
