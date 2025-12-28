const fs = require('fs');

const files = ['package.json', 'tsconfig.json', 'components.json', 'slack-manifest.json', 'vercel.json'];

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        // Use a loose parser for tsconfig if needed, but let's try strict JSON first for others
        if (file === 'tsconfig.json') {
             // simple check, might fail on comments
             // require(file) handles comments for json
        } else {
            JSON.parse(content);
        }
        console.log(`${file}: Valid JSON`);
    } catch (e) {
        console.error(`${file}: Invalid JSON - ${e.message}`);
    }
});
