const express = require('express')
const {Server} = require('socket.io')
const http = require('http')

//const {getDatabase , ref , set  , get , child} = require('firebase/database')

const {getFirestore  , query , getDoc, getDocs, updateDoc , doc ,setDoc , addDoc , collection , where} = require('firebase/firestore')
const db = require('./config/firebase')



const app = express()
const server = http.createServer(app)

const port = process.env.PORT || 5000
const hostname = '192.168.1.37'
server.listen(port , ()=>{
    console.log('Listenning on '+port)
})


const io = new Server(server , {
    cors : {
        origin : '*',
        methods : ['POST' , 'GET']
    }
})



let connectedUsers = {}

io.on('connection'  , (socket)=>{
    const id = socket.handshake.query.id
    socket.join(id)
    connectedUsers[id] = 'online'
    
    //send to everyone the status of the new connected user
    socket.broadcast.emit('user-connected' , {recipientId:id, newStatus:connectedUsers[id]} )
    
    //send the curent socket all connected users
    io.to(socket.id).emit('users-status' , connectedUsers)

    //send to every one the status of the disconnected user
    socket.on('disconnect', ()=>{
        const now = new Date()
        connectedUsers[id] = now
        socket.broadcast.emit('user-disconnected' , {recipientId:id , newStatus:connectedUsers[id]} )
    })

    //handling messages 
    socket.on('send-message' , (data)=>{
        let {recipient , message , discussionId} = data
        
        let newRecipient = {id , name:id}
        socket.broadcast.to(recipient.id).emit('recieve-message',{discussionId , recipient:newRecipient , message})
    })

    socket.on('message-received' , ({recipientId , discussionId ,messageId})=>{
        socket.broadcast.to(recipientId).volatile.emit('message-received-update',{discussionId ,messageId})
    })

    
    socket.on('message-seen' , ({recipientId , discussionId})=>{
        socket.broadcast.to(recipientId).volatile.emit('message-seen-update',{discussionId })
    })


})
 























// async function getUserDiscussions(id , socket){
//     const discussionsRef = collection(db , 'discussions')
//     const q = query(discussionsRef , where('recipients' , 'array-contains' , id)) 
//     const snapshot = await getDocs(q)
//     let data = []
//     snapshot.forEach((doc)=>{
//          data =  doc.data()
//          console.log(data.recipients[1])
//          if(data){
//              data.recipients.forEach((recipient)=>{
//                  if(recipient !== id){
//                      let newDiscussion = {discussionId :data.discussionId, recipient :{id:recipient , name:recipient} , messages:data.messages } 
//                      io.to(socket.id).emit('retrieve-discussion', newDiscussion)            
//                  }
//              })
//         }
//     })

//  }
 

// function updateDiscussion( userId , recipient , message , discussionId){
//     getDiscussion(discussionId)
//     .then((data)=>{
        
//         if(data){
//             const docRef = doc(db , 'discussions' , discussionId)
//             updateDoc(docRef ,{messages : [...data.messages , message]})
//         }
//         else{
//             const discussionsRef = doc(db , 'discussions' , discussionId) 
//             console.log('No Data')
//             setDoc(discussionsRef , {
//                 discussionId : discussionId,
//                 recipients : [userId , recipient.id],
//                 messages : [message]
                
//             })
//         }
//     })
//     .catch((err)=>{
//         console.log(err)
//     })

// }

// async function getDiscussion(discussionId){
//     // const dbRef = ref(db)
//     // const snapshot = await get(child(dbRef , 'discussions/'+discussionId))
//     // return snapshot.val()     
//     const  docSnap = await getDoc( doc(db ,'discussions' , discussionId ))
//     let data = docSnap.data() 
    
//     return data
// }

