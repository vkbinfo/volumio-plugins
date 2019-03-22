"use strict";

var libQ = require("kew");
var fs = require("fs-extra");
var config = new (require("v-conf"))();
var exec = require("child_process").exec;
var execSync = require("child_process").execSync;
var PLAY_MUSIC = require("playmusic");

let PLAY_MUSIC_CONSTANTS = require('./playMusicConstants');

module.exports = googleplaymusic;
function googleplaymusic(context) {
  var self = this;
  self.context = context;
  self.commandRouter = self.context.coreCommand;
  self.logger = self.context.logger;
  self.configManager = self.context.configManager;
  self.playMusic = new PLAY_MUSIC();
  self.playListSongs = [];
  self.stationTracks = [];
}

googleplaymusic.prototype.onVolumioStart = function () {
  var self = this;
  var configFile = self.commandRouter.pluginManager.getConfigurationFile(
    self.context,
    "config.json"
  );
  self.config = new (require("v-conf"))();
  self.config.loadFile(configFile);
  if (self.config.get('bitrate') === true)
    self.samplerate = "320Kbps";
  else self.samplerate = "128Kbps";
  return libQ.resolve();
};

googleplaymusic.prototype.onStart = function () {
  var self = this;
  var defer = libQ.defer();
  // Once the Plugin has successfull started resolve the promise
  self.mpdPlugin = self.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
  self.addToBrowseSources();
  let masterToken = self.config.get("masterToken");
  let androidId = self.config.get("androidId");
  let googleAuthData = { masterToken: masterToken, androidId: androidId };
  self.playMusic.init(googleAuthData, function (error) {
    if (error) {
      self.commandRouter.pushToastMessage(
        "error",
        "Google Music Login Failed",
        error
      );
    }
  });
  defer.resolve();

  return defer.promise;
};

googleplaymusic.prototype.onStop = function () {
  var self = this;
  var defer = libQ.defer();

  // Once the Plugin has successfull stopped resolve the promise
  defer.resolve();

  return libQ.resolve();
};

googleplaymusic.prototype.onRestart = function () {
  var self = this;
  // Optional, use if you need it
};

googleplaymusic.prototype.saveGoogleAccount = function (data) {
  var self = this;
  var defer = libQ.defer();
  let email = data["email"];
  let password = data["password"];
  let bitrate = data["bitrate"];
  console.log("Google logging in...");

  self.playMusic.login({ email: email, password: password }, function (
    err,
    authTokenData
  ) {
    if (err) {
      console.error("Google login failed", err);
      defer.reject({});
      return defer.promise;
    }
    self.commandRouter.pushToastMessage(
      "success",
      "Configuration update",
      "You have successfully signed in the google account."
    );
    self.config.set("email", email);
    self.config.set("bitrate", bitrate);
    self.config.set("masterToken", authTokenData.masterToken);
    self.config.set("androidId", authTokenData.androidId);
  });
  return defer.promise;
};

// Configuration Methods -----------------------------------------------------------------------------

googleplaymusic.prototype.getUIConfig = function () {
  var defer = libQ.defer();
  var self = this;

  var lang_code = self.commandRouter.sharedVars.get("language_code");

  self.commandRouter
    .i18nJson(
      __dirname + "/i18n/strings_" + lang_code + ".json",
      __dirname + "/i18n/strings_en.json",
      __dirname + "/UIConfig.json"
    )
    .then(function (uiconf) {
      defer.resolve(uiconf);
    })
    .fail(function () {
      defer.reject(new Error());
    });

  return defer.promise;
};

googleplaymusic.prototype.getConfigurationFiles = function () {
  return ["config.json"];
};

googleplaymusic.prototype.setUIConfig = function (data) {
  var self = this;
  //Perform your installation tasks here
};

googleplaymusic.prototype.getConf = function (varName) {
  var self = this;
  //Perform your installation tasks here
};

googleplaymusic.prototype.setConf = function (varName, varValue) {
  var self = this;
  //Perform your installation tasks here
};

// Playback Controls ---------------------------------------------------------------------------------------
// If your plugin is not a music_sevice don't use this part and delete it

googleplaymusic.prototype.addToBrowseSources = function () {
  // Use this function to add your music service plugin to music sources
  var self = this;
  var data = {
    name: "Google Play Music",
    uri: "googleplaymusic",
    plugin_type: "music_service",
    plugin_name: "googleplaymusic"
  };
  self.commandRouter.volumioAddToBrowseSources(data);
};

