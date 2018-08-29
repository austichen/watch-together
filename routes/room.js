const router = require('express').Router();

function doesRoomExist(req, res, next) {
    if (!req.app.locals.roomsList[req.params.roomId.toString()]) {
      //TODO make a proper error page if the room does not exist
      return res.render('roomNotFound');
    }
    next();
}

router.get('/create/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  if (!req.app.locals.roomsList[roomId.toString()]) {
    const roomData = {
      roomId: roomId,
      numUsers: 0,
      videoData: {
        id: 'cZAw8qxn0ZE',
        currentTime: 15,
        isPlaying: false
      }
    }
    req.app.locals.roomsList[roomId.toString()] = roomData;
  }
  res.redirect(`/room/${roomId}`);
})

router.get('/:roomId', doesRoomExist, (req, res) => {
  const roomId = req.params.roomId;
  const roomInfo = {
    roomId: roomId
  }

  res.render('room', roomInfo)
})

module.exports = router;
