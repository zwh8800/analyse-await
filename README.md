# await & async 深度剖析 (配套代码)

标签（空格分隔）： blog es2015 stage3 javascript await

---

await 语法最早被引入到流行语言是 c# 5.0 ，微软在 c# 中引入了 `await & async` 关键字并且添加了一系列配套 API ，引起了开发者的一致好评。await 可以极大的简化异步编程，而广泛使用异步编程的就是 javascript 了。所以开发者们也迫不及待的向 javascript 中加入 await 关键字。目前此特性已经在 babel 中比较完美的实现了。而 await 特性也被加入了 `stage-3` （Candidate），不过貌似是赶不上今年的 ES2016 了，估计最晚会在 ES2017 中被正式加入 javascript 。那么本文就来深度剖析一下 `await & async` 的用法、好处以及实现方式。

[toc]

---

## 异步？同步？

异步编程模型对于 IO 密集型的任务具有得天独厚的优势。这里用一个例子来解释。

假如我们需要做一个爬虫，爬到的东西有两种，一种是索引页，一种是内容页。大概需要以下几步：

- 使用 http 请求一个索引页，从这个从索引中取出所有的 URL
- 分别请求所有的 URL
- 如果请求到的还是 **索引页** 那么递归这个操作（回到步骤 1 ）
- 如果是 **内容页** ，那么我们对内容页做一些处理
- 最后，把处理后的保存到数据库


那么，分别使用原生支持异步编程的 NodeJS 和原生不支持异步编程 golang 的语言实现这个爬虫。分别使用两种语言 **最常见** 的实现方式。

> <small>因为发 http 请求和保存数据库还需要一些额外代码，会干扰视线，所以例子代码是递归的读一个文件夹，并把所有 html 文件做一些修改，然后保存到源文件。但是原理上和爬虫是相通的。</small>

### golang 实现爬虫

```golang
package main

import (
  "io/ioutil"
  "log"
  "path"
  "path/filepath"
  "strings"
)

const extname = ".html"

var counter = 0

func handleDir(dir string) {
  // 读取文件夹列表
  files, err := ioutil.ReadDir(dir)
  if err != nil {
    log.Println("error occurs when readDir", dir, err)
    return
  }
  // iterate 文件列表
  for _, file := range files {
    fullFilename := path.Join(dir, file.Name())
    // 判断文件类型
    if !file.IsDir() && filepath.Ext(file.Name()) == extname {
      counter++
      thisCount := counter
      // 打开始 log
      log.Println("start processing", fullFilename,
        "[", thisCount, "]")

      // 读取文件
      fileData, err := ioutil.ReadFile(fullFilename)
      if err != nil {
        log.Println("error occurs when processing",
          fullFilename, err)
        continue
      }

      // 做一些处理
      fileString := string(fileData)
      fileString = strings.Replace(fileString,
        "http://", "https://", -1)

      // 保存文件
      if err := ioutil.WriteFile(fullFilename,
          []byte(fileString), 0644); err != nil {
        log.Println("error occurs when processing",
          fullFilename, err)
        continue
      }

      // 打结束 log
      log.Println("finish processing", fullFilename,
        "[", thisCount, "]")
    } else if file.IsDir() {
      // 文件夹的话递归
      handleDir(fullFilename)
    }
  }
}

func main() {
  handleDir("/Users/zzz/hzzz.lengzzz.com/")
}


```

### NodeJS 实现爬虫

```javascript
import fs from 'fs';
import path from 'path';

let counter = 0;
const extname = '.html';
function handleDir(dir) {
  // 读取文件夹列表
  fs.readdir(dir, function (err, files) {
    // iterate 文件列表
    files.map((file) => {
      let fullFilename = path.join(dir, file);
      fs.stat(fullFilename, function (err, stats) {
        if (err) {
          console.error("error occurs when processing", file, err);
          return;
        }
        // 判断文件类型
        if (stats.isFile() && path.extname(file) == extname) {
          let thisCount = counter++;

          // 打开始 log
          console.log('start processing', fullFilename,
            '[', thisCount, ']');

          // 读取文件
          fs.readFile(fullFilename, 'utf-8',
            function (err, fileString) {
            if (err) {
              console.error("error occurs when processing",
                file, err);
              return;
            }

            // 做一些处理
            fileString = fileString.replace(
              /http:\/\//g, 'https://');

            // 写入文件
            fs.writeFile(fullFilename, fileString, function (err) {
              if (err) {
                console.error("error occurs when processing",
                  file, err);
                return;
              }

              // 打结束 log
              console.log('finish processing', fullFilename,
                '[', thisCount, ']');
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

```

