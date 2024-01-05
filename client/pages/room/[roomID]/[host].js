import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styled from "styled-components";

const VideoCallContainer = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 20px;
`;

const VideoContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const Video = styled.video`
    width: 100%;
    max-width: 400px;
    border: 1px solid #ccc;
`;

const ControlButton = styled.button`
    background-color: #007bff;
    color: #fff;
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    margin-top: 10px;
`;

const Room = (props) => {
    const userVideo = useRef();
    const userStream = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const webSocketRef = useRef();
    const router = useRouter();
    const [isVideoMuted, setIsVideoMuted] = useState(true);
    const [isAudioMuted, setIsAudioMuted] = useState(true);

    const openCamera = async () => {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const cameras = allDevices.filter(
            (device) => device.kind == "videoinput"
        );


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

    useEffect(() => {
        openCamera().then((stream) => {
            userVideo.current.srcObject = stream;
            userVideo.current.muted = true;
            userStream.current = stream;
          
            if(router.isReady){
              const {roomID,host} = router.query;
            // console.log(roomID,host);
          webSocketRef.current = new WebSocket(
            `ws://localhost:8000/join?roomID=${roomID}&host=${host}`
          );
           

            webSocketRef.current.addEventListener("open", () => {
            //   console.log(webSocketRef.current)
                const cur = webSocketRef.current.send(JSON.stringify({ join: true }));
                console.log("fsadcwfqf",cur)
            });
            webSocketRef.current.addEventListener("close", () => {
              console.log("WebSocket Closed");
            });

            webSocketRef.current.addEventListener("message", async (e) => {
                const message = JSON.parse(e.data);
                console.log("message is send",message)
                const response = await fetch(`http://localhost:8000/get?roomID=${roomID}`)
                const resp = await response.json()
                console.log(resp)
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
                        await peerRef.current.addIceCandidate(
                            message.iceCandidate
                        );
                    } catch (err) {
                        console.log("Error Receiving ICE Candidate", err);
                    }
                }
            });
            }

            
        });
    },[router.isReady]);

    const handleOffer = async (offer) => {
      try {
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
    
        webSocketRef.current.send(
          JSON.stringify({ answer: peerRef.current.localDescription })
        );
      } catch (err) {
        console.log("Error Creating Offer", err);
      }
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

            webSocketRef.current.send(
                JSON.stringify({ offer: peerRef.current.localDescription })
            );
        } catch (err) {}
    };

    const handleIceCandidateEvent = (e) => {
        console.log("Found Ice Candidate");
        if (e.candidate) {
            // console.log(e.candidate);
            webSocketRef.current.send(
                JSON.stringify({ iceCandidate: e.candidate })
            );
        }
    };

    const handleTrackEvent = (e) => {
        console.log("Received Tracks");
        // console.log(e,e.streams,"cscscscd")
        partnerVideo.current.srcObject = e.streams[0];
        
    };
    
      // Toggle video stream
    const toggleVideo = () => {
      
        userStream.current.getVideoTracks().forEach((track) => {
            track.enabled = !isVideoMuted;
        });
        setIsVideoMuted(!isVideoMuted);
    };
      // Toggle audio stream
    const toggleAudio = () => {
  
        userStream.current.getAudioTracks().forEach((track) => {
            track.enabled = !isAudioMuted;
        });
        setIsAudioMuted(!isAudioMuted);
    };

    return (
        <VideoCallContainer>
        <VideoContainer>
            <Video autoPlay  ref={userVideo}></Video>
            <ControlButton onClick={toggleVideo}>
                {isVideoMuted ? "Unmute Video" : "Mute Video"}
            </ControlButton>
            <ControlButton onClick={toggleAudio}>
                {isAudioMuted ? "Unmute Audio" : "Mute Audio"}
            </ControlButton>
        </VideoContainer>
        <VideoContainer>
            <Video autoPlay controls ref={partnerVideo}></Video>
        </VideoContainer>
    </VideoCallContainer>
    );
};

export default Room;