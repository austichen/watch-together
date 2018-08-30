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



//chat messages

let chatName;

$('#submit-name-button').click(e => {
  onNameSubmission($('#chat-name').val());
})

$('#chat-name').keypress(function(e) {
  if (e.which === 13) onNameSubmission($(this).val())
})

function onNameSubmission(name) {
  if (name!=='') {
    chatName = name;
    $('.white-overlay').css('display', 'none');
    $('#chat-name-input').css('display', 'none');
    $('#message-input').focus();
  }
}

$('#message-button').click(() => {
  if ($('#message-input').val() !='') {
    sendMessage($('#message-input').val());
  }
})

$('#message-input').keypress(function(e) {
  if (e.which === 13 && $(this).val()!='') {
    sendMessage($(this).val());
  }
  console.log(e.which);
})

function sendMessage(message) {
  socket.emit('send message', {text: message, name: chatName, originSocket: socket.id});
  $('#message-input').val('');
}

function renderMessage(message, name, originSocket) {
  console.log(socket)
  if (originSocket == socket.id) {
    console.log('oriign')
    $('.message-list').append(
      `<li class="text-right text-secondary"><span class="font-weight-bold text-primary">${name}</span>: ${message}</li>`
    )
  } else {
    $('.message-list').append(
      `<li class="text-secondary"><span class="font-weight-bold">${name}</span>: ${message}</li>`
    )
  }
}

// YOUTUBE API STUFF
let currentTime = 0, timeUpdater = null, videoLength, socket, videoDataForInit;

async function youtubeApiInit() {
  const searchQuery = document.getElementById('youtube_search').value;
  //TODO: hide api key
  const response = await fetch('/api/getYoutubeApiKey');
  const youtubeApiKey = await response.text()
  gapi.client.init({
    'apiKey': `${youtubeApiKey}`,
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
      document.getElementsByClassName('video-results')[0].innerHTML += renderVideoCard(video);
    }
  })
}

function renderVideoCard(video) {
  return `<li><div class="card" onclick="setVideo('${video.id.videoId}', '${video.snippet.title}')">
    <div class="card-body">
      <img class="card-img-top"
        src="${video.snippet.thumbnails.default.url}"
        style="height: ${video.snippet.thumbnails.default.height}px; width: ${video.snippet.thumbnails.default.width}px"
        alt="Card image cap"
      >
      <h5 class="card-title">${video.snippet.title}</h5>
      <p class="font-weight-bold card-text">${video.snippet.channelTitle}</p>
      <p class="font-weight-light card-text">${video.snippet.description}</p>
    </div>
  </div></li>`
}

$('#youtube_search').keypress(function(e) {
  if (e.which === 13 && $(this).val()!='') {
    searchForVideo();
  }
})

function searchForVideo() {
  gapi.load('client', youtubeApiInit)
}

function setVideo(id, title) {
  console.log('video title: ',title)
  socket.emit('set video', roomId, id, `${title}`);
}
//youtube video player


if($('#player').length) {
  console.log('initialize connection called');
  initializeConnection();
}

var player, youtubeAPIReady=false;

function onYouTubeIframeAPIReady() {
  console.log('youtube API ready')
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: videoDataForInit.id,
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
}


// 4. The API will call this function when the video player is ready.

function onPlayerReady(event) {
  console.log('player is ready')
  initializeVideo();
  initializePlayerButtons();

}

function initializeVideo() {

  if(videoDataForInit.isPlaying) {
    console.log('video is initialized to play');
    player.loadVideoById(videoDataForInit.id, videoDataForInit.currentTime+2);
    currentTime = videoDataForInit.currentTime+2;
  } else {
    console.log('video is not playing');
    player.cueVideoById(videoDataForInit.id, videoDataForInit.currentTime);
    currentTime = videoDataForInit.currentTime;
  }
  setVideoTitle(`${videoDataForInit.title}`);
}

function setVideoTitle(title) {
  $('#video-title').html(title);
}

function initializePlayerButtons() {
  $('#play-toggle').click(() => {
    let playerState = player.getPlayerState();
    if(playerState === 1) {
      socket.emit('pause video', roomId);
    } else if (playerState === 0 || playerState === 5 || playerState === 2) {
      socket.emit('play video', roomId);
    }
  });
  $('.progress').click(function(e){
    let scrubToTime = e.offsetX * player.getDuration()/ $(this).width();
    console.log(scrubToTime);
    socket.emit('scrub video', scrubToTime)
  })
  $('#volume-button').click(function() {
    player.isMuted() ? unmuteVideo($(this)) : muteVideo($(this));
  })
}

function unmuteVideo(volumeButton) {
  console.log(volumeButton)
  volumeButton.removeClass('fa-volume-off');
  volumeButton.addClass('fa-volume-up');
  player.unMute();
}

function muteVideo(volumeButton) {
  volumeButton.removeClass('fa-volume-up');
  volumeButton.addClass('fa-volume-off');
  player.mute();
}

function updateTime() {
  let previousTime = currentTime;
  if(player && player.getCurrentTime) {
    currentTime = player.getCurrentTime();
    //console.log(player.getPlayerState())
  }
  if(currentTime !== previousTime) {
    onVideoTimeUpdate(currentTime);
  } else if (player.getPlayerState()===1) {
    player.playVideo();
  }
}

function onVideoTimeUpdate(currentTime) {
  updateProgressBar(currentTime);
  updateCurrentTime(currentTime);
}

function updateProgressBar(time) {
  let percentWatched = time*100/videoLength;
  $('.progress-bar').css('width', `${percentWatched}%`).attr('aria-valuenow', percentWatched);
}

function updateCurrentTime(currentTime) {
  $('#current-time').html(convertSecondsToMins(currentTime));
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;

function onPlayerStateChange(event) {
  const playToggle = $('#play-toggle');
  const currentTime = event.target.j.currentTime;
  if (event.data == -1) {
    console.log('new video at');
  } else if (event.data == 5) {
    playToggle.removeClass('fa-pause');
    playToggle.addClass('fa-play');
  } else if (event.data == 1) {
    console.log('play at ', currentTime);
    playToggle.removeClass('fa-play');
    playToggle.addClass('fa-pause');
    videoLength = player.getDuration();
    timeupdater = setInterval(updateTime, 300);
    $('#video-duration').html(convertSecondsToMins(videoLength))
  } else if (event.data == 2) {
    console.log('pause at ', currentTime);
    playToggle.removeClass('fa-pause');
    playToggle.addClass('fa-play');
    clearInterval(timeupdater);
  } else if (event.data == 0) {
    playToggle.removeClass('fa-pause');
    playToggle.addClass('fa-play');
  }
}

function convertSecondsToMins(seconds) {
  let minutes = Math.floor(seconds/60);
  let _seconds = Math.round(seconds-(minutes*60));
  if(_seconds < 10) _seconds = '0'+_seconds;
  return `${minutes}:${_seconds}`;
}

function stopVideo() {
  player.stopVideo();
}

function getVideoId() {
  let video_id = player.getVideoUrl().split('v=')[1];
  let ampersandPosition = video_id.indexOf('&');
  if (ampersandPosition != -1) {
    video_id = video_id.substring(0, ampersandPosition);
  }
  return video_id;
}

//SOCKET IO
function initializeConnection() {
  console.log('client side')
  socket = io();
  socket.on('connect', function() {
    console.log('socket connected');
    socket.emit('room connect', roomId);
  })
  socket.on('initialize video', videoData => {
    console.log('player is ready')
    videoDataForInit = videoData;
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  })
  socket.on('set video', (videoId, videoTitle) => {
    console.log('set video')
    player.loadVideoById(videoId);
    currentTime=0;
    setVideoTitle(videoTitle);
  })
  socket.on('pause video', () => {
    player.pauseVideo();
  })
  socket.on('play video', () => {
    player.playVideo();
  })
  socket.on('scrub video', scrubToTime => {
    player.seekTo(scrubToTime, true);
    updateProgressBar(scrubToTime);
  })
  socket.on('get current video status', (receiverSocket) => {
    console.log('get current video status');
    let videoInfo;
    if(player && player.getPlayerState) {
      videoInfo = {};
      let playerState = player.getPlayerState();
      videoInfo.id = getVideoId();

      if (playerState == -1 || playerState == 5) {
        videoInfo.currentTime = 0;
        videoInfo.isPlaying = false;
      } else if (playerState == 1 || playerState == 3) {
        videoInfo.currentTime = player.getCurrentTime();
        videoInfo.isPlaying = true;
      } else if (playerState == 0) {
        videoInfo.currentTime = player.getDuration();
        videoInfo.isPlaying = true;
      } else {
        videoInfo.currentTime = player.getCurrentTime();
        videoInfo.isPlaying = false;
      }

    }
    socket.emit('receive current video status', {videoInfo: videoInfo, receiverSocket: receiverSocket})
  })
  //messages
  socket.on('receive message', messageData => {
    const message = messageData.text;
    const name = messageData.name;
    const originSocket = messageData.originSocket;
    renderMessage(message, name, originSocket);
    const messageListContainer = $('.message-list-container')
    messageListContainer.scrollTop(messageListContainer.prop('scrollHeight'))
  })
}