### 公平起见 使用 goroutine 实现

```golang
package main

import (
  "io/ioutil"
  "log"
  "path"
  "path/filepath"
  "strings"
)

const channelBuffer = 50
const workerCount = 30

type payload struct {
  thisCount    int
  fullFilename string
  fileString   string
}

var producerToRead chan *payload
var readToReplace chan *payload
var replaceToWrite chan *payload
var writeToComplete chan *payload

func init() {
  producerToRead = make(chan *payload, channelBuffer)
  readToReplace = make(chan *payload, channelBuffer)
  replaceToWrite = make(chan *payload, channelBuffer)
  writeToComplete = make(chan *payload, channelBuffer)
}

func reader() {
  for data := range producerToRead {
    fileData, err := ioutil.ReadFile(data.fullFilename)
    if err != nil {
      log.Println("error occurs when processing",
        data.fullFilename, err)
      continue
    }
    data.fileString = string(fileData)

    readToReplace <- data
  }
}

func replacer() {
  for data := range readToReplace {
    data.fileString = strings.Replace(data.fileString,
      "http://", "https://", -1)
    replaceToWrite <- data
  }
}

func writeer() {
  for data := range replaceToWrite {

    if err := ioutil.WriteFile(data.fullFilename,
      []byte(data.fileString), 0644); err != nil {
      log.Println("error occurs when processing",
        data.fullFilename, err)
      return
    }
    writeToComplete <- data
  }
}

func complete() {
  for data := range writeToComplete {
    log.Println("finish processing", data.fullFilename,
      "[", data.thisCount, "]")
  }
}

var counter = 0

func producer(dir string) {
  const extname = ".html"

  files, err := ioutil.ReadDir(dir)
  if err != nil {
    log.Println("error occurs when readDir", dir, err)
    return
  }

  for _, file := range files {
    fullFilename := path.Join(dir, file.Name())
    if !file.IsDir() && filepath.Ext(file.Name()) == extname {
      counter++
      thisCount := counter
      log.Println("start processing", fullFilename,
        "[", thisCount, "]")

      producerToRead <- &payload{
        thisCount,
        fullFilename,
        "",
      }

    } else if file.IsDir() {
      producer(fullFilename)
    }
  }
}

// 搞四个 worker
func startWorker() {
  for i := 0; i < workerCount; i++ {
    go reader()
    go replacer()
    go writeer()
    go complete()
  }
}

func main() {
  startWorker()
  producer("/Users/zzz/hzzz.lengzzz.com/")
}

```

```seq
Title: golang worker 实现

Note over producer: 生成文件名
producer->reader: channel
Note over reader: 读文件
reader->replacer: channel
Note over replacer: 修改文件
replacer->writer: channel
Note over writer: 写文件
writer->complete: channel
Note over complete: 打 log

Note over producer,complete: 并发

```


### 性能比较

分别看一下两个程序打出的 log ，来分析一下哪个程序会运行的更快。

#### golang 的 log

```
start processing /1001/index.html [ 1 ]
finish processing /1001/index.html [ 1 ]
start processing /1001/trackback/index.html [ 2 ]
finish processing /1001/trackback/index.html [ 2 ]
start processing /1006/index.html [ 3 ]
finish processing /1006/index.html [ 3 ]
start processing /1006/trackback/index.html [ 4 ]
finish processing /1006/trackback/index.html [ 4 ]
start processing /101/index.html [ 5 ]
finish processing /101/index.html [ 5 ]
start processing /101/trackback/index.html [ 6 ]
finish processing /101/trackback/index.html [ 6 ]
start processing /1010/index.html [ 7 ]
finish processing /1010/index.html [ 7 ]
start processing /1010/trackback/index.html [ 8 ]
finish processing /1010/trackback/index.html [ 8 ]
start processing /1027/index.html [ 9 ]
finish processing /1027/index.html [ 9 ]
start processing /1027/trackback/index.html [ 10 ]
finish processing /1027/trackback/index.html [ 10 ]
```

特点是挨个抓取，第一个没有抓完不开始抓第二个。

