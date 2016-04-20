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
			log.Println("error occurs when processing", data.fullFilename, err)
			continue
		}
		data.fileString = string(fileData)

		readToReplace <- data
	}
}

func replacer() {
	for data := range readToReplace {
		data.fileString = strings.Replace(data.fileString, "http://", "https://", -1)
		replaceToWrite <- data
	}
}

func writeer() {
	for data := range replaceToWrite {

		if err := ioutil.WriteFile(data.fullFilename, []byte(data.fileString), 0644); err != nil {
			log.Println("error occurs when processing", data.fullFilename, err)
			return
		}
		writeToComplete <- data
	}
}

func complete() {
	for data := range writeToComplete {
		log.Println("finish processing", data.fullFilename, "[", data.thisCount, "]")
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
			log.Println("start processing", fullFilename, "[", thisCount, "]")

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
