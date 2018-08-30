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
      return null;
    }
  }
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

const removeFromActiveUserList = (socketId, roomId) => {
  console.log(app.locals.roomsList[roomId].activeUsersList)
  let disconnectedUser;
  app.locals.roomsList[roomId].activeUsersList.forEach((user, index) => {
    if (user.socketId == socketId) {
      disconnectedUser = app.locals.roomsList[roomId].activeUsersList.splice(index,1);
    }
  })
  if (disconnectedUser === undefined) return null;
  return disconnectedUser[0].name;
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
      app.locals.roomsList[currentRoomId].numUsers++;
      if(app.locals.roomsList[currentRoomId].numUsers===1) app.locals.roomsList[currentRoomId].activeUsersList = []
      io.sockets.in(currentRoomId).emit('update viewer count', app.locals.roomsList[currentRoomId].numUsers)
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
    //console.log(app.locals.roomsList[currentRoomId].numUsers)
    if (app.locals.roomsList[currentRoomId].numUsers<=0) {
      delete app.locals.roomsList[currentRoomId];
      console.log('deleting room')
    } else {
      let disconnectedUser = removeFromActiveUserList(socket.id, currentRoomId);
      io.sockets.in(currentRoomId).emit('update viewer count', app.locals.roomsList[currentRoomId].numUsers);
      if(disconnectedUser) {
        io.sockets.in(currentRoomId).emit('update active users list', app.locals.roomsList[currentRoomId].activeUsersList);
        io.sockets.in(currentRoomId).emit('user left', disconnectedUser);
      }
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
  socket.on('user joined', userName => {
    app.locals.roomsList[currentRoomId].activeUsersList.push({socketId: socket.id, name: userName});
    io.sockets.in(currentRoomId).emit('user joined', userName)
    io.sockets.in(currentRoomId).emit('update active users list', app.locals.roomsList[currentRoomId].activeUsersList);
  })
  socket.on('send message', messageData => {
    io.sockets.in(currentRoomId).emit('receive message', messageData);
  })
})
