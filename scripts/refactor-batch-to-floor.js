const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dirsToScan = ['app', 'components', 'lib', 'server', 'hooks', 'context'];

const replacements = [
  { from: /batchNumber/g, to: 'floorNumber' },
  { from: /BatchNumber/g, to: 'FloorNumber' },
  { from: /batchId/g, to: 'floorId' },
  { from: /BatchId/g, to: 'FloorId' },
  { from: /batches/g, to: 'floors' },
  { from: /Batches/g, to: 'Floors' },
  { from: /batch/g, to: 'floor' },
  { from: /Batch/g, to: 'Floor' }
];

function walkSync(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!['node_modules', '.git', '.next'].includes(file)) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (['.ts', '.tsx', '.js', '.jsx', '.css'].includes(path.extname(dirFile))) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
}

// 1. Rename files and directories FIRST
const renames = [
  { from: path.join(rootDir, 'lib', 'models', 'batch.ts'), to: path.join(rootDir, 'lib', 'models', 'floor.ts') },
  { from: path.join(rootDir, 'app', 'api', 'admin', 'batches'), to: path.join(rootDir, 'app', 'api', 'admin', 'floors') },
  { from: path.join(rootDir, 'app', 'api', 'batches'), to: path.join(rootDir, 'app', 'api', 'floors') }
];

for (const { from, to } of renames) {
  if (fs.existsSync(from)) {
    console.log(`Renaming: ${from} -> ${to}`);
    fs.renameSync(from, to);
  } else {
    console.log(`Skipping rename (not found): ${from}`)
  }
}

let modifiedFiles = 0;
for (const dir of dirsToScan) {
  const fullDirPath = path.join(rootDir, dir);
  const files = walkSync(fullDirPath);
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;

    for (const { from, to } of replacements) {
       newContent = newContent.replace(from, to);
    }

    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated: ${path.relative(rootDir, file)}`);
      modifiedFiles++;
    }
  }
}

console.log(`✨ Codebase refactoring complete. Modified ${modifiedFiles} files.`);
