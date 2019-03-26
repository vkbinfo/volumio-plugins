/**
 * This module provides functions to implement Google Play Music's feature to get playlist, station and other required functions.
 */
"use strict";
var libQ = require("kew");

var PLAY_MUSIC_CONSTANTS = require('./playMusicConstants');
var playMusicUtility = require('./playMusicUtility');

/**
 * @param  {} credential information from signin form to login in google account.
 */
function saveGoogleAccount(credential) {
  var service = this;
  var defer = libQ.defer();
  var email = credential.email;
  var password = credential.password;
  var bitrate = credential.bitrate;
  console.log("Google logging in...");
  service.playMusic.login({ email: email, password: password }, function (err, authTokenData) {
    if (err) {
      console.error("Google login failed", err);
      return defer.reject("Google login failed" + err);
    }
    service.commandRouter.pushToastMessage(
      "success",
      "Configuration update",
      "You have successfully signed in the google account."
    );
    service.config.set("email", email);
    service.config.set("bitrate", bitrate);
    service.config.set("masterToken", authTokenData.masterToken);
    service.config.set("androidId", authTokenData.androidId);
    defer.resolve({});
  });
  return defer.promise;
}

/**
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 */
function getPlaylists(service) {
  var defer = libQ.defer();
  service.playMusic.getPlayLists(function (error, apiResponse) {
    if (error) {
      console.error("unsuccessfull from getting music playlist from google server", error);
      return defer.reject("unsuccessfull from getting music playlist from google server" + error);
    }
    var playlistsFormatedData = JSON.parse(JSON.stringify(PLAY_MUSIC_CONSTANTS.volumioExpectedObjectStructure));
    playlistsFormatedData.navigation.prev.uri = "googleplaymusic";
    playlistsFormatedData.navigation.lists[0].items = apiResponse.data.items.reduce(function (acc, playlist) {
      var formatedPlaylistData = playMusicUtility.getFormatedPlaylistData(playlist);
      acc.push(formatedPlaylistData);
      return acc;
    }, []);

    prefetchAllPlaylistTracks(service) // prefetching all playlist songs
      .then(function () { defer.resolve(playlistsFormatedData); }) // after fetching all tracks from playlist we are sending the array of playlists.
      .fail(function (error) { defer.reject(error); });
  });
  return defer.promise;
}

/**'
 * This Function prefetches all the entries in user's playlists.
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 */
function prefetchAllPlaylistTracks(service) {
  var defer = libQ.defer();
  service.playMusic.getPlayListEntries(function (error, playListSongs) {
    if (error) {
      console.error('Error getting playlist songs');
      return defer.reject('Error getting playlist songs' + error);
    }
    service.tracks = service.tracks.concat(playListSongs.data.items); // storing all playlist tracks.
    defer.resolve({});
  });
  return defer.promise;
}

/**
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 * @param  {} playlist an object that contains information about requested playlist.
 */
function getSongsInPlaylist(service, playlist) {
  var defer = libQ.defer();
  if (playlist.shared) return getSongsOfASharedPlaylist(service, playlist);
  var response;
  var playListId = playlist.playListId;
  if (playlist.addToQueue) {
    response = playMusicUtility.retrievSongsOfAPlaylist(service.tracks, playListId); // if the request is for add to queue,then we need to send a array of songs.
  } else {
    response = JSON.parse(JSON.stringify(PLAY_MUSIC_CONSTANTS.volumioExpectedObjectStructure));
    response.navigation.prev.uri = 'googleplaymusic/playlists';
    response.navigation.lists[0].items = playMusicUtility.retrievSongsOfAPlaylist(service.tracks, playListId);
  }
  defer.resolve(response);
  return defer.promise;
}

/**
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 * @param  {} playlist  an object that contains information about requested playlist.
 */
function getSongsOfASharedPlaylist(service, playlist) {
  var defer = libQ.defer();
  var response = JSON.parse(JSON.stringify(PLAY_MUSIC_CONSTANTS.volumioExpectedObjectStructure));
  response.navigation.prev = playlist.curUri;
  var options = {
    limit: 50, // Total songs that will be returned for this playlist 
    shareToken: playlist.playListId,
  };
  service.playMusic.getSharedPlayListEntries(options, function (error, responseData) {
    if (error) {
      console.error('Error getting shared playlist songs: ', error);
      defer.reject('Error getting shared playlist songs: ' + error);
    } else {
      var tracks = responseData.entries[0].playlistEntry;
      var sharedPlaylistSongs = tracks.reduce(function (acc, track) {
        var trackData = track.track;
        var volumioFormatSong = playMusicUtility.getVolumioFormatOfSong(track.trackId, trackData);
        acc.push(volumioFormatSong);
        return acc;
      }, []);
      // formatting return data on the basis of request type(wethere it is add to queue or not).
      service.tracks = service.tracks.concat(tracks);// having a reference of playlist songs for future use.
      if (playlist.addToQueue) return defer.resolve(sharedPlaylistSongs); // we need to return a array of songs for addition of songs in queue.
      var response = JSON.parse(JSON.stringify(PLAY_MUSIC_CONSTANTS.volumioExpectedObjectStructure)); // else we need to send data in a specific format, so can volumio player can handle it.
      response.navigation.prev = playlist.curUri;
      response.navigation.lists[0].items = sharedPlaylistSongs;
      defer.resolve(response);
    }
  });
  return defer.promise;
}

