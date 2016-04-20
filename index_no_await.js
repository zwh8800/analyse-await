import fs from 'fs';
import path from 'path';

let counter = 0;
const extname = '.html';
function handleDir(dir) {
	fs.readdir(dir, function (err, files) {
		files.map((file) => {
			let fullFilename = path.join(dir, file);
			fs.stat(fullFilename, function (err, stats) {
				if (err) {
					console.error("error occurs when processing", file, err);
					return;
				}
				if (stats.isFile() && path.extname(file) == extname) {
					let thisCount = counter++;
					console.log('start processing', fullFilename, '[', thisCount, ']');

					fs.readFile(fullFilename, 'utf-8', function (err, fileString) {
						if (err) {
							console.error("error occurs when processing", file, err);
							return;
						}

						fileString = fileString.replace(/http:\/\//g, 'https://');

						fs.writeFile(fullFilename, fileString, function (err) {
							if (err) {
								console.error("error occurs when processing", file, err);
								return;
							}

							console.log('finish processing', fullFilename, '[', thisCount, ']');
						})
					})

				} else if (stats.isDirectory()) {
					handleDir(fullFilename);
				}
			})

		})
	});
}

function main() {
	handleDir('/Users/zzz/hzzz.lengzzz.com/');
}

main();
