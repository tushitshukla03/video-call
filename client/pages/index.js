import Head from 'next/head'
import React,{useState} from 'react'
import { useRouter } from 'next/router';

export default function Home(props) {
  const router = useRouter();
  const create = async (e) =>{
    e.preventDefault();
    

    const response = await fetch('http://localhost:8000/create');
    const {room_id} = await response.json();
    router.push(`/room/${room_id}/${true}`);


  }
 
  return (
    <>
      <Head>
        <title>Call-Me</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
    <button onClick={create}>Create Room</button></>
  )}