import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const Room = (props) => {
  const userVideo = useRef();
  const userStream = useRef();
  const partnerVideo = useRef();
  const [partnerVideoConnected, setPartnerVideoConnected] = useState(false);
  const peerRef = useRef();
  const webSocketRef = useRef();
  const router = useRouter();
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [currentURL, setCurrentURL] = useState("");

  useEffect(() => {
    setCurrentURL(window.location.href);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(currentURL)
      .then(() => {
        console.log("URL copied to clipboard:", currentURL);
        alert("URL copied to clipboard", currentURL);
      })
      .catch((error) => {
        console.error("Failed to copy URL to clipboard:", error);
      });
  };

  const openCamera = async () => {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const cameras = allDevices.filter((device) => device.kind === "videoinput");

    const constraints = {
      audio: true,
      video: {
        deviceId: cameras.length > 0 ? cameras[0].deviceId : undefined,
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

      if (router.isReady) {
        const { roomID, host } = router.query;
        webSocketRef.current = new WebSocket(
          `${process.env.NEXT_PUBLIC_REACT_APP_WS_URL}/join?roomID=${roomID}&host=${host}`
        );

        webSocketRef.current.addEventListener("open", () => {
          const cur = webSocketRef.current.send(JSON.stringify({ join: true }));
          console.log("WebSocket opened:", cur);
        });

        webSocketRef.current.addEventListener("close", () => {
          console.log("WebSocket Closed");
        });

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
      iceServers: [{ urls: "stun:stun1.l.google.com:19302" },{ urls: "stun:stun2.l.google.com:19302" },{ urls: "stun:numb.viagenie.ca" },{ urls: "stun:stun.services.mozilla.com" },{ urls: "stun:stun.resiprocate.org" }],
    });

    peer.onnegotiationneeded = handleNegotiationNeeded;
    peer.onicecandidate = handleIceCandidateEvent;
    peer.ontrack = handleTrackEvent;
    setPartnerVideoConnected(true);

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
      webSocketRef.current.send(JSON.stringify({ iceCandidate: e.candidate }));
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
    <div className="flex h-screen  bg-gray-900">
      <div className="flex flex-col items-center justify-center py-13">
        {!partnerVideoConnected ? (
          <div className="w-[100vw] flex justify-center text-white">Connecting partner...</div>
        ) : (
          <video
            className="w-[100vw]  h-full pb-16 rounded-lg"
            autoPlay
            ref={partnerVideo}
          />
        )}
        <div className="absolute bottom-0  flex bg-white">
          <p>Share link: {currentURL}</p>
          <img src="/copy.png" alt="Google" className="h-6" onClick={copyToClipboard}/>
        </div>
      </div>
      <div className="absolute bottom-0 text-#040720 right-0 m-4">
        <video className="w-64 h-64 " autoPlay ref={userVideo} />
        <div className="flex flex-col mt-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
            onClick={toggleVideo}
          >
            {isVideoMuted ? "Mute Video" : "Unmute Video"}
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md mt-3"
            onClick={toggleAudio}
          >
            {isAudioMuted ? "Mute Audio" : "Unmute Audio"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Room;
