/**
 * This module is provides functions to implement Google Play Music's feature like playlist, station, methods and search 
 */
"use strict";
var libQ = require("kew");

function getPlaylists(service) {
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
    self.playMusic.getPlayListEntries(function (error, playListSongs) {
      if (error) {
        console.error('Error getting playlist songs');
        defer.reject('Error getting playlist songs' + error);
      }
      service.tracks = service.tracks.concat(playListSongs.data.items);
      defer.resolve(volumioFormatList);
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
  response.navigation.lists[0].items = self.tracks.reduce(function (acc, track) {
    if (track.playlistId === playListId) {
      var trackData = track.track;
      acc.push({
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
    return acc;
  }, []);
  defer.resolve(response);
  return defer.promise;
}


function addPlaylistToQueue(playlistId) {
  var self = this;
  var songsInPlaylist = [];
  for (var i = 0; i < self.tracks.length; i++) {
    if (self.tracks[i].playlistId === playlistId) {
      var track = self.tracks[i];
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
    self.tracks = self.tracks.concat(stationTracks); // storing to use it further when exploding uri and getting other informaiton of the song
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
    self.tracks = self.tracks.concat(stationTracks); // storing to use it further when exploding uri and getting other informaiton of the song
    defer.resolve(stationTracks);
  });
  return defer.promise;
}

function getAlbumTracks(service, albumId) {
  var defer = libQ.defer();
  service.playMusic.getAlbum(albumId, true, function (error, albumResponse) {
    if (error) {
      console.error('Error getting album tracks', error);
      defer.reject('Error getting album tracks' + error);
    } else {
      var volumioFormatSongList = albumResponse.tracks.reduce(function (acc, track) {
        acc.push({
          service: 'googleplaymusic', // plugin name
          uri: 'googleplaymusic:albumTrack:' + track.nid,
          type: 'song',
          trackId: track.nid, // nid works same as trackId, when we will try to get the streamurl from google.(for station songs array, google doesn't return trackId, but it does for playlist songs)
          name: track.title,
          title: track.title,
          artist: track.artist,
          album: track.album,
          albumArtRef: track.albumArtRef,
          albumart: track.albumArtRef[0].url,
          samplerate: service.samplerate,
          duration: Math.trunc(track.durationMillis / 1000),
          bitdepth: '16 bit',
          trackType: 'googleplaymusic',
        });
        return acc;
      }, []);
      service.tracks = service.tracks.concat(volumioFormatSongList);
      defer.resolve(volumioFormatSongList);
    }
  });
  return defer.promise;
}

function searchQuery(service, queryString) {
  var defer = libQ.defer();
  console.log('query string', queryString);
  service.playMusic.search(queryString, 10, function (error, responseSongs) { // the second parameter is for returned songs in t
    if (error) {
      defer.reject(error);
    } else {
      var results = responseSongs.entries.sort(function (resultA, resultB) {
        return resultA.score < resultB.score;
      });
      var volumioFormated = [];
      var artistList = getArtistsFromList(results);
      var albumsList = getAlbumsFromList(results);
      var playlist = getPlaylistsFromList(results);
      var songList = getTracksFromList(service, results);
      volumioFormated.push({ type: 'title', title: 'Play Music Tracks', availableListViews: ["list"], items: songList });
      volumioFormated.push({ type: 'title', title: 'Play Music Artists', availableListViews: ["list", "grid"], items: artistList });
      volumioFormated.push({ type: 'title', title: 'Play Music Albums', availableListViews: ["list", "grid"], items: albumsList });
      volumioFormated.push({ type: 'title', title: 'Play Music Playlists', availableListViews: ["list", "grid"], items: playlist });
      defer.resolve(volumioFormated);
    }
  });
  return defer.promise;
}

function getAlbumsFromList(entityArray) {
  var list = [];
  for (var i in entityArray) {
    var entity = entityArray[i];
    if (entity.type === '3') {// for album type string is 3.
      list.push({
        service: 'googleplaymusic',
        type: 'folder',
        title: entity.album.name,
        albumart: entity.album.albumArtRef,
        uri: 'googleplaymusic:album:' + entity.album.albumId
      });
    }
  }
  return list;
}

function getPlaylistsFromList(entityArray) {
  var list = [];
  for (var i in entityArray) {
    var entity = entityArray[i];
    if (entity.type === '4') {// for album type string is 4.
      list.push({
        service: 'googleplaymusic',
        type: 'folder',
        title: entity.playlist.name,
        albumart: entity.playlist.ownerProfilePhotoUrl,
        // TODO: check it uri will work with shareToken or not.
        uri: 'googleplaymusic:playlist:' + entity.playlist.shareToken
      });
    }
  }
  return list;
}

function getArtistsFromList(entityArray) {
  var list = [];
  for (var i in entityArray) {
    var entity = entityArray[i];
    if (entity.type === '2') {// for album type string is 2.
      list.push({
        service: 'googleplaymusic',
        type: 'folder',
        title: entity.artist.name,
        albumart: entity.artist.artistArtRef,
        uri: 'googleplaymusic:artist:' + entity.artist.shareToken
      });
    }
  }
  return list;
}

function getTracksFromList(googlePlayMusic, entityArray) {
  var list = [];
  for (var i in entityArray) {
    var entity = entityArray[i];
    if (entity.type === '1') {// for album type string is 2.
      googlePlayMusic.tracks.push(entity.track);
      list.push({
        service: 'googleplaymusic',
        type: 'song',
        title: entity.track.title,
        artist: entity.track.artist,
        album: entity.track.album,
        albumart: entity.track.artistArtRef,
        uri: 'googleplaymusic:search:track:' + entity.track.storeId
      });
    }
  }
  return list;
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
  console.log('The uri here', uri);
  console.log(trackId);
  var trackInfo;
  if (uri.includes('station')) {
    trackInfo = self.tracks.find(function (track) {
      return track.trackId === trackId;
    });
  } else if (uri.includes('search:track')) {
    trackInfo = self.tracks.find(function (track) {
      return track.storeId === trackId;
    });
  } else if (uri.includes('album')) {
    trackInfo = self.tracks.find(function (track) {
      return track.trackId === trackId;
    });
  } else {
    var trackResult = self.tracks.find(function (track) {
      return track.trackId === trackId;
    });
    trackInfo = trackResult.track;
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
  getAlbumTracks: getAlbumTracks,
  // getSongsByStationId: getSongsByStationId,
  getTrackInfo: getTrackInfo,
  searchQuery: searchQuery
};
