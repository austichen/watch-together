const express = require('express');
const app = express();
const router = express.Router();

const fetch = require('node-fetch')
const ejs = require('ejs')

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

console.log('app.locals test: ',app.locals)

app.get('/', (req, res) => {
  res.render('home')
})

//pass io to router

app.use('/room', roomRoute);


const getCurrentVideo = roomId => {
  //FOR DEVELOPTMENT ONLY REMOVE THIS AFTER
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
}

const updateCurrentVideo = (roomId, videoId) => {
  app.locals.roomsList[roomId].videoData.id=videoId;
}

//sockets

io.on('connection', socket => {
  //console.log('connection: ',socket)
  let currentRoomId;
  socket.on('room connect', roomId => {
    currentRoomId = roomId;
    socket.join(roomId, () => {
      app.locals.roomsList[roomId].numUsers++;
    });

    let currentVideoData = getCurrentVideo(roomId);
    console.log('connected to room '+roomId);
    console.log('current video datA: ',currentVideoData)
        console.log(socket)
    socket.emit('initialize video', currentVideoData);
  })
  socket.on('disconnect', () => {
    console.log('currentRoomId: ',currentRoomId)
    app.locals.roomsList[currentRoomId].numUsers--;
    console.log(app.locals.roomsList[currentRoomId].numUsers)
    if (app.locals.roomsList[currentRoomId].numUsers<=0) {
      console.log('deleting room')
      delete app.locals.roomsList[currentRoomId];
    }
  })
  socket.on('receive room', roomId => {

  })
  socket.on('set video', (roomId, videoId) => {
    updateCurrentVideo(roomId, videoId);
    console.log('room id: ',roomId,' typeof: ',typeof roomId)
    io.sockets.in(roomId).emit('set video', videoId);
  })
  socket.on('pause video', roomId => {
    io.sockets.in(roomId).emit('pause video');
  })
  socket.on('play video', roomId => {
    io.sockets.in(roomId).emit('play video');
  })
})
