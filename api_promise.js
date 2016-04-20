import fs from "fs";

export function readDir(path) {
    return new Promise(function (resolve, reject) {
        fs.readdir(path, function (err, files) {
            if (err) {
                reject(err);
                return;
            }
            resolve(files);
        })
    })
}

export function stat(path) {
    return new Promise(function (resolve, reject) {
        fs.stat(path, function (err, stats) {
            if (err) {
                reject(err);
                return;
            }
            resolve(stats);
        })
    })
}

export function readFile(file, options) {
    return new Promise(function (resolve, reject) {
        fs.readFile(file, options, function (err, data) {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        })
    })
}

export function writeFile(file, data, options) {
    return new Promise(function (resolve, reject) {
        fs.writeFile(file, data, options, function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        })
    })
}
