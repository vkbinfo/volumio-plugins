var libQ = require("kew");

var PLAY_MUSIC_CONSTANTS = require('./playMusic/playMusicConstants');
var playMusicCore = require('./playMusic/playMusicCore');

function handleBrowseUri(curUri) {
  var self = this;
  var info;
  var listItemsToRender;
  if (curUri == "googleplaymusic") {
    listItemsToRender = libQ.resolve(PLAY_MUSIC_CONSTANTS.availableFeatures); // get's first time options, when we click on the google play music in the browse section.
  } else if (curUri.startsWith("googleplaymusic/playlists")) {
    info = {
      curUri: curUri,
      playListId: curUri.split('/').pop(),
      shared: false,
      addToQueue: false,
    };
    listItemsToRender = (curUri == "googleplaymusic/playlists") ? playMusicCore.getPlaylists(self) : playMusicCore.getSongsInPlaylist(self, info);
  } else if (curUri.includes('googleplaymusic:shared:playlist:')) {
    info = {
      curUri: curUri,
      playListId: curUri.split(':').pop(),
      shared: true,
      addToQueue: false,
    };
    listItemsToRender = playMusicCore.getSongsInPlaylist(self, info);
  } else if (curUri.startsWith("googleplaymusic/stations")) {
    var stationInfo = { curUri: curUri, stationId: curUri.split('/').pop(), addToQueue: false };
    listItemsToRender = (curUri == "googleplaymusic/stations") ? playMusicCore.getStations(self) : playMusicCore.getTracksInStation(self, stationInfo);
  } else if (curUri.startsWith("googleplaymusic/featuredplaylists")) {
    listItemsToRender = self.featuredPlaylists(curUri);
  } else if (curUri.startsWith("googleplaymusic:album")) {
    listItemsToRender = self.renderAlbumTracks(curUri);
  } else if (curUri.startsWith("googleplaymusic:artist:")) {
    listItemsToRender = self.getArtistData(curUri);
  }
  return listItemsToRender;
}

function explodeUri(uri) {
  var self = this;
  var defer = libQ.defer();
  var returnPromiseObject;
  if (uri.includes('playlist')) {
    returnPromiseObject = handlePlaylistUri(self, uri);
  } else if (uri.includes('station')) {
    returnPromiseObject = handleStationUri(self, uri);
  } else if (uri.startsWith('googleplaymusic:album:')) {
    var albumId = uri.split(':').pop();
    returnPromiseObject = playMusicCore.getAlbumTracks(self, albumId);
  } else {
    var trackData = playMusicCore.getTrackInfo(self, uri);
    var response = [trackData];
    defer.resolve(response);
    returnPromiseObject = defer.promise;
  }
  return returnPromiseObject;
}

function handlePlaylistUri(service, uri) {
  service.logger.info("googleplaymusic::explodeUri Playlist: " + uri);
  var isSharedPlaylist = uri.includes('shared');
  var playlistId = isSharedPlaylist ? uri.split(':').pop() : uri.split('/').pop();
  var info = {
    curUri: uri,
    playListId: playlistId,
    shared: isSharedPlaylist,
    addToQueue: true, // this kind of uri will only to come to explode, when user is trying to add playlist songs to queue.
  };
  return playMusicCore.getSongsInPlaylist(service, info); // will playlist songs in a array to be added in queue.
}

function handleStationUri(service, uri) {
  if (uri.includes('googleplaymusic:station:track')) {
    var defer = libQ.defer();
    var trackData = playMusicCore.getTrackInfo(service, uri);
    defer.resolve([trackData]);
    return defer.promise;
  } else {
    service.logger.info("googleplaymusic::explodeUri Station: " + uri);
    var stationInfo = { curUri: uri, stationId: uri.split('/').pop(), addToQueue: true };
    return playMusicCore.getTracksInStation(service, stationInfo);
  }
}

module.exports = {
  handleBrowseUri: handleBrowseUri,
  explodeUri: explodeUri
};