/**
 * Station is a feature in google play music, To get stations to render on the gui, we will use this funciton.
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 */
function getStations(service) {
  var defer = libQ.defer();
  service.playMusic.getStations(function (error, apiResponse) {
    if (error) {
      console.error("Unsuccessfull operation: Getting music stations from google server!", error);
      return defer.reject("Unsuccessfull operation: Getting music stations from google server!" + error);
    }
    var formatedListOfStation = JSON.parse(JSON.stringify(PLAY_MUSIC_CONSTANTS.volumioExpectedObjectStructure));
    formatedListOfStation.navigation.prev.uri = 'googleplaymusic';
    var stationsArray = apiResponse.data.items.reduce(function (acc, station) {
      var formatedStationData = playMusicUtility.getFormatedStationData(station);
      acc.push(formatedStationData);
      return acc;
    }, []);
    formatedListOfStation.navigation.lists[0].items = stationsArray;
    defer.resolve(formatedListOfStation);
  });
  return defer.promise;
}

/**
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 * @param  {} stationInfo an object that contains information about requested station.
 */
function getTracksInStation(service, stationInfo) {
  var defer = libQ.defer();
  var stationId = stationInfo.stationId;
  var response = JSON.parse(JSON.stringify(PLAY_MUSIC_CONSTANTS.volumioExpectedObjectStructure));
  response.navigation.prev.uri = 'googleplaymusic/stations';
  service.playMusic.getStationTracks(stationId, 25, function (error, apiResponse) {
    if (error) {
      console.error('Error getting station tracks: ', error);
      return defer.reject('Error getting station tracks: ' + error);
    }
    var stationTracks = apiResponse.data.stations[0].tracks.reduce(function (acc, track) {
      var stationTrackFormat = playMusicUtility.getStationSongFormat(track);
      acc.push(stationTrackFormat);
      return acc;
    }, []);
    service.tracks = service.tracks.concat(stationTracks); // storing to use it further when exploding uri and getting other informaiton of the song
    if (stationInfo.addToQueue) response = stationTracks; // if the api request was to add songs in the queue then we just need to return array of station songs.
    else response.navigation.lists[0].items = stationTracks; // else we need to return in a specific format
    defer.resolve(response);
  });
  return defer.promise;
}

/**
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 * @param  {} albumId albumId of the the requested album from the player UI.
 */
function getAlbumTracks(service, albumId) {
  var defer = libQ.defer();
  service.playMusic.getAlbum(albumId, true, function (error, albumResponse) {
    if (error) {
      console.error('Error getting album tracks from server', error);
      return defer.reject('Error getting album tracks from server' + error);
    }
    var volumioFormatSongList = albumResponse.tracks.reduce(function (acc, track) {
      var formatedAlbumTrackData = playMusicUtility.getFormatedAlbumTrackData(track);
      acc.push(formatedAlbumTrackData);
      return acc;
    }, []);
    service.tracks = service.tracks.concat(volumioFormatSongList);
    defer.resolve(volumioFormatSongList);
  });
  return defer.promise;
}

/**
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 * @param  {} uri To play a song, the player sends a uri, that conatins id of that song, we retrieve it and return required information about that song.
 */
function getTrackInfo(service, uri) {
  var trackId = uri.split(':').pop();
  var trackInfo;
  if (uri.includes('station')) {
    trackInfo = service.tracks.find(function (track) {
      return track.trackId === trackId;
    });
  } else if (uri.includes('search:track')) {
    trackInfo = service.tracks.find(function (track) {
      return track.storeId === trackId;
    });
  } else if (uri.includes('album')) {
    trackInfo = service.tracks.find(function (track) {
      return track.trackId === trackId;
    });
  } else {
    var trackResult = service.tracks.find(function (track) {
      return track.trackId === trackId;
    });
    trackInfo = trackResult.track;
  }
  return playMusicUtility.getVolumioFormatOfSong(trackId, trackInfo);
}

module.exports = {
  saveGoogleAccount: saveGoogleAccount,
  getPlaylists: getPlaylists,
  getSongsInPlaylist: getSongsInPlaylist,
  getStations: getStations,
  getTracksInStation: getTracksInStation,
  getAlbumTracks: getAlbumTracks,
  getTrackInfo: getTrackInfo
};
