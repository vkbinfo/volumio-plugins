/**
 * This module is provides functions to implement Google Play Music's feature like playlist, station and methods to add songs to queues.
 */
"use strict";
var libQ = require("kew");

function getPlaylists() {
  var self = this;
  var defer = libQ.defer();
  self.playMusic.getPlayLists(function (error, response) {
    if (error) {
      defer.reject(
        "unsuccessfull from getting music playlist from google server"
      );
      return console.error(
        "unsuccessfull from getting music playlist from google server"
      );
    }
    var playLists = response.data.items;
    var volumioFormatList = {
      navigation: {
        prev: {
          uri: "googleplaymusic"
        },
        lists: [
          {
            availableListViews: ["list"],
            items: []
          }
        ]
      }
    };
    var playListAccumulator = volumioFormatList.navigation.lists[0].items;
    for (var i = 0; i < playLists.length; i++) {
      var formatedPlaylistData = {
        service: 'googleplaymusic',
        type: "folder",
        title: playLists[i].name,
        icon: "fa fa-list-ol",
        uri: "googleplaymusic/playlists/" + playLists[i].id,
      };
      playListAccumulator.push(formatedPlaylistData);
    }
    defer.resolve(volumioFormatList);
    self.playMusic.getPlayListEntries(function (error, playListSongs) {
      if (error) {
        console.error('Error getting playlist songs');
      }
      self.playListSongs = playListSongs.data.items;
    });
  });
  return defer.promise;
}

function getSongsInPlaylist(curUri) {
  // curUri format:-  googleplaymusic/playlists/e757c0eb-2391-4f9b-a75a-f214476e94b4
  var self = this;
  var defer = libQ.defer();
  var playListId = curUri.split('/').pop();
  var response = {
    navigation: {
      prev: {
        uri: curUri
      },
      "lists": [
        {
          "availableListViews": ["list"],
          "items": []
        }
      ]
    }
  };
  var playListSongs = self.playListSongs;
  for (var i in playListSongs) {
    var track = playListSongs[i];
    if (track.playlistId === playListId) {
      var trackData = track.track;
      response.navigation.lists[0].items.push({
        service: 'googleplaymusic', // plugin name
        type: 'song',
        title: trackData.title,
        artist: trackData.artist,
        album: trackData.album,
        albumart: trackData.albumArtRef[0].url,
        icon: 'fas fa-play',
        uri: 'googleplaymusic:track:' + track.trackId,
      });
    }
  }
  defer.resolve(response);
  return defer.promise;
}


function addPlaylistToQueue(playlistId) {
  var self = this;
  var songsInPlaylist = [];
  for (var i = 0; i < self.playListSongs.length; i++) {
    if (self.playListSongs[i].playlistId === playlistId) {
      var track = self.playListSongs[i];
      var trackId = track.trackId;
      var trackInfo = track.track;
      // TODO: make single function for getting volumio for data of a song.
      var volumioFormatSongData = {
        uri: trackId,
        service: 'googleplaymusic',
        type: 'song',
        name: trackInfo.title,
        title: trackInfo.title,
        artist: trackInfo.artist,
        album: trackInfo.album,
        duration: Math.trunc(trackInfo.durationMillis / 1000),
        albumart: trackInfo.albumArtRef[0].url,
        samplerate: self.samplerate,
        bitdepth: '16 bit',
        trackType: 'googleplaymusic'
      };
      songsInPlaylist.push(volumioFormatSongData);
    }
  }
  return songsInPlaylist;
}

function getStations() {
  var self = this;
  var defer = libQ.defer();
  self.playMusic.getStations(function (error, response) {
    if (error) {
      defer.reject(
        "unsuccessfull operation: Getting music stations from google server!"
      );
      return defer.promise;
    }
    var stations = response.data.items;
    var volumioFormatList = {
      navigation: {
        prev: {
          uri: "googleplaymusic"
        },
        lists: [
          {
            availableListViews: ["list"],
            items: []
          }
        ]
      }
    };
    var stationsArray = volumioFormatList.navigation.lists[0].items;
    for (var i = 0; i < stations.length; i++) {
      var formatedStationData = {
        service: 'googleplaymusic',
        type: "folder",
        title: stations[i].name,
        icon: "fa fa-list-ol",
        uri: "googleplaymusic/stations/" + stations[i].id,
      };
      stationsArray.push(formatedStationData);
    }
    defer.resolve(volumioFormatList);
  });
  return defer.promise;
}

function getSongsInStation(curUri) {
  var self = this;
  var defer = libQ.defer();
  var stationId = curUri.split('/').pop();
  var response = {
    navigation: {
      prev: {
        uri: curUri
      },
      "lists": [
        {
          "availableListViews": ["list"],
          "items": []
        }
      ]
    }
  };
  this.playMusic.getStationTracks(stationId, 25, function (error, apiResponse) {
    if (error) {
      console.error('Error getting station tracks: ', error);
      defer.reject(error);
      return defer.promise;
    }
    var stationTracks = [];
    var stationTracksArray = apiResponse.data.stations[0].tracks;
    for (var i in stationTracksArray) {
      var track = stationTracksArray[i];
      stationTracks.push({
        service: 'googleplaymusic', // plugin name
        uri: 'googleplaymusic:station:track:' + track.nid,
        type: 'song',
        trackId: track.nid, // nid works same as trackId, when we will try to get the streamurl from google.(for station songs array, google doesn't return trackId, but it does for playlist songs)
        name: track.title,
        title: track.title,
        artist: track.artist,
        album: track.album,
        albumArtRef: track.albumArtRef,
        albumart: track.albumArtRef[0].url,
        samplerate: self.samplerate,
        duration: Math.trunc(track.durationMillis / 1000),
        bitdepth: '16 bit',
        trackType: 'googleplaymusic',
      });
    }
    self.stationTracks = stationTracks; // storing to use it further when exploding uri and getting other informaiton of the song
    response.navigation.lists[0].items = stationTracks;
    defer.resolve(response);
  });
  return defer.promise;
}

