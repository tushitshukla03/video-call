import Head from 'next/head'
import React,{useState} from 'react'
import { useRouter } from 'next/router';
import { format } from 'date-fns';

export default function Home(props) {
  const router = useRouter();
  const handleJoinMeeting = () => {
    if (meetingLink) {
      window.location.href = meetingLink; // Redirect to the entered link
    } else {
      // Handle the case where no link is entered (e.g., display an error message)
    }
  };
  const [meetingLink, setMeetingLink] = useState('');
  const currentDate = new Date();
  const dateString = format(currentDate, 'PP'); // Get formatted date
  const timeString = format(currentDate, 'HH:mm');
  const create = async (e) =>{
    e.preventDefault();
    

    const response = await fetch('http://localhost:8000/create');
    const {room_id} = await response.json();
    router.push(`/room/${room_id}/${true}`);


  }
 
  return (
    <>
    <div className="flex min-h-screen bg-gray-100">
    <div className="container mx-auto px-4 py-8">
      <nav className="flex  items-center justify-between">
      <div className='flex'><img src="video-call.png" alt="Google" className="w-10 h-9 mr-4" /><a href="#" className="text-gray-700 text-2xl">
          Meet
        </a></div>
        <p className="text-gray-600 ">{timeString}•{dateString}</p>

      </nav>

      <section className="hero flex flex-col items-start mt-56 h-full ">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Start a secure video meeting
        </h1>
        <p className="text-base text-gray-600 ">
          Easy to join and available on all your devices
        </p>
        <div className='flex '><button className="mt-8 inline-flex items-center px-4 py-2 w-56
         bg-blue-500 text-white font-bold rounded-md hover:bg-blue-600" onClick={create}>
          New meeting
        </button>
        <div className='flex'>
        <input
            type="text"
            className="w-full px-4 py-2 mx-5 mt-8 border h-12 border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter meeting link"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          /><button
          className="inline-flex items-center px-4 py-2 h-12  mt-8 bg-blue-500 text-white font-bold rounded-md hover:bg-blue-600 ml-4"
          onClick={handleJoinMeeting}
        >
          Join
        </button></div>
        </div>
      </section>

      {/* Additional sections (e.g., FAQ, learn more) */}
    </div>
  </div></>
  )}