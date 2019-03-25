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

function getSongsInPlaylist(curUri, info) {
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
  if (!info.shared) {
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
  var sharedPlayListId = curUri.split(':').pop();
  var options = {
    limit: 50, // Total songs that will be returned for this playlist 
    shareToken: sharedPlayListId
  };
  self.playMusic.getSharedPlayListEntries(options, function (error, responseData) {
    if (error) {
      console.error('Error getting shared playlist songs: ', error);
      defer.reject('Error getting shared playlist songs: ' + error);
    } else {
      var tracks = responseData.entries[0].playlistEntry;
      var sharedPlaylistSongs = tracks.reduce(function (acc, track) {
        /**
         * {
 "kind": "sj#playlistEntry",
 "id": "AMaBXynWDffCvaCF27hRWoPE1-9PPm0pw2PfhTl9pkFRzqaN0LOScEQvKSSDJ60UmAHGTMY8p_I_Oa7mdWCDvuT1YO97yxwChw==",
 "absolutePosition": "02161727821137838077",
 "trackId": "T6akq2kkkgvvwbxcg224ifsp3uu",
 "creationTimestamp": "1527223719365394",
 "lastModifiedTimestamp": "1527223719365394",
 "deleted": false,
 "source": "2",
 "track": {
 "kind": "sj#track",
 "title": "Bittersweet (Original Mix)",
 "artist": "baaskaT",
 "composer": "",
 "album": "Flickshots & Quickscopes",
 "albumArtist": "baaskaT",
 "year": 2016,
 "trackNumber": 1,
 "durationMillis": "86000",
 "albumArtRef": [
 {
 "url": "http://lh3.googleusercontent.com/R1Dk0U-1U3V9PshW3He_E75ZKE-nkCHJLFIEVIb_kvZRQLcBdCNStwzocFMslQ2JCyNw2FIxww"
 }
 ],
 "artistArtRef": [
 {
 "url": "http://lh3.googleusercontent.com/J-QG-wJ_ndC-uS7amxJnoIjI5iDHgAyL4NxbX4tE7S6O8OBIbqtehbwOGsyqcAMC12wqmh-2"
 },
 {
 "url": "http://lh3.googleusercontent.com/R1Dk0U-1U3V9PshW3He_E75ZKE-nkCHJLFIEVIb_kvZRQLcBdCNStwzocFMslQ2JCyNw2FIxww"
 }
 ],
 "discNumber": 1,
 "estimatedSize": "3442975",
 "trackType": "7",
 "storeId": "T6akq2kkkgvvwbxcg224ifsp3uu",
 "albumId": "Bu7fytmr3nraowhbdqtjhqgjxmm",
 "artistId": [
 "Amwvyjcblitxufznqpiccuaz5zy"
 ],
 "nid": "6akq2kkkgvvwbxcg224ifsp3uu",
 "trackAvailableForSubscription": true,
 "trackAvailableForPurchase": true,
 "albumAvailableForPurchase": false,
 "contentType": "2"
 }
 },
         */
        var trackData = track.track;
        acc.push({
          service: 'googleplaymusic', // plugin name
          type: 'song',
          title: trackData.title,
          artist: trackData.artist,
          album: trackData.album,
          albumart: trackData.albumArtRef[0].url,
          uri: 'googleplaymusic:track:' + track.trackId,
        });
        return acc;
      }, []);
      self.tracks = self.tracks.concat(tracks);// having a reference of playlist songs for future use.
      response.navigation.lists[0].items = sharedPlaylistSongs;
      defer.resolve(response);
    }
  });
  return defer.promise;
}


function addPlaylistToQueue(playlistId, info) {
  var self = this;
  var defer = libQ.defer();
  var songsInPlaylist = [];
  if (!info.shared) {
    for (var i = 0; i < self.tracks.length; i++) {
      if (self.tracks[i].playlistId === playlistId) {
        var track = self.tracks[i];
        var trackId = track.trackId;
        var trackInfo = track.track;
        // TODO: make single function for getting volumio formatted data of a song.
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
    defer.resolve(songsInPlaylist);
  } else {
    var sharedPlayListId = playlistId;
    var options = {
      limit: 50, // Total songs that will be returned for this playlist 
      shareToken: sharedPlayListId
    };
    self.playMusic.getSharedPlayListEntries(options, function (error, responseData) {
      if (error) {
        console.error('Error getting shared playlist songs: ', error);
        defer.reject('Error getting shared playlist songs: ' + error);
      } else {
        var tracks = responseData.entries[0].playlistEntry;
        var sharedPlaylistSongs = tracks.reduce(function (acc, track) {
          var trackData = track.track;
          acc.push({
            uri: track.trackId,
            service: 'googleplaymusic',
            type: 'song',
            name: trackData.title,
            title: trackData.title,
            artist: trackData.artist,
            album: trackData.album,
            duration: Math.trunc(trackData.durationMillis / 1000),
            albumart: trackData.albumArtRef[0].url,
            samplerate: self.samplerate,
            bitdepth: '16 bit',
            trackType: 'googleplaymusic'
          });
          return acc;
        }, []);
        self.tracks = self.tracks.concat(tracks);// having a reference of playlist songs for future use.
        defer.resolve(sharedPlaylistSongs);
      }
    });
  }
  return defer.promise;
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
  service.playMusic.search(queryString, 10, function (error, responseSongs) { // the second parameter is for returned songs in t
    if (error) {
      defer.reject(error);
    } else {
      var results = responseSongs.entries.sort(function (resultA, resultB) {
        return resultA.score < resultB.score;
      });
      var volumioFormated = [];
      var artistList = getArtistsFromList(results, { isArtistList: false });
      var albumsList = getAlbumsFromList(results, { isAlbumList: false });
      var playlist = getPlaylistsFromList(results);
      var songList = getTracksFromList(service, results, { isTrackArray: false });
      volumioFormated.push({ type: 'title', title: 'Play Music Tracks', availableListViews: ["list"], items: songList });
      volumioFormated.push({ type: 'title', title: 'Play Music Artists', availableListViews: ["list", "grid"], items: artistList });
      volumioFormated.push({ type: 'title', title: 'Play Music Albums', availableListViews: ["list", "grid"], items: albumsList });
      volumioFormated.push({ type: 'title', title: 'Play Music Playlists', availableListViews: ["list"], items: playlist });
      defer.resolve(volumioFormated);
    }
  });
  return defer.promise;
}

function getArtistsFromList(entityArray, info) {
  var list = [];
  if (!info.isArtistList) {
    list = entityArray.reduce(function (acc, entity) {
      if (entity.type === '2') {// for artist type string is 2.
        acc.push(getFormatedArtistInfo(entity.artist));
      }
      return acc;
    }, []);
  } else {
    list = entityArray.reduce(function (acc, artist) {
      acc.push(getFormatedArtistInfo(artist));
      return acc;
    }, []);
  }
  return list;
}

function getFormatedArtistInfo(artist) {
  return {
    service: 'googleplaymusic',
    type: 'folder',
    title: artist.name,
    albumart: artist.artistArtRef,
    uri: 'googleplaymusic:artist:' + artist.artistId
  };
}

/**
 * @param  {} entityArray
 * @param  {} info
 */
function getAlbumsFromList(entityArray, info) {
  var list = [];
  if (!info.isAlbumList) {
    list = entityArray.reduce(function (acc, entity) {
      if (entity.type === '3') {// for album type string is 3.
        acc.push(getFormatedAlbumInfo(entity.album));
      }
      return acc;
    }, []);
  } else {
    list = entityArray.reduce(function (acc, album) {
      acc.push(getFormatedAlbumInfo(album));
      // {
      //   "kind": "sj#album",
      //   "name": "7",
      //   "albumArtist": "Beach House",
      //   "albumArtRef": "http://lh3.googleusercontent.com/lTFT1RfhSsC2RG_wJoPKhs2AdRBHyfryVLAwAIFRysxnkM4vOj93-23deMFI_QfpMAL6AEs-",
      //   "albumId": "B7ae2tkhu6f6qddwjl3f3ms2u3y",
      //   "artist": "Beach House",
      //   "artistId": [
      //   "Ajsyy36ejz77nwll5vpgey4m5ca"
      //   ],
      //   "description_attribution": {
      //   "kind": "sj#attribution",
      //   "source_title": "Wikipedia",
      //   "source_url": "https://en.wikipedia.org/wiki/7_(Beach_House_album)",
      //   "license_title": "Creative Commons Attribution CC-BY-SA 4.0",
      //   "license_url": "http://creativecommons.org/licenses/by-sa/4.0/legalcode"
      //   },
      //   "year": 2018
      //   },
      return acc;
    }, []);
  }
  return list;
}

function getFormatedAlbumInfo(album) {
  // To reder correctly on the volumio gui, we need following kind of predefined album object structure.
  return {
    service: 'googleplaymusic',
    type: 'folder',
    title: album.name,
    albumart: album.albumArtRef,
    uri: 'googleplaymusic:album:' + album.albumId
  };
}

function getPlaylistsFromList(entityArray) {
  var list = [];
  for (var i in entityArray) {
    var entity = entityArray[i];
    if (entity.type === '4') {// for playlist type string is 4.
      list.push({
        service: 'googleplaymusic',
        type: 'folder',
        title: entity.playlist.name,
        albumart: entity.playlist.ownerProfilePhotoUrl,
        uri: 'googleplaymusic:shared:playlist:' + entity.playlist.shareToken
      });
    }
  }
  return list;
}

function getTracksFromList(googlePlayMusic, entityArray, info) {
  var list = [];
  if (!info.isTrackArray) {
    list = entityArray.reduce(function (acc, entity) {
      if (entity.type === '1') {// for track type string is 1.
        googlePlayMusic.tracks.push(entity.track);
        acc.push(getFormatedTrackInfo(entity.track));
      }
      return acc;
    }, []);
  } else {
    list = entityArray.reduce(function (acc, track) {
      googlePlayMusic.tracks.push(track);
      acc.push(getFormatedTrackInfo(track));
      return acc;
    }, []);
  }
  // for (var i in entityArray) {
  //   var entity = entityArray[i];
  //   if (entity.type === '1') {// for track type string is 1.
  //     googlePlayMusic.tracks.push(entity.track);
  //     list.push({
  //       service: 'googleplaymusic',
  //       type: 'song',
  //       title: entity.track.title,
  //       artist: entity.track.artist,
  //       album: entity.track.album,
  //       albumart: entity.track.albumArtRef[0].url,
  //       uri: 'googleplaymusic:search:track:' + entity.track.storeId
  //     });
  //   }
  // }
  // googlePlayMusic.tracks = googlePlayMusic.tracks.concat(list);
  return list;
}

function getFormatedTrackInfo(track) {
  return {
    service: 'googleplaymusic',
    type: 'song',
    title: track.title,
    artist: track.artist,
    album: track.album,
    albumart: track.albumArtRef[0].url,
    uri: 'googleplaymusic:search:track:' + track.storeId
  };
}

function retrieveArtistData(service, artistId) {
  var defer = libQ.defer();
  service.playMusic.getArtist(artistId, true, 20, 5, function (error, response) { // second argument about returning albums of artist,the third parameter is for returned top songs for artist
    if (error) {
      defer.reject(error);
    } else {
      console.log('response for artist api', JSON.stringify(response, undefined, 4));
      var volumioFormated = {
        "navigation": {
          "isSearchResult": true,
          "lists": []
        }
      };
      var artistCollection = volumioFormated.navigation.lists;
      var artistList = getArtistsFromList(response.related_artists, { isArtistList: true });
      var albumsList = getAlbumsFromList(response.albums, { isAlbumList: true });
      var topTrackList = getTracksFromList(service, response.topTracks, { isTrackArray: true });
      artistCollection.push({ type: 'title', title: 'Artist Tracks', availableListViews: ["list"], items: topTrackList });
      artistCollection.push({ type: 'title', title: 'Related Artists', availableListViews: ["list", "grid"], items: artistList });
      artistCollection.push({ type: 'title', title: 'Artist Albums', availableListViews: ["list", "grid"], items: albumsList });
      defer.resolve(volumioFormated);
    }
  });
  return defer.promise;
}
// TODO: Remove follow commented code in refactor, if it is not been used yet.
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
  searchQuery: searchQuery,
  retrieveArtistData: retrieveArtistData,
};
