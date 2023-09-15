import React, { useEffect, useRef ,useState} from "react";
import { useRouter } from 'next/router'; 

const Room = () => {
    const userVideo = useRef();
    const userStream = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const webSocketRef = useRef();
    const router = useRouter(); 
    const [identified, setIdentified] = useState(false);



    

    const openCamera = async () => {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const cameras = allDevices.filter(
            (device) => device.kind == "videoinput"
        );
        console.log(cameras);

        const constraints = {
            audio: true,
            video: {
                deviceId: cameras[0].deviceId,
            },
        };

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.log(err);
        }
    };
    const send = (message, callback) => {
        waitForConnection(() => {
          webSocketRef.current.send(message);
          if (typeof callback !== "undefined") {
            callback();
          }
        }, 1000);
      };
    
      const waitForConnection = (callback, interval) => {
        if (webSocketRef.current.readyState === 1) {
          callback();
        } else {
          setTimeout(() => {
            waitForConnection(callback, interval);
          }, interval);
        }
      };
    
      useEffect(() => {
        openCamera().then((stream) => {
          userVideo.current.srcObject = stream;
          userStream.current = stream;
          if(router.isReady){
            const {roomID,host} = router.query;
            console.log(roomID,host);
          webSocketRef.current = new WebSocket(
            `ws://localhost:8000/join?roomID=${roomID}&host=${host}`
          );

          webSocketRef.current.addEventListener("open", () => {
            // Use the send function to send data and provide a callback
            send(JSON.stringify({ join: true }))})
    
          webSocketRef.current.addEventListener("message", async (e) => {
            const message = JSON.parse(e.data);
    
            if (message.join) {
              callUser();
            }
    
            if (message.offer) {
              handleOffer(message.offer);
            }
    
            if (message.answer) {
              console.log("Receiving Answer");
              peerRef.current.setRemoteDescription(
                new RTCSessionDescription(message.answer)
              );
            }
    
            if (message.iceCandidate) {
              console.log("Receiving and Adding ICE Candidate");
              try {
                await peerRef.current.addIceCandidate(message.iceCandidate);
              } catch (err) {
                console.log("Error Receiving ICE Candidate", err);
              }
            }
          });
          }
          
    
          
        });
      }, [router.isReady]);
    
      const handleOffer = async (offer) => {
        console.log("Received Offer, Creating Answer");
        peerRef.current = createPeer();
    
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
    
        userStream.current.getTracks().forEach((track) => {
          peerRef.current.addTrack(track, userStream.current);
        });
    
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
    
        // Use the send function to send the answer
        send(JSON.stringify({ answer: peerRef.current.localDescription }));
      };
    
      const callUser = () => {
        console.log("Calling Other User");
        peerRef.current = createPeer();
    
        userStream.current.getTracks().forEach((track) => {
          peerRef.current.addTrack(track, userStream.current);
        });
      };
    
      const createPeer = () => {
        console.log("Creating Peer Connection");
        const peer = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
    
        peer.onnegotiationneeded = handleNegotiationNeeded;
        peer.onicecandidate = handleIceCandidateEvent;
        peer.ontrack = handleTrackEvent;
    
        return peer;
      };
    
      const handleNegotiationNeeded = async () => {
        console.log("Creating Offer");
    
        try {
          const myOffer = await peerRef.current.createOffer();
          await peerRef.current.setLocalDescription(myOffer);
    
          // Use the send function to send the offer
          send(JSON.stringify({ offer: peerRef.current.localDescription }));
        } catch (err) {
          console.error("Error creating offer:", err);
        }
      };
    
      const handleIceCandidateEvent = (e) => {
        console.log("Found Ice Candidate");
        if (e.candidate) {
          console.log(e.candidate);
          // Use the send function to send the ICE candidate
          send(JSON.stringify({ iceCandidate: e.candidate }));
        }
      };
    
      const handleTrackEvent = (e) => {
        console.log("Received Tracks");
        partnerVideo.current.srcObject = e.streams[0];
      };
    
      return (
        <div>
          <video autoPlay controls={true} ref={userVideo}></video>
          <video autoPlay controls={true} ref={partnerVideo}></video>
        </div>
      );

      };
    
    
    export default Room;