googleplaymusic.prototype.handleBrowseUri = function (curUri) {
  var self = this;
  var listItemsToRender;
  if (curUri == "googleplaymusic") {
    // get's first time options, when we click on the google play music in the browse section.
    listItemsToRender = libQ.resolve(PLAY_MUSIC_CONSTANTS.availableFeatures);
  } else if (curUri.startsWith("googleplaymusic/playlists")) {
    if (curUri == "googleplaymusic/playlists") {
      listItemsToRender = self.getPlaylists();
    } else {
      listItemsToRender = self.getSongsInPlaylist(curUri);
    }
  } else if (curUri.startsWith("googleplaymusic/stations")) {
    if (curUri == "googleplaymusic/stations") {
      listItemsToRender = self.getStations();
    } else {
      listItemsToRender = self.getSongsInStation(curUri);
    }
  } else if (curUri.startsWith("googleplaymusic/featuredplaylists")) {
    listItemsToRender = self.featuredPlaylists(curUri);
  } else if (curUri.startsWith("googleplaymusic:user:")) {
    listItemsToRender = self.listWebPlaylist(curUri);
  } else if (curUri.startsWith("googleplaymusic/new")) {
    listItemsToRender = self.listWebNew(curUri);
  } else if (curUri.startsWith("googleplaymusic/categories")) {
    listItemsToRender = self.listWebCategories(curUri);
  } else if (curUri.startsWith("googleplaymusic:album")) {
    listItemsToRender = self.listWebAlbum(curUri);
  } else if (curUri.startsWith("googleplaymusic/category")) {
    listItemsToRender = self.listWebCategory(curUri);
  } else if (curUri.startsWith("googleplaymusic:artist:")) {
    listItemsToRender = self.listWebArtist(curUri);
  }
  return listItemsToRender;
};


googleplaymusic.prototype.getPlaylists = function () {
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
    let playLists = response.data.items;
    let volumioFormatList = {
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
    let playListAccumulator = volumioFormatList.navigation.lists[0].items;
    for (let i = 0; i < playLists.length; i++) {
      let formatedPlaylistData = {
        service: 'googleplaymusic',
        type: "folder",
        title: playLists[i]["name"],
        icon: "fa fa-list-ol",
        uri: "googleplaymusic/playlists/" + playLists[i]['id'],
      };
      playListAccumulator.push(formatedPlaylistData);
    }
    defer.resolve(volumioFormatList);
    self.playMusic.getPlayListEntries(function (error, playListSongs) {
      if (error) {
        console.error('Error getting playlist songs');
      }
      self.playListSongs = playListSongs.data.items;
    })
  });
  return defer.promise;
};

