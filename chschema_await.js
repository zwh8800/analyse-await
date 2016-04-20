import fs from "fs";

async function test() {
    let files = await readDir(dir);
}


console.log('start');

////////////////// 手动for ... of iterator & 手动iterator //////////////////
var iterable = {
    [Symbol.iterator]: function() {
        var i = 0;
        var iterator = {
            next: function () {
                var iteratorResult = {
                    done: i > 10,
                    value: i++
                };
                return iteratorResult;
            }
        };
        return iterator;
    }
};

var iterator = iterable[Symbol.iterator]();
while (true) {
    var result = iterator.next();
    if (result.done) {
        break;
    } else {
        console.log(result.value);
    }
}

////////////////// generator & iterator //////////////////
iterable = {
    [Symbol.iterator]: function* () {
        for (let i = 0; i < 10; ++i) {
            yield i;
        }
    }
};

for (let item of iterable) {
    console.log(item);
}



////////////////// await & async -> generator //////////////////

import $ from 'jquery';
import Api from './Api';
import MockServer from './mock';
MockServer();
function getComments() {
    return new Promise(function (resolve, reject) {
        Api.getComments()
            .done((response) => {
                resolve(response)
            })
            .fail((xhr, status, err) => {
                reject(err);
            });
    });
}
function getPosts() {
    return new Promise(function (resolve, reject) {
        Api.getPost()
            .done((response) => {
                resolve(response)
            })
            .fail((xhr, status, err) => {
                reject(err);
            });
    });
}

var runner = function (getIterator) {
    var iterator = getIterator();
    function next(data) {
        var result = iterator.next(data);
        if (result.done){
            return;
        }
        var promise = result.value;
        promise.then(function (data) {
            next(data);
        });
    }
    next();
};

function* ajax() {
    var test = $('.test');
    var comments = yield getComments();
    test.append('<p>' + JSON.stringify(comments) + '</p>');
    var posts = yield getPosts();
    test.append('<p>' + JSON.stringify(posts) + '</p>');
}

runner(ajax);


////////////////// await & async //////////////////
async function getArticle () {
    try {
        var test = $('.test');
        var comments = await getComments();
        test.append('<p>' + JSON.stringify(comments) + '</p>');
        var posts = await getPosts();
        test.append('<p>' + JSON.stringify(posts) + '</p>');
    } catch (e) {
        console.log('catch: ', e);
    }
}

getArticle();

