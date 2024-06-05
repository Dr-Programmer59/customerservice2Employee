'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import socket from '@/components/socket';
import MessageBox from '@/components/MessageBox';
import axios from 'axios';
import { storage } from '@/components/firebase';

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { createConversation, getAdminConversation, getConversation, getEmployeeConversation, getMessages, newMessages } from '@/components/service/api';



function page() {
  const { isAuth, user } = useSelector(store => store.userReducer);


  const [message, setmessage] = useState("")
  const [msginfo, setmsginfo] = useState({})
  const [messages, setmessages] = useState([])
  const [currentCustomer, setcurrentCustomer] = useState(null)
  const [recording, setRecording] = useState(false);
  const audioBlob = useRef()
  const mediaRecorder = useRef();
  const [imageSrc, setImageSrc] = useState(null);
  const [progress, setProgress] = useState(0);
  const [customerNumbers, setcustomerNumbers] = useState([ ])
  const [selectedChat, setSelectedChat] = useState({});
  const [chatOpen, setChatOpen] = useState(false)
  const [showchat, setshowchat] = useState(false)
  const [currentConversation, setcurrentConversation] = useState({})
  const audioRef = useRef(null);
const [recordingDelete, setrecordingDelete] = useState(false)
  useEffect(() => {
    console.log(user)
    socket.emit("new-connection", { userId:user._id,name: user.name, socketId: socket.id, role: user.role })
  }, [])
  const sortByRecentUpdate = (array) => {
    return array.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  };



  
  const fetchContacts=async ()=>{
    let conversationdata=await getEmployeeConversation(user._id);
    console.log("the conversation data ",conversationdata)
    conversationdata=sortByRecentUpdate(conversationdata)
    let customerData=[]
    let checknewmsg=false;
    conversationdata.forEach((val)=>{
      try{
        if(val.roomId){

          if(val.roomId._id==currentConversation.roomId || Object.keys(currentConversation).length === 0){
            checknewmsg=true;
          }
          if(checknewmsg){

          socket.emit("join-room:employee",{roomId:val.roomId._id})
          customerData.push({customerId:val.roomId._id,customerNumber:val.roomId.phone,lastmsg:val.message,employeeId: val.employeeId})
          }
          else{
            customerData.push({customerId:val.roomId._id,customerNumber:val.roomId.phone,show:"new message",lastmsg:val.message,employeeId: val.employeeId})
          }

        }
      }catch{
        console.log("some eerror")
      }

    })
    setcustomerNumbers(customerData);
  }

  useEffect(() => {


    fetchContacts();

   
    



  }, [])
  
  const handleUploadAudio = (blob) => {
    if (blob) {
      
      const file = new File([blob], `audio.wav`, { type: 'audio/wav' });
      const storageRef = ref(storage, `audio/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          console.error('Upload failed:', error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log("this is testing")
            setRecording(false);
            socket.emit("send-msg", {
              message: downloadURL,
              socketId: socket.id,
              category: user.category,
              role: "employee",
              customerSocket: currentCustomer,
              msgType: "audio"
            });
            setRecording(false)
            console.log("this is audio blob", downloadURL)


            let data = {
              conversationId: currentConversation._id,
              senderId:user._id,
              roomId: currentCustomer,
              text: message,
              sourceLink: downloadURL,
              type: "audio"
            }
            socket.emit("send-msg", data);
            newMessages(data);
            setmessages((prev) => [...prev, data])

            console.log('File available at', downloadURL);
          });
        }
      );
    }
  };
  useEffect(() => {
    
    if(recordingDelete){
     console.log("this is delte recording delete1",recordingDelete)
     setRecording(false);
     mediaRecorder.current=null;
    setTimeout(() => {
      setrecordingDelete(false)
    }, 2000);
   
    }
    
  }, [recordingDelete])
  const startRecording = async () => {
    try {
      if (recording == false) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);

        const chunks = [];

        mediaRecorder.current.ondataavailable = (e) => {
          chunks.push(e.data);
        };

        mediaRecorder.current.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          audioBlob.current = blob;
          handleUploadAudio(blob)

        };

        mediaRecorder.current.start();
        setRecording(true);
      }
      else if (recording == true) {

        mediaRecorder.current.stop();



      } // 5 seconds recording time, you can adjust as needed
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };


  const handleNewCustomer = (data) => {
    createConversation({ roomId: data.customerId, senderId: user._id, receiverId: data.customerId })
    setcustomerNumbers((prev) => (!prev.includes(data) ? [...prev, data] : [...prev]));
  }

  const handleReceiveMessage =async (msg) => {
    // moveCustomerToTop(data.customerNumber)
    if(msg.roomId== currentConversation.roomId){
      setmessages((prev) => [...prev, msg])
 
    }
    else{
      console.log("setting things")
      await fetchContacts();

    }

  }
  const handleWaitingCustomer = (data) => {

    data.forEach((customer) => {
      setcustomerNumbers(prev => [...prev, customer.customerNumber]);

    })
  }



  const handleCustomerClick =async(e, chat) => {
    console.log("working")
    setSelectedChat(chat)
    setChatOpen(true);
    const key = e.target.getAttribute('data-key');
    setcurrentCustomer(key)
   
    const data =await getConversation({ roomId: key })
  
    setcurrentConversation(data)
    const messagedata=await getMessages(data._id)
    setmessages([...messagedata])
    setcustomerNumbers((prev)=>{
      prev.forEach(val=>{
        if(val.customerId==key && val.hasOwnProperty("show"))
          {
            delete val["show"]
          }
      })
      
      return prev
    })

  }
  const handleUpload = () => {
    if (imageSrc) {

      const storageRef = ref(storage, `images/${imageSrc.name}`);
      const uploadTask = uploadBytesResumable(storageRef, imageSrc);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          console.error("Upload failed:", error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            let data = {
              conversationId: currentConversation._id,
              roomId: currentCustomer,
              senderId:user._id,
              text: message,
              sourceLink: downloadURL,
              type: "img"
            }
            socket.emit("send-msg", data);
            newMessages(data);
              setmessages((prev) => [...prev, data])


          });
        }
      );
    }
  }

  const moveCustomerToTop = (customerName) => {
    setcustomerNumbers(prevCustomers => {
      const index = prevCustomers.indexOf(customerName);
      if (index !== -1) {
        const updatedCustomers = [...prevCustomers];
        updatedCustomers.splice(index, 1);
        updatedCustomers.unshift(customerName);
        return updatedCustomers;
      }
      return prevCustomers;
    });
  };
  const handleSendMessage = async(e) => {
    
    console.log("sending msg to ", currentCustomer);
    console.log("sending msg to ", message)

    if (imageSrc) {
      handleUpload();
    }
    else {
      let msg = {
        conversationId: currentConversation._id,
        roomId: currentCustomer,
        senderId:user._id,
        text: message,
        type: "text"
      }
      socket.emit("send-msg", msg);
      newMessages(msg);
      setmessages((prev) => [...prev, msg])
      await fetchContacts();



    }
    setmessage("")
    setImageSrc(null)
  }
  useEffect(() => {
    socket.on("new-request:customer", handleNewCustomer)
    socket.on("waiting-customer", handleWaitingCustomer)
    socket.on("receive-msg", handleReceiveMessage)
    socket.on("newCustomer:employee",async(data)=>{
      console.log("fetching data again ")
      await fetchContacts();
    })
    return () => {

      socket.off("new-request:customer", handleNewCustomer)
      socket.off("waiting-customer", handleWaitingCustomer)
      socket.off("receive-msg", handleReceiveMessage)

    }
  }, [socket,handleNewCustomer,handleWaitingCustomer,handleReceiveMessage])

  return (
    <div class="flex flex-row space-x-6 justify-center ">
      <div >

        <div class=" max-w-[340px] h-[90vh] bg-white shadow-lg rounded-lg overflow-y-auto">
          <header class="pt-6 pb-4 px-5 border-b border-gray-200">
            <div class="flex justify-between items-center mb-3">
              {/* <!-- Image + name --> */}
              <div class="flex items-center">
                <a class="inline-flex items-start mr-3" href="#0">
                  <img class="rounded-full" src="Images/employee.png" width="48" height="48" alt="Lauren Marsano" />
                </a>
                <div class="pr-1">
                  <a class="inline-flex text-gray-800 hover:text-gray-900" href="#0">
                    <h2 class="text-xl leading-snug font-bold">{user.name}</h2>
                  </a>
                  <a class="block text-sm font-medium hover:text-indigo-500" href="#0">@Employee</a>
                </div>
              </div>
              {/* <!-- Settings button --> */}

            </div>


          </header>
          <div class="py-3 px-5">
            <h3 class="text-xs font-semibold uppercase text-gray-400 mb-1">Chats</h3>
            <div class="divide-y divide-gray-200">
              {
                customerNumbers.map((detail) => (
                  <button onClick={(e) => handleCustomerClick(e, detail)} class="w-full text-left py-2 focus:outline-none focus-visible:bg-indigo-50" data-key={detail.customerId}>
                    <div class="flex items-center" data-key={detail.customerId}>
                      <img class="rounded-full items-start flex-shrink-0 mr-3" src="Images/profile.png" width="32" height="32" alt="Marie Zulfikar" data-key={detail.customerNumber} />
                      <div data-key={detail.customerId}>
                        <h4 class="text-sm font-semibold text-gray-800" data-key={detail.customerId}>{detail.customerNumber}</h4>
                     
                        <div class="text-[13px] text-gray-500" data-key={detail.customerId}>{detail.lastmsg}</div>
                        {
                        detail.show?
                        <span class="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-blue-400 border border-blue-400">{detail.show}</span>
                        :
                        ""
                      }
                     
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      </div>
      {/* ${showchat?'block': 'hidden'} */}
      <div class={`w-[90vw] md:w-[60vw] h-[90vh] bg-white shadow-lg rounded-lg lg:w-[130vh] md:block absolute md:static   ${chatOpen ? "left-0" : "left-[-200%]"}  `} >
      
          {
            Object.keys(currentConversation).length != 0?
          messages && <MessageBox setrecordingDelete={setrecordingDelete} currentConversation={currentConversation} messages={messages} message={message} setmessage={setmessage} setChatOpen={setChatOpen} handleSendMessage={handleSendMessage} startRecording={startRecording} imageSrc={imageSrc} setImageSrc={setImageSrc} role={"admin"} customerNumber={selectedChat} />
          :""
          }
        
      </div>
    </div>


  )
}

export default page