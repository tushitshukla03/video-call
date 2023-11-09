package main

import (
	"log"
	"net/http"
	"video-call/server"


)

func main() {
	server.AllRooms.Init()
    go server.Broadcaster()

	http.HandleFunc("/create", server.CreateRoomRequestHandler)
	http.HandleFunc("/join", server.JoinRoomRequestHandler)
	http.HandleFunc("/get", server.GetAllUser)
	
	
	
	
	log.Println("Starting Server on Port 8000")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal(err)
	}
}