#### NodeJS 的 log

```
start processing /index.html [ 0 ]
start processing /blog/index.html [ 1 ]
start processing /blog/wp-login.html [ 2 ]
start processing /blog/1001/index.html [ 3 ]
start processing /blog/1006/index.html [ 4 ]
start processing /blog/101/index.html [ 5 ]

... 省略

start processing /blog/page/9/index.html [ 736 ]
finish processing /index.html [ 0 ]
start processing /blog/date/2013/08/index.html [ 737 ]

```

特点是同时抓取网页，谁先抓完先处理谁，谁先处理完谁就保存。不需要等待。

#### golang 第二版的 log

```
start processing /blog/1001/index.html [ 1 ]
start processing /blog/1001/trackback/index.html [ 2 ]
start processing /blog/1006/index.html [ 3 ]
start processing /blog/1006/trackback/index.html [ 4 ]
start processing /blog/101/index.html [ 5 ]
start processing /blog/101/trackback/index.html [ 6 ]
start processing /blog/1010/index.html [ 7 ]
start processing /blog/1010/trackback/index.html [ 8 ]
start processing /blog/1027/index.html [ 9 ]
start processing /blog/1027/trackback/index.html [ 10 ]
start processing /blog/1030/index.html [ 11 ]
start processing /blog/1030/trackback/index.html [ 12 ]
start processing /blog/1038/index.html [ 13 ]
start processing /blog/1038/trackback/index.html [ 14 ]
finish processing /blog/101/trackback/index.html [ 6 ]
start processing /blog/1040/index.html [ 15 ]
```

#### KFC 和 麻辣烫

可以对比一下 KFC 和 麻辣烫 店的点餐方式，和上面两个程序有异曲同工之妙。

- KFC：大家排队，前面的餐没全部做出来前不服务下一个客户
- 麻辣烫：大家分别点餐，然后拿个号码，叫号取餐

谁更快显而易见。在 KFC 里最怕前面点个全家桶，好不容易排到第一个了，结果还不如旁边队列里最后的取餐快。

所以可见，NodeJS 只需要使用一般的写法就能自动获得 **性能加成** 还是很有吸引力的。

### 可读性比较

golang 的代码是按照先后顺序很直观的顺下来的，可以看一下几个注释，都在同一个缩进级别。

而 NodeJS 使用了大量回调函数，本身串行的逻辑看起来却像是内嵌的感觉，从代码的缩进就能明显的看出来。大家亲切的成这种代码风格叫做 **冲击波**。

```
// 冲击波
{
  {
    {
      {
        {
          {
            {
              // ============ >
            }
          }
        }
      }
    }
  }
}
```

golang 使用 goroutine 重新实现之后性能得到了提升，但是可读性也是降低了一些。如果逻辑比较复杂则 channel 不很好设计。

除此之外 NodeJS 的写法还有几个坑：

- 对循环支持的不好，循环内部的回调函数访问同一个闭包变量（ES2015 的 `let` 可解决这个问题）
- 错误处理不友好，只能（ almostly ）直接跳出事务，没法爽快 try catch

---

## 同步的代码 异步的事情

那么有没有一种方法，能同时具备两种写法的优点呢？答案就是前端终极武器 `await & async` 。

首先来看一下 `await` 的使用方法，我给出一个同样功能（爬虫）的示例：

```javascript
import path from 'path';
import { readDir, stat, readFile, writeFile } from './api_promise';

let counter = 0;
const extname = '.html';
async function handleDir(dir) {
  try {
    // 读取文件夹列表
    let files = await readDir(dir);
    // iterate 列表
    files.map(async (file) => {
      let fullFilename = path.join(dir, file);
      try {
        // 检查文件类型
        let stats = await stat(fullFilename);
        if (stats.isFile() && path.extname(file) == extname) {
          let thisCount = counter++;
          // 打开始 log
          console.log('start processing', fullFilename,
            '[', thisCount, ']');

          // 读文件
          let fileString = await readFile(fullFilename, 'utf-8');

          // 改文件
          fileString = fileString.replace(/http:\/\//g, 'https://');

          // 写文件
          await writeFile(fullFilename, fileString);

          // 打结束 log
          console.log('finish processing', fullFilename,
            '[', thisCount, ']');
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

```

