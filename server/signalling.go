package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"


	"github.com/gorilla/websocket"
)

// AllRooms is the global hashmap for the server
var AllRooms RoomMap

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type broadcastMsg struct {
	Message map[string]interface{}
	RoomID  string
	Client  *websocket.Conn
}

var broadcast = make(chan broadcastMsg)

func Broadcaster() {
	for {
		msg := <-broadcast

		for _, client := range AllRooms.Map[msg.RoomID] {
			if client.Conn != msg.Client {
				err := client.Conn.WriteJSON(msg.Message)

				if err != nil {
					log.Println("Error sending message to client:", err)
					client.Conn.Close()
				}
			}
		}
	}
}

// CreateRoomRequestHandler creates a Room and returns the roomID
func CreateRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	roomID := AllRooms.CreateRoom()

	type resp struct {
		RoomID string `json:"room_id"`
	}



	json.NewEncoder(w).Encode(resp{RoomID: roomID})
}

// JoinRoomRequestHandler joins a client to a particular room
func JoinRoomRequestHandler(w http.ResponseWriter, r *http.Request) {
	roomID, ok := r.URL.Query()["roomID"]
	host, ok := r.URL.Query()["host"]
	
	x, _ := strconv.ParseBool(host[0])

	

	if !ok {
		log.Println("roomID missing in URL Parameters")
		http.Error(w, "roomID missing in URL Parameters", http.StatusBadRequest)
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		http.Error(w, "WebSocket Upgrade Error", http.StatusInternalServerError)
		return
	}

	AllRooms.InsertIntoRoom(roomID[0], x, ws)

	for {
		var msg broadcastMsg

		err := ws.ReadJSON(&msg.Message)
		if err != nil {
			log.Println("Read Error:", err)
			break
		}

		msg.Client = ws
		msg.RoomID = roomID[0]

		

		broadcast <- msg
	}

	// When the client disconnects, remove them from the room

	ws.Close()
}


func GetAllUser(w http.ResponseWriter, r *http.Request) {
	roomID, ok := r.URL.Query()["roomID"]
	w.Header().Set("Access-Control-Allow-Origin", "*")

	

	

	if !ok {
		log.Println("roomID missing in URL Parameters")
		http.Error(w, "roomID missing in URL Parameters", http.StatusBadRequest)
		return
	}

	k  := AllRooms.Get(roomID[0])

	type resp struct {
		Participants []Participant
	}
	


	json.NewEncoder(w).Encode(resp{k})

	

}