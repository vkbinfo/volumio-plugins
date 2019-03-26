/**
 * Boilerplate code for music plugin service for player actions.
 * This modules provides required playback options for google play music service on volumio player. 
 */

var libQ = require("kew");

function seek(timePosition) {
  var service = this;
  var consoleMessage = "googleplaymusic::seek to " + timePosition;
  service.pushConsoleMessage(consoleMessage);
  return service.mpdPlugin.seek(timePosition);
}

function next() {
  var service = this;
  service.pushConsoleMessage('googleplaymusic::next');
  return service.mpdPlugin.sendMpdCommand('next', []).then(function () {
    return service.mpdPlugin.getState().then(function (state) {
      state.trackType = "googleplaymusic Track";
      return service.commandRouter.stateMachine.syncState(state, "googleplaymusic");
    });
  });
}

function previous() {
  var service = this;
  service.pushConsoleMessage('googleplaymusic::previous');
  return service.mpdPlugin.sendMpdCommand('previous', []).then(function () {
    return service.mpdPlugin.getState().then(function (state) {
      state.trackType = "googleplaymusic Track";
      return service.commandRouter.stateMachine.syncState(state, "googleplaymusic");
    });
  });
}

function stop() {
  var service = this;
  service.pushConsoleMessage("googleplaymusic::stop");
  return service.mpdPlugin.stop().then(function () {
    return service.getState().then(function (state) {
      return service.pushState(state);
    });
  });
}

function pause() {
  var service = this;
  service.pushConsoleMessage("googleplaymusic::pause");
  return service.mpdPlugin.pause().then(function () {
    return service.getState().then(function (state) {
      return service.pushState(state);
    });
  });
}

function resume() {
  var service = this;
  service.pushConsoleMessage("googleplaymusic::resume");
  return service.mpdPlugin.resume().then(function () {
    return service.getState().then(function (state) {
      return service.pushState(state);
    });
  });
}

function getState() {
  this.pushConsoleMessage("googleplaymusic::getState");
  var service = this;
  return service.mpdPlugin.sendMpdCommand('status', [])
    .then(function (objState) {
      var collectedState = service.mpdPlugin.parseState(objState);
      // If there is a track listed as currently playing, get the track info
      if (collectedState.position !== null) {
        var trackinfo = service.commandRouter.stateMachine.getTrack(service.commandRouter.stateMachine.currentPosition);
        trackinfo.samplerate = (collectedState.samplerate) ? collectedState.samplerate : trackinfo.samplerate;
        trackinfo.bitdepth = (collectedState.bitdepth) ? collectedState.bitdepth : trackinfo.bitdepth;

        collectedState.isStreaming = trackinfo.isStreaming != undefined ? trackinfo.isStreaming : false;
        collectedState.title = trackinfo.title;
        collectedState.artist = trackinfo.artist;
        collectedState.album = trackinfo.album;
        collectedState.uri = trackinfo.uri;
        collectedState.trackType = trackinfo.trackType.split('?')[0];
        collectedState.serviceName = trackinfo.serviceName;
      } else {
        collectedState.isStreaming = false;
        collectedState.title = null;
        collectedState.artist = null;
        collectedState.album = null;
        collectedState.uri = null;
        collectedState.serviceName = service.serviceName;
      }
      return collectedState;
    });
}

function parseState(sState) {
  var service = this;
  service.pushConsoleMessage("googleplaymusic::parseState");
  var objState = JSON.parse(sState);
  var nSeek = null;
  if ('position' in objState) {
    nSeek = objState.position * 1000;
  }
  var nDuration = null;
  if ('duration' in objState) {
    nDuration = Math.trunc(objState.duration / 1000);
  }
  var sStatus = null;
  if ('status' in objState) {
    if (objState.status === 'playing') {
      sStatus = 'play';
    } else if (objState.status === 'paused') {
      sStatus = 'pause';
    } else if (objState.status === 'stopped') {
      sStatus = 'stop';
    }
  }
  var nPosition = null;
  if ('current_track' in objState) {
    nPosition = objState.current_track - 1;
  }
  return libQ.resolve({
    status: sStatus,
    position: nPosition,
    seek: nSeek,
    duration: nDuration,
    samplerate: service.samplerate, // Pull these values from somwhere else since they are not provided in the Spop state
    bitdepth: null,
    channels: null,
    artist: objState.artist,
    title: objState.title,
    album: objState.album
  });
}

module.exports = {
  seek: seek,
  next: next,
  previous: previous,
  stop: stop,
  pause: pause,
  resume: resume,
  getState: getState,
  parseState: parseState
};
