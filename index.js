import path from 'path';
import { readDir, stat, readFile, writeFile } from './api_promise';

let counter = 0;
const extname = '.html';
async function handleDir(dir) {
    try {
        let files = await readDir(dir);
        files.map(async (file) => {
            let fullFilename = path.join(dir, file);
            try {
                let stats = await stat(fullFilename);
                if (stats.isFile() && path.extname(file) == extname) {
                    let thisCount = counter++;
                    console.log('start processing', fullFilename, '[', thisCount, ']');

                    let fileString = await readFile(fullFilename, 'utf-8');
                    fileString = fileString.replace(/http:\/\//g, 'https://');

                    await writeFile(fullFilename, fileString);

                    console.log('finish processing', fullFilename, '[', thisCount, ']');
                } else if (stats.isDirectory()) {
                    handleDir(fullFilename);
                }
            } catch (err) {
                console.error("error occurs when processing", file, err);
            }
        });

    } catch (err) {
        console.error("error occurs when readDir", dir, err);
    }
}

function main() {
    handleDir('/Users/zzz/hzzz.lengzzz.com/');
}

main();