googleplaymusic.prototype.getSongsInPlaylist = function (curUri) {
  // curUri format:-  googleplaymusic/playlists/e757c0eb-2391-4f9b-a75a-f214476e94b4
  var self = this;
  var defer = libQ.defer();
  let playListId = curUri.split('/').pop();
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
  let playListSongs = self.playListSongs;
  for (let i in playListSongs) {
    let track = playListSongs[i];
    if (track.playlistId === playListId) {
      let trackData = track.track;
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
  setTimeout(() => { defer.resolve(response); }, 50)
  return defer.promise
}

googleplaymusic.prototype.getStations = function () {
  var self = this;
  var defer = libQ.defer();
  self.playMusic.getStations(function (error, response) {
    if (error) {
      defer.reject(
        "unsuccessfull operation: Getting music stations from google server!"
      );
      return defer.promise;
    }
    let stations = response.data.items;
    let volumioFormatList = {
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
    let stationsArray = volumioFormatList.navigation.lists[0].items;
    for (let i = 0; i < stations.length; i++) {
      let formatedStationData = {
        service: 'googleplaymusic',
        type: "folder",
        title: stations[i]["name"],
        icon: "fa fa-list-ol",
        uri: "googleplaymusic/stations/" + stations[i]['id'],
      };
      stationsArray.push(formatedStationData);
    }
    defer.resolve(volumioFormatList);
  });
  return defer.promise;
}

googleplaymusic.prototype.getSongsInStation = function (curUri) {
  // curUri format:-  googleplaymusic/playlists/e757c0eb-2391-4f9b-a75a-f214476e94b4
  var self = this;
  var defer = libQ.defer();
  let stationId = curUri.split('/').pop();
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
  self.getSongsByStationId(stationId).then(function (stationTracks) {
    self.stationTracks = stationTracks;
    response.navigation.lists[0].items = stationTracks;
    defer.resolve(response);
  }).fail(function (error) {
    defer.reject(error)
  });
  return defer.promise
}

// googleplaymusic.prototype.listPlaylist = function (uri) {
//   let playlistIndex = 
// }
// Define a method to clear, add, and play an array of tracks
googleplaymusic.prototype.clearAddPlayTrack = function (track) {
  var self = this;
  let streamUrl = '';
  console.log('getting track for stream uri', track);
  self.playMusic.getStreamUrl(track.uri, function (error, stream) {
    if (error) {
      return console.error('Error gettting stream data', error);
    }
    streamUrl = stream;
    // sending command to stop current playing song.
    self.mpdPlugin.sendMpdCommand('stop', [])
      .then(function () {
        return self.mpdPlugin.sendMpdCommand('clear', []);
      })
      .then(function (values) {
        return self.mpdPlugin.sendMpdCommand('load "' + streamUrl + '"', []);
      })
      .fail(function (data) {
        return self.mpdPlugin.sendMpdCommand('add "' + streamUrl + '"', []);
      })
      .then(function () {
        self.mpdPlugin.clientMpd.on('system', function (status) {
          var timeStart = Date.now();
          self.logger.info('Google Play Music: ' + status);
          self.mpdPlugin.getState().then(function (state) {
            state.trackType = "Google Play Music";
            return self.commandRouter.stateMachine.syncState(state, "googleplaymusic");
          });
        });
        return self.mpdPlugin.sendMpdCommand('play', []).then(function () {
          self.commandRouter.pushConsoleMessage("googleplaymusic::After Play");
          return self.mpdPlugin.getState().then(function (state) {
            state.trackType = "Google Play Music";
            self.commandRouter.pushConsoleMessage("googleplaymusic: " + JSON.stringify(state));
            return self.commandRouter.stateMachine.syncState(state, "googleplaymusic");
          });
        });
      })
      .fail(function (e) {
        return defer.reject(new Error());
      });
  });
};

googleplaymusic.prototype.seek = function (timepos) {
  this.commandRouter.pushConsoleMessage(
    "[" + Date.now() + "] " + "googleplaymusic::seek to " + timepos
  );

  // return this.sendSpopCommand("seek " + timepos, []);
};

// Stop
googleplaymusic.prototype.stop = function () {
  var self = this;
  self.commandRouter.pushConsoleMessage(
    "[" + Date.now() + "] " + "googleplaymusic::stop"
  );
};

// Spop pause
googleplaymusic.prototype.pause = function () {
  var self = this;
  self.commandRouter.pushConsoleMessage(
    "[" + Date.now() + "] " + "googleplaymusic::pause"
  );
};

// Get state
googleplaymusic.prototype.getState = function () {
  var self = this;
  self.commandRouter.pushConsoleMessage(
    "[" + Date.now() + "] " + "googleplaymusic::getState"
  );
};

//Parse state
googleplaymusic.prototype.parseState = function (sState) {
  var self = this;
  self.commandRouter.pushConsoleMessage(
    "[" + Date.now() + "] " + "googleplaymusic::parseState"
  );

  //Use this method to parse the state and eventually send it with the following function
};

// Announce updated State
googleplaymusic.prototype.pushState = function (state) {
  var self = this;
  self.commandRouter.pushConsoleMessage(
    "[" + Date.now() + "] " + "googleplaymusic::pushState"
  );

  return self.commandRouter.servicePushState(state, self.servicename);
};

googleplaymusic.prototype.explodeUri = function (uri) {
  var self = this;
  var defer = libQ.defer();
  var response = [];
  // Mandatory: retrieve all info for a given URI
  if (uri.includes('playlist')) {
    // getting songs for a particular playlist to add in queue.
    self.logger.info("googleplaymusic::explodeUri Playlist: " + uri);
    let playlistId = uri.split('/').pop();
    response = self.addPlaylistToQueue(playlistId); // getting playlist's songs from already stored songs(self.playListSongs) data.
  } else if (uri.includes('station')) {
    if (uri.includes('googleplaymusic:station:track')) {
      let trackData = self.getTrackInfo(uri);
      response.push(trackData);
    } else {
      // getting songs for a particular station to add in queue.
      self.logger.info("googleplaymusic::explodeUri Station: " + uri);
      let stationId = uri.split('/').pop();
      return self.addStationSongsToQueue(stationId); // returns a promise don't need to create something on the defer vaiable.
    }
  } else {
    let trackData = self.getTrackInfo(uri);
    response.push(trackData);
  }
  defer.resolve(response);
  return defer.promise;
};

googleplaymusic.prototype.addPlaylistToQueue = function (playlistId) {
  let self = this;
  let songsInPlaylist = [];
  for (let i = 0; i < self.playListSongs.length; i++) {
    if (self.playListSongs[i].playlistId === playlistId) {
      let track = self.playListSongs[i];
      let trackId = track.trackId;
      let trackInfo = track.track;
      // TODO: make single function for getting volumio for data of a song.
      let volumioFormatSongData = {
        uri: trackId,
        service: 'googleplaymusic',
        type: 'song',
        name: trackInfo.title,
        title: trackInfo.title,
        artist: trackInfo.artist,
        album: trackInfo.album,
        duration: trackInfo.durationMillis / 1000,
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

googleplaymusic.prototype.addStationSongsToQueue = function (stationId) {
  var self = this;
  var defer = libQ.defer();
  self.getSongsByStationId(stationId).then(function (stationTracks) {
    self.stationTracks = stationTracks;
    // console.log('Station tracks that I am getting on tracks on load of playlist', stationTracks);
    defer.resolve(stationTracks);
  }).fail(function (error) {
    console.log(error);
    defer.reject(error);
  })
  return defer.promise;
}

googleplaymusic.prototype.getSongsByStationId = function (stationId) {
  var self = this;
  let defer = libQ.defer();
  let stationTracks = [];
  console.log('stationId', stationId);
  this.playMusic.getStationTracks(stationId, 25, function (error, apiResponse) {
    if (error) {
      console.error(`Error getting station tracks: ${error}`);
      defer.reject(`Error getting station tracks: ${error}`)
      return defer.promise;
    }
    let stationTracksArray = apiResponse.data.stations[0].tracks;
    for (let i in stationTracksArray) {
      let track = stationTracksArray[i];
      // let trackData = track.track;
      console.log('track', track);
      console.log('track title ', track.title);
      stationTracks.push({
        service: 'googleplaymusic', // plugin name
        type: 'song',
        trackId: track.nid, // nid works same as trackId, when we will try to get the streamurl from google.(for station songs array, google doesn't return trackId, but it does for playlist songs)
        name: track.title,
        title: track.title,
        artist: track.artist,
        album: track.album,
        albumArtRef: track.albumArtRef,
        albumart: track.albumArtRef[0].url,
        samplerate: self.samplerate,
        duration: track.durationMillis / 1000,
        bitdepth: '16 bit',
        trackType: 'googleplaymusic',
        uri: 'googleplaymusic:station:track:' + track.nid,
      });
    }
    defer.resolve(stationTracks);
  })
  return defer.promise
}

googleplaymusic.prototype.getTrackInfo = function (uri) {
  var self = this;
  console.log('uri in getting track info', uri);
  let trackId = uri.split(':').pop();
  let trackInfo;
  console.log('The station tracks', JSON.stringify(self.stationTracks, undefined, 4));
  if (uri.includes('station')) {
    console.log('a song data', self.stationTracks[0])
    for (let i = 0; i < self.stationTracks.length; i++) {
      // getting station song from the stored station songs.
      console.log('Getting station id', self.stationTracks[i].trackId);
      if (self.stationTracks[i].trackId === trackId) {
        trackInfo = self.stationTracks[i];
        console.log('Track Info that I got for clicking on the station song', trackInfo);
        break;
      }
    }
  } else {
    for (let i = 0; i < self.playListSongs.length; i++) {
      if (self.playListSongs[i].trackId === trackId) {
        trackInfo = self.playListSongs[i].track;
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
    duration: trackInfo.durationMillis / 1000,
    albumart: trackInfo.albumArtRef[0].url,
    samplerate: self.samplerate,
    bitdepth: '16 bit',
    trackType: 'googleplaymusic'
  };
}

googleplaymusic.prototype.getAlbumArt = function (data, path) {
  var artist, album;

  if (data != undefined && data.path != undefined) {
    path = data.path;
  }

  var web;

  if (data != undefined && data.artist != undefined) {
    artist = data.artist;
    if (data.album != undefined) album = data.album;
    else album = data.artist;

    web =
      "?web=" +
      nodetools.urlEncode(artist) +
      "/" +
      nodetools.urlEncode(album) +
      "/large";
  }

  var url = "/albumart";

  if (web != undefined) url = url + web;

  if (web != undefined && path != undefined) url = url + "&";
  else if (path != undefined) url = url + "?";

  if (path != undefined) url = url + "path=" + nodetools.urlEncode(path);

  return url;
};

googleplaymusic.prototype.search = function (query) {
  var self = this;
  var defer = libQ.defer();

  // Mandatory, search. You can divide the search in sections using following functions

  return defer.promise;
};

googleplaymusic.prototype._searchArtists = function (results) { };

googleplaymusic.prototype._searchAlbums = function (results) { };

googleplaymusic.prototype._searchPlaylists = function (results) { };

googleplaymusic.prototype._searchTracks = function (results) { };

googleplaymusic.prototype.goto = function (data) {
  var self = this;
  var defer = libQ.defer();

  // Handle go to artist and go to album function

  return defer.promise;
};