代码清晰了不少，但是性能还和之前一样，异步的读文件，异步的写文件。另外我还加入了 `try catch` ，来演示 await 对 try catch 的支持。

此外，还需要做的事情是对原生的 API 进行一下包装。使之返回一个 `Promiss` 以支持 await。

如下：

```javascript
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
```

这里只举例一个了，这个文件 wrap 了四个 NodeJS API ，都是使用相同的方式包装的。

---

## 实现篇

其实，await 只是一个语法糖。下面，分析一下这颗糖底层是怎么实现的。

### Iterator

要说 await 不得不先温习一些前置知识，比如 iterator 和协程。

在大部分语言中，要实现一个类型可以被 iterate （既让一个类型 iterable）一般需要实现一个叫 `Iterable` 的 interface。

```java
class List implements Iterable {
    public Iterator iterator() {
        // ...
    }
}
```

这个 Iterable 有方法能返回一个 `Iterator` 循环调用 Iterator 的方法 `next()` 可以得到下一个元素，调用 `hasNext()` 可以判断是否结束。

所以 Iterator 可以这样实现：

```java
class List implements Iterable {
    // nested class
    class ListIterator implements Iterator {
        int i = 0;
        int max = 10;
        public Object next() {
            return i++;
        }
        public boolean hasNext() {
            return i > max;
        }
    }
    public Iterator iterator() {
        return new ListIterator();
    }
}
```

这样，就可以 iterate 一个 List 了：

```java
List list = new List();
for (Object i : list) {
    // ...
}
```

在 javascript 中也不例外，这样实现一个 Iterable ：

```javascript
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

for (let item of iterable) {
    console.log(item);
}
```

### 协程

协程是一种抽象方式，可以让一个函数中途暂停返回一些东西，然后过一段时间后再继续执行。

```lua
function routine()
    local i = 0
    i = i + 1
    coroutine.yield(i)
    i = i + 1
    coroutine.yield(i)
    i = i + 1
    coroutine.yield(i)
end

```
调用三次 routine 后分别能得到 `1 2 3` 。原因是协程执行了一半被暂停后会保存下它自己的上下文，以便下次 resume后数据还在。

### Generator

Generator 相当于 javascript 中的协程，在一个 Generator 函数中使用 `yield` 关键字，可以暂停函数执行，返回一个结果。

```javascript
// 符号 * 代表 generator
function* routine() {
    let i = 0;
    yield i++;
    yield i++;
    yield i++;
}
```
这段代码和上面的 lua 代码等价。

使用 generator 函数可以方便的实现一个 iterator：

```javascript
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
```

和上面的 iterable 代码等价，但是可以使用 for 循环了，是不是简洁多了？

### await & async

可能大家已经想到了，async 函数很可能就是被翻译成了 generator 函数。

```javascript
async function getArticle () {
    var test = $('.test');
    var comments = await getComments();
    test.append('<p>' + JSON.stringify(comments) + '</p>');
    var posts = await getPosts();
    test.append('<p>' + JSON.stringify(posts) + '</p>');
}

// 翻译成=====>

function* getArticle () {
    var test = $('.test');
    var comments = yield getComments();
    test.append('<p>' + JSON.stringify(comments) + '</p>');
    var posts = yield getPosts();
    test.append('<p>' + JSON.stringify(posts) + '</p>');
}
```

当调用一个 async 函数时，实际上是这样做的：

```javacript
getArticle();

// 翻译成=====>

runner(getArticle);

function runner(getIterator) {
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
```

---

## 拓展篇

### 1. 在 NodeJS 中避免大规模计算

Javascript 只有一根线程，如果用 for 循环来计算 10000 个数字的和，整个 vm 都非卡死不行。

以前大家都用 `setTimeout / setInterval` 来把运算拆开来做：

```javascript
let output = $('.power');
function run2() {
	var i = 0, end = 10000;
	var cancel = setInterval(function () {
		let p = i * i;
		output.append(`<p>${p}</p>`);
		if (++i >= end) {
			clearInterval(cancel);
		}
	}, 0);
}

```
现在可以用 await 了

```javascript
function getPower(x) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve(x * x);
		}, 0);
	});
}
async function run() {
	let output = $('.power');
	for (let i = 0; i < 10000; i++) {
		let p = await getPower(i);
		output.append(`<p>${p}</p>`);
	}
}
```

这两种都不会卡 vm 但是第二种显然直观一些。

