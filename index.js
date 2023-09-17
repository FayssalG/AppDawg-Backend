

const express = require('express')
const {Server} = require('socket.io')
const http = require('http')

//const {getDatabase , ref , set  , get , child} = require('firebase/database')

const {  query , getDoc, getDocs, updateDoc , doc ,setDoc , addDoc , collection , where, and} = require('firebase/firestore')

const {db} =  require('./config/firebase')

const app = express()
const server = http.createServer(app)

const port = process.env.PORT || 5000
const hostname = '192.168.1.14'
server.listen(  port , ()=>{
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
    console.log(id + ' connected !')

    socket.join(id)
    connectedUsers[id] = 'online'
    
    //send any unreceived messages to the new connected user  
    const messagesCollection = collection(db  , 'messages') 
    getDocs(query(messagesCollection , and( where('isReceived' , '==' , false), where('to' , '==' , id)  )))
    .then((snapshot)=>{
        snapshot.forEach((doc)=>{
            const data = doc.data()
            socket.emit('receive-message',{discussionId:data.discussionId , recipient:{name:data.from ,id:data.from} , message:data.message})
            
        })     
       
    })
    
    //send feedback to the new connected user
    getDocs(query(messagesCollection , and( where('from' , '==' , id), where('isReceived' , '==' , true)  )))
    .then((snapshot)=>{
        snapshot.forEach((doc)=>{
            const data = doc.data()
          
            if(data.isSeen) socket.volatile.emit('message-seen-update',{ discussionId : data.discussionId })
            else socket.volatile.emit('message-received-update',{discussionId:data.discussionId  ,messageId:data.message.messageId})  
        })     
       
    })
    


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
        if(connectedUsers[recipient.id] == 'online'){
            //console.log(recipient.id+' is connected message sent !')
            socket.broadcast.to(recipient.id).emit('receive-message',{discussionId , recipient:newRecipient , message})
            
        } 
        else {
            const messagesDoc = doc(db  , 'messages' , discussionId+message.messageId )
            setDoc(messagesDoc , {
                discussionId : discussionId,
                from : id,
                to : recipient.id,
                message : message,
                isReceived : false
            })
            //console.log(recipient.id+' is not connected message saved !')
        }
       
    })

    socket.on('message-received' , ({recipientId , discussionId ,messageId})=>{
        if(connectedUsers[recipientId] == 'online'){
            socket.broadcast.to(recipientId).volatile.emit('message-status-update',{discussionId, messageId , type:'received'})

        }else{
            const messagesCollection = collection(db , 'messages')
            getDocs( query(messagesCollection , where('discussionId' , '==' , discussionId) ))
            .then((snapshot)=>{
                snapshot.forEach((docSnap)=>{
                    if(docSnap.id){
                        const docRef = doc(db , 'messages' , docSnap.id)
                        updateDoc(docRef , {
                            isReceived : true
                        })    
                    }
                })
            })
    
        }
    })

    
    socket.on('message-seen' , ({recipientId , discussionId })=>{
        if(connectedUsers[recipientId] == 'online'){
            socket.broadcast.to(recipientId).volatile.emit('message-status-update',{discussionId, type:'seen'})

        }else{
            const messagesCollection = collection(db , 'messages')
            getDocs( query(messagesCollection , where('discussionId' , '==' , discussionId) ))
            .then((snapshot)=>{
                snapshot.forEach((docSnap)=>{
                    if(docSnap.id){
                        const docRef = doc(db , 'messages' , docSnap.id)
                        updateDoc(docRef , {
                            isReceived : true,
                            isSeen : true
                        })    
                    }
                })
            })    
        }

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