function addStationSongsToQueue(stationId) {
  var self = this;
  var defer = libQ.defer();
  var stationTracks = [];
  this.playMusic.getStationTracks(stationId, 25, function (error, apiResponse) {
    if (error) {
      console.error('Error getting station tracks: ', error);
      defer.reject(error);
      return defer.promise;
    }
    var stationTracksArray = apiResponse.data.stations[0].tracks;
    for (var i in stationTracksArray) {
      var track = stationTracksArray[i];
      stationTracks.push({
        service: 'googleplaymusic', // plugin name
        uri: track.nid,
        type: 'song',
        trackId: track.nid, // nid works same as trackId, when we will try to get the streamurl from google.(for station songs array, google doesn't return trackId, but it does for playlist songs)
        name: track.title,
        title: track.title,
        artist: track.artist,
        album: track.album,
        albumArtRef: track.albumArtRef,
        albumart: track.albumArtRef[0].url,
        samplerate: self.samplerate,
        duration: Math.trunc(track.durationMillis / 1000),
        bitdepth: '16 bit',
        trackType: 'googleplaymusic',
      });
    }
    self.stationTracks = stationTracks; // storing to use it further when exploding uri and getting other informaiton of the song
    defer.resolve(stationTracks);
  });
  return defer.promise;
}

// pm.search("bastille lost fire", 5, function(err, data) { // max 5 results
//   var song = data.entries.sort(function(a, b) { // sort by match score
//       return a.score < b.score;
//   }).shift(); // take first song
//   console.log(song);
//   pm.getStreamUrl(song.track.nid, function(err, streamUrl) {
//       console.log(streamUrl);
//   });
// }, function(message, body, err, httpResponse) {
//   console.log(message);
// });
function searchSong(service, queryString) {
  var defer = libQ.defer();
  console.log('query string', queryString);
  service.playMusic.search(queryString, 10, function (error, responseSongs) { // the second parameter is for returned songs in t
    var songs = responseSongs.entries.sort(function (songA, songB) {
      return songA.score < songB.score;
    });
    console.log('Got search songs', songs);
  });
}

// function getSongsByStationId(stationId) {
//   var self = this;
//   var defer = libQ.defer();
//   var stationTracks = [];
//   console.log('stationId', stationId);
//   this.playMusic.getStationTracks(stationId, 25, function (error, apiResponse) {
//     if (error) {
//       console.error('Error getting station tracks: ', error);
//       defer.reject(error);
//       return defer.promise;
//     }
//     var stationTracksArray = apiResponse.data.stations[0].tracks;
//     for (var i in stationTracksArray) {
//       var track = stationTracksArray[i];
//       stationTracks.push({
//         service: 'googleplaymusic', // plugin name
//         uri: 'googleplaymusic:station:track:' + track.nid,
//         type: 'song',
//         trackId: track.nid, // nid works same as trackId, when we will try to get the streamurl from google.(for station songs array, google doesn't return trackId, but it does for playlist songs)
//         name: track.title,
//         title: track.title,
//         artist: track.artist,
//         album: track.album,
//         albumArtRef: track.albumArtRef,
//         albumart: track.albumArtRef[0].url,
//         samplerate: self.samplerate,
//         duration: Math.trunc(track.durationMillis / 1000),
//         bitdepth: '16 bit',
//         trackType: 'googleplaymusic',
//       });
//     }
//     defer.resolve(stationTracks);
//   });
//   return defer.promise;
// }

function getTrackInfo(uri) {
  var self = this;
  var trackId = uri.split(':').pop();
  var trackInfo;
  if (uri.includes('station')) {
    console.log('a song data', self.stationTracks[0]);
    for (var i = 0; i < self.stationTracks.length; i++) {
      // getting station song from the stored station songs.
      console.log('Getting station id', self.stationTracks[i].trackId);
      if (self.stationTracks[i].trackId === trackId) {
        trackInfo = self.stationTracks[i];
        console.log('Track Info that I got for clicking on the station song', trackInfo);
        break;
      }
    }
  } else {
    for (var index = 0; index < self.playListSongs.length; index++) {
      if (self.playListSongs[index].trackId === trackId) {
        trackInfo = self.playListSongs[index].track;
        break;
      }
    }
  }
  return {
    uri: trackId,
    service: 'googleplaymusic',
    type: 'song',
    name: trackInfo.title,
    title: trackInfo.title,
    artist: trackInfo.artist,
    album: trackInfo.album,
    duration: Math.trunc(trackInfo.durationMillis / 1000),
    albumart: trackInfo.albumArtRef[0].url,
    samplerate: self.samplerate,
    bitdepth: '16 bit',
    trackType: 'googleplaymusic'
  };
}

module.exports = {
  getPlaylists: getPlaylists,
  getSongsInPlaylist: getSongsInPlaylist,
  addPlaylistToQueue: addPlaylistToQueue,
  getStations: getStations,
  getSongsInStation: getSongsInStation,
  addStationSongsToQueue: addStationSongsToQueue,
  // getSongsByStationId: getSongsByStationId,
  getTrackInfo: getTrackInfo,
  searchSong: searchSong
};
