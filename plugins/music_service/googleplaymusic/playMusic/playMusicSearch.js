var libQ = require("kew");

/**
 * @param  {} query An object that contains search string to send to google play music server
 */
function search(query) {
  var service = this;
  var defer = libQ.defer();
  searchQuery(service, query.value).then(function (categoryData) {
    defer.resolve(categoryData);
  }).fail(function (error) {
    console.error('Error getting song based on search query from Google Play Music Server.', error);
    defer.reject(error);
  });
  return defer.promise;
}

/**
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 * @param  {} queryString String that will be search in the google play music database.
 */
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

/**
 * @param  {} entityArray A collection of items, that may or may not contain different kind of data( Ex: Artist, Album, Tracks etc...)
 * @param  {} info Information about the type of data that we are looking in the array.
 */
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

/**
 * This functions retreives required data from an artist data object.
 * @param  {} artist An object that contains artist Data.
 */
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
 * @param  {} entityArray A collection of items, that may or may not contain different kind of data( Ex: Artist, Album, Tracks etc...)
 * @param  {} info Information about the type of data that we are looking in the array.
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
      return acc;
    }, []);
  }
  return list;
}

/**
 * This functions retreives required data for an album from an album data object.
 * @param  {} album An object that contains album Data.
 */
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

/**
 * This functions retreives playlists data from a array of different data
 * @param  {} entityArray A collection of items, that may or may not contain different kind of data( Ex: Artist, Album, Tracks etc...)
 */
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

/**
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 * @param  {} entityArray A collection of items, that may or may not contain different kind of data( Ex: Artist, Album, Tracks etc...)
 * @param  {} info Information about the entityArray wethere all items are tracks/songs or not.
 */
function getTracksFromList(service, entityArray, info) {
  var list = [];
  if (!info.isTrackArray) {
    list = entityArray.reduce(function (acc, entity) {
      if (entity.type === '1') {// for track type string is 1.
        service.tracks.push(entity.track);
        acc.push(getFormatedTrackInfo(entity.track));
      }
      return acc;
    }, []);
  } else {
    list = entityArray.reduce(function (acc, track) {
      service.tracks.push(track);
      acc.push(getFormatedTrackInfo(track));
      return acc;
    }, []);
  }
  return list;
}

/**
 * This function gets required filed from track object and converts it into a volumio understandable object format.
 * @param  {} track a object that holds information about a track.
 */
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

/**
 * @param  {} service google play music service object that holds information about current music player state and some functions references.
 * @param  {} artistId artist id which data has beeen requested through this function
 */
function getArtistData(service, artistId) {
  var defer = libQ.defer();
  service.playMusic.getArtist(artistId,
    true, /**boolean value for album return */
    20, /**total tracks that will be returned in this api*/
    5, /*total related artist that will be returned */
    function (error, response) {
      if (error) {
        defer.reject(error);
      } else {
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

module.exports = {
  search: search,
  getArtistData: getArtistData,
};
