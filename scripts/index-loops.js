const fs = require('fs');
const path = require('path');

const loopsDir = path.join(process.cwd(), 'public', 'loops');
const outputFilePath = path.join(loopsDir, 'library.json');

function scanDirectory(dir) {
    const results = [];
    const list = fs.readdirSync(dir);

    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results.push(...scanDirectory(fullPath));
        } else if (file.endsWith('.wav')) {
            // Parse filename like: "SL - Synth Loop 1 - G- 126 BPM.wav"
            const category = path.basename(dir);
            const name = file.replace('.wav', '');

            // Try to extract key and BPM
            let key = 'N/A';
            let bpm = 126;

            const parts = name.split(' - ');
            if (parts.length >= 4) {
                key = parts[parts.length - 2].trim();
                const bpmPart = parts[parts.length - 1].replace(' BPM', '').trim();
                bpm = parseInt(bpmPart) || 126;
            }

            results.push({
                id: name.toLowerCase().replace(/ /g, '_'),
                name: name,
                category: category.replace(' Loops', '').toLowerCase(),
                path: path.relative(path.join(process.cwd(), 'public'), fullPath).replace(/\\/g, '/'),
                key: key,
                bpm: bpm
            });
        }
    }
    return results;
}

try {
    const library = scanDirectory(loopsDir);
    fs.writeFileSync(outputFilePath, JSON.stringify(library, null, 2));
    console.log(`Successfully indexed ${library.length} loop files to ${outputFilePath}`);
} catch (error) {
    console.error('Error indexing loops:', error);
}
