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
			fileData, err := ioutil.ReadFile(fullFilename)
			if err != nil {
				log.Println("error occurs when processing", fullFilename, err)
				continue
			}
			fileString := string(fileData)
			fileString = strings.Replace(fileString, "http://", "https://", -1)

			if err := ioutil.WriteFile(fullFilename, []byte(fileString), 0644); err != nil {
				log.Println("error occurs when processing", fullFilename, err)
				continue
			}

			log.Println("finish processing", fullFilename, "[", thisCount, "]")
		} else if file.IsDir() {
			handleDir(fullFilename)
		}
	}
}

func main() {
	handleDir("/Users/zzz/hzzz.lengzzz.com/")

}
