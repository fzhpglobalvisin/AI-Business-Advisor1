const fs = require('fs');
const path = require('path');

try {
  const dtsPath = path.join(__dirname, 'node_modules', '@google', 'genai', 'dist', 'genai.d.ts');
  const dts = fs.readFileSync(dtsPath, 'utf8');
  
  const lines = dts.split('\n');
  let output = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export declare interface Transcription')) {
      output.push('--- Match found at line ' + i + ' ---');
      for (let j = i; j < Math.min(lines.length, i + 30); j++) {
        output.push(lines[j]);
      }
      break;
    }
  }
  
  fs.writeFileSync('types_output.txt', output.join('\n'));
} catch (e) {
  fs.writeFileSync('types_output.txt', e.toString());
}
