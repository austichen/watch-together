const express = require('express');
const app = express();
const router = express.Router();

const fetch = require('node-fetch')
const ejs = require('ejs')

require('dotenv').config()

//socket io and server setup
const port = process.env.PORT || 3000;
const io = require('socket.io')
  .listen(app.listen(port, () => {console.log('listening on port ', port)}));

//routes
const roomRoute = require('./routes/room');

//app config
app.set('views', './views')
app.set('view engine', 'ejs');
app.use(express.static(__dirname+'/public'));
app.locals.roomsList = {};

app.get('/api/getYoutubeApiKey', (req, res) => {
  res.send(`${process.env.YOUTUBE_API_KEY}`)
})

app.get('/', (req, res) => {
  res.render('home')
})

//pass io to router

app.use('/room', roomRoute);


const getCurrentVideo = (roomId, thisSocket) => {
  let clients = io.sockets.adapter.rooms[roomId].sockets;
  console.log(clients);
  let numClients = (typeof clients !== 'undefined') ? Object.keys(clients).length : 0;
  if (numClients<=1) {
    return {
      id: 'cZAw8qxn0ZE',
      currentTime: 0,
      isPlaying: false
    }
  }
  //get a random client
  for (let clientId in clients ) {
     //this is the socket of each client in the room.
     let clientSocket = io.sockets.connected[clientId];
     if (clientSocket !=thisSocket) {

       console.log('clientSocket id: ',clientSocket.id)
       io.to(clientSocket.id).emit('get current video status', thisSocket.id);
       console.log('SUCCESS')
       return null;
     }

}
//in case anything goes wrong
  //FOR DEVELOPTMENT ONLY REMOVE THIS AFTER
  /*
  if(!app.locals.roomsList[roomId]) {
    return {
      id: 'cZAw8qxn0ZE',
      currentTime: 15,
      isPlaying: false
    }
  }
  //FOR DEVELOPMENT ONLY REMOVE THIS AFTER
  console.log(app.locals.roomsList)
  console.log('roomID: ',roomId,' typeof: ',typeof roomId)
  let roomData = app.locals.roomsList[roomId];
  if(roomData) {
    return roomData.videoData;
  } else {
    throw new Error("Room not found.")
  }
  */
}

const updateCurrentVideo = (roomId, videoId, videoTitle) => {
  const currentRoom = app.locals.roomsList[roomId];
  if(currentRoom!==undefined) {
    currentRoom.videoData.id=videoId;
    currentRoom.videoData.title=videoTitle;
  }
}

const getCurrentVideoTitle = roomId => {
  const currentRoom = app.locals.roomsList[roomId];
  if(currentRoom!==undefined) {
      return currentRoom.videoData.title;
  }
}
//sockets

io.on('connection', socket => {
  //console.log('connection: ',socket)
  let currentRoomId;
  socket.on('room connect', roomId => {
    currentRoomId = roomId;
    socket.join(roomId, () => {
          console.log('connected to room '+roomId);
      if(app.locals.roomsList[roomId]==undefined) {
        return socket.disconnect();
      }
      app.locals.roomsList[roomId].numUsers++;
    });

    let currentVideoData = getCurrentVideo(roomId, socket);
    if(currentVideoData!=null) {
      currentVideoData.title = getCurrentVideoTitle(currentRoomId);
      socket.emit('initialize video', currentVideoData);
    }


  })
  socket.on('receive current video status', returnObject => {
    let currentVideoData = returnObject.videoInfo;
    currentVideoData.title = getCurrentVideoTitle(currentRoomId);
    let receiverSocketId = returnObject.receiverSocket;
    console.log('currentVideoData: ', currentVideoData);
    io.to(receiverSocketId).emit('initialize video', currentVideoData);
  })
  socket.on('disconnect', () => {
    if(app.locals.roomsList[currentRoomId]==undefined) {
      return socket.disconnect();
    }
    app.locals.roomsList[currentRoomId].numUsers--;
    console.log(app.locals.roomsList[currentRoomId].numUsers)
    if (app.locals.roomsList[currentRoomId].numUsers<=0) {
      delete app.locals.roomsList[currentRoomId];
      console.log('deleting room')
    }
  })
  socket.on('set video', (roomId, videoId, videoTitle) => {
    updateCurrentVideo(roomId, videoId, `${videoTitle}`);
    console.log('room id: ',roomId,' typeof: ',typeof roomId)
    io.sockets.in(roomId).emit('set video', videoId, `${videoTitle}`);
  })
  socket.on('pause video', roomId => {
    io.sockets.in(roomId).emit('pause video');
  })
  socket.on('play video', roomId => {
    io.sockets.in(roomId).emit('play video');
  })
  socket.on('scrub video', scrubToTime => {
    io.sockets.in(currentRoomId).emit('scrub video', scrubToTime);
  })
  //messages
  socket.on('send message', messageData => {
    io.sockets.in(currentRoomId).emit('receive message', messageData);
  })
})
