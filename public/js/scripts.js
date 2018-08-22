function createRoom() {
  fetch('https://www.uuidgenerator.net/api/version1')
    .then(response => response.text())
    .then(roomId => {
      window.location.href = `/room/create/${roomId}`;
    })
}

function copyLinkToClipboard() {
  const copyTarget = document.getElementById('room_link');
  copyTarget.select();
  document.execCommand("copy");
  document.getElementById('copy_link_button').innerHTML = 'Copied';
  setTimeout(() => {
    document.getElementById('copy_link_button').innerHTML = 'Copy';
  }, 2000);
}


// YOUTUBE API STUFF



function youtubeApiInit() {
  const searchQuery = document.getElementById('youtube_search').value;
  gapi.client.init({
    'apiKey': 'AIzaSyCulGJktSYgSIK7F5Xekdpb8__eNOYy1aI',
    'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
  }).then(() => {
    return gapi.client.youtube.search.list({
      part: 'snippet',
      type: 'video',
      q: searchQuery,
      maxResults: 10
    })
  }).then(response => {
    console.log(response.result.items)
    document.getElementsByClassName('video-results')[0].innerHTML = ''
    for (video of response.result.items) {
      document.getElementsByClassName('video-results')[0].innerHTML += (
        `<li onclick="setVideo('${video.id.videoId}')">${video.snippet.title}</li>`
      )
    }
  })
}

function searchForVideo() {
  gapi.load('client', youtubeApiInit)
}

function setVideo(id) {
  console.log('video id: ', id)
  socket.emit('set video', roomId, id);
}
//youtube video player


if($('#player').length) {
  console.log('player is ready')
  var tag = document.createElement('script');

  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

var player, youtubeAPIReady=false;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: 'FJjPdUagmKM',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    },
    playerVars: {
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      origin: window.location.href,
      rel: 0,
      showinfo: 0
    }
  });
  $('#play-button').click(() => {
    socket.emit('play video', roomId);
    player.playVideo();
  });

  $('#pause-button').click(() => {
    socket.emit('pause video', roomId);
  });
  initializeConnection();
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {

  /*
  if(isPlaying) {
    event.target.playVideo();
  }
  */
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;

function onPlayerStateChange(event) {
  const currentTime = event.target.j.currentTime;
  if (event.data == -1) {
    console.log('new video at');
  } else if (event.data == 5) {
    console.log('ready to play');
  } else if (event.data == 1) {
    console.log('play at ', currentTime);
  } else if (event.data == 2) {
    console.log('pause at ', currentTime);
  }
}

function stopVideo() {
  player.stopVideo();
}

console.log(typeof roomId)

let socket;

//SOCKET IO
function initializeConnection() {
  console.log('client side')
  socket = io();
  socket.on('connect', function() {
    console.log('socket connected');
    socket.emit('room connect', roomId);
  })
  socket.on('initialize video', videoData => {
    console.log('initialize video called')
    setTimeout(() => {
      player.cueVideoById(videoData.id, videoData.currentTime+1)
      if(videoData.isPlaying) {
        player.playVideo();
      }
    }, 1000)
  })
  socket.on('set video', videoId => {
    console.log('set video')
    player.loadVideoById(videoId);
  })
  socket.on('pause video', () => {
    player.pauseVideo();
  })
  socket.on('play video', () => {
    player.playVideo();
  })
  socket.on('get room', () => {
    console.log('get room');
    socket.emit('receive room', roomId);
  })
}
