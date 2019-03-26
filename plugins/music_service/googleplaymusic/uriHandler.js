var libQ = require("kew");

var PLAY_MUSIC_CONSTANTS = require('./playMusicConstants');

function handleBrowseUri(curUri) {
  var self = this;
  var listItemsToRender;
  if (curUri == "googleplaymusic") {
    listItemsToRender = libQ.resolve(PLAY_MUSIC_CONSTANTS.availableFeatures); // get's first time options, when we click on the google play music in the browse section.
  } else if (curUri.startsWith("googleplaymusic/playlists")) {
    listItemsToRender = (curUri == "googleplaymusic/playlists") ? self.getPlaylists(self) : self.getSongsInPlaylist(curUri, { shared: false });
  } else if (curUri.includes('googleplaymusic:shared:playlist:')) {
    listItemsToRender = self.getSongsInPlaylist(curUri, { shared: true });
  } else if (curUri.startsWith("googleplaymusic/stations")) {
    listItemsToRender = (curUri == "googleplaymusic/stations") ? self.getStations() : self.getSongsInStation(curUri);
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
    returnPromiseObject = self.getAlbumTracks(self, albumId);
  } else {
    var trackData = self.getTrackInfo(uri);
    var response = [trackData];
    defer.resolve(response);
    returnPromiseObject = defer.promise;
  }
  return returnPromiseObject;
}

function handlePlaylistUri(service, uri) {
  var defer = libQ.defer();
  service.logger.info("googleplaymusic::explodeUri Playlist: " + uri);
  if (uri.includes('shared')) {
    var sharedPlaylistId = uri.split(':').pop();
    service.addPlaylistToQueue(sharedPlaylistId, { shared: true })
      .then(function (tracks) {
        defer.resolve(tracks);
      })
      .fail(function (error) {
        defer.reject(error);
      });
  } else {
    var playlistId = uri.split('/').pop();
    service.addPlaylistToQueue(playlistId, { shared: false })
      .then(function (tracks) {
        defer.resolve(tracks);
      })
      .fail(function (error) {
        defer.reject(error);
      });
  }
  return defer.promise;
}

function handleStationUri(service, uri) {
  if (uri.includes('googleplaymusic:station:track')) {
    var defer = libQ.defer();
    var trackData = service.getTrackInfo(uri);
    defer.resolve([trackData]);
    return defer.promise;
  } else {
    service.logger.info("googleplaymusic::explodeUri Station: " + uri);
    var stationId = uri.split('/').pop();
    return service.addStationSongsToQueue(stationId);
  }
}

module.exports = {
  handleBrowseUri: handleBrowseUri,
  explodeUri: explodeUri
};
