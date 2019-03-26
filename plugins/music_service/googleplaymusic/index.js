"use strict";
var libQ = require("kew");
var fs = require("fs-extra");
var config = new (require("v-conf"))();
var exec = require("child_process").exec;
var execSync = require("child_process").execSync;
var PLAY_MUSIC = require("playmusic");

var PLAY_MUSIC_CONSTANTS = require('./playMusicConstants');
var playMusicCore = require('./playMusicCore');

module.exports = googleplaymusic;
function googleplaymusic(context) {
  var self = this;
  self.context = context;
  self.commandRouter = self.context.coreCommand;
  self.logger = self.context.logger;
  self.configManager = self.context.configManager;
  self.playMusic = new PLAY_MUSIC();
  self.tracks = [];
}

googleplaymusic.prototype.onVolumioStart = function () {
  var self = this;
  var configFile = self.commandRouter.pluginManager.getConfigurationFile(
    self.context,
    "config.json"
  );
  self.config = new (require("v-conf"))();
  self.config.loadFile(configFile);
  if (self.config.get('bitrate') === true) {
    self.samplerate = "320Kbps";
  } else {
    self.samplerate = "128Kbps";
  }
  return libQ.resolve();
};

googleplaymusic.prototype.onStart = function () {
  var self = this;
  var defer = libQ.defer();
  // Once the Plugin has successfull started resolve the promise
  self.mpdPlugin = self.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
  self.addToBrowseSources();
  var masterToken = self.config.get("masterToken");
  var androidId = self.config.get("androidId");
  var googleAuthData = { masterToken: masterToken, androidId: androidId };
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
  var email = data.email;
  var password = data.password;
  var bitrate = data.bitrate;
  console.log("Google logging in...");
  self.playMusic.login({ email: email, password: password }, function (err, authTokenData) {
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
  console.log('To be handle uri', curUri);
  if (curUri == "googleplaymusic") {
    // get's first time options, when we click on the google play music in the browse section.
    listItemsToRender = libQ.resolve(PLAY_MUSIC_CONSTANTS.availableFeatures);
  } else if (curUri.startsWith("googleplaymusic/playlists")) {
    if (curUri == "googleplaymusic/playlists") {
      listItemsToRender = self.getPlaylists(self);
    } else {
      listItemsToRender = self.getSongsInPlaylist(curUri, { shared: false });
    }
  } else if (curUri.includes('googleplaymusic:shared:playlist:')) {
    listItemsToRender = self.getSongsInPlaylist(curUri, { shared: true });
  } else if (curUri.startsWith("googleplaymusic/stations")) {
    if (curUri == "googleplaymusic/stations") {
      listItemsToRender = self.getStations();
    } else {
      listItemsToRender = self.getSongsInStation(curUri);
    }
  } else if (curUri.startsWith("googleplaymusic/featuredplaylists")) {
    listItemsToRender = self.featuredPlaylists(curUri);
  } else if (curUri.startsWith("googleplaymusic:album")) {
    listItemsToRender = self.renderAlbumTracks(curUri);
  } else if (curUri.startsWith("googleplaymusic:artist:")) {
    listItemsToRender = self.getArtistData(curUri);
  }
  return listItemsToRender;
};


googleplaymusic.prototype.getPlaylists = playMusicCore.getPlaylists;

googleplaymusic.prototype.getSongsInPlaylist = playMusicCore.getSongsInPlaylist;

googleplaymusic.prototype.getStations = playMusicCore.getStations;

googleplaymusic.prototype.getSongsInStation = playMusicCore.getSongsInStation;

googleplaymusic.prototype.renderAlbumTracks = function (curUri) {
  var self = this;
  var defer = libQ.defer();
  var albumId = curUri.split(':').pop();
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
  self.getAlbumTracks(self, albumId)
    .then(function (tracks) {
      response.navigation.lists[0].items = tracks;
      defer.resolve(response);
    })
    .fail(function (error) {
      defer.reject(response);
    });
  return defer.promise;
};

googleplaymusic.prototype.getArtistData = function (curUri) {
  var self = this;
  var artistId = curUri.split(':').pop();
  var defer = libQ.defer();
  playMusicCore.retrieveArtistData(self, artistId).then(function (categoryData) {
    defer.resolve(categoryData);
  }).fail(function (error) {
    console.error('Error getting song based on search query from Google Play Music Server.', error);
    defer.reject(error);
  });
  return defer.promise;
};


googleplaymusic.prototype.clearAddPlayTrack = function (track) {
  var self = this;
  var streamUrl = '';
  var defer = libQ.defer();
  var storeId = track.uri.split(':').pop();
  self.playMusic.getStreamUrl(storeId, function (error, stream) {
    if (error) {
      return console.error('Error gettting stream url', error);
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
  var consoleMessage = "googleplaymusic::seek to " + timepos;
  this.pushConsoleMessage(consoleMessage);
  // return this.sendSpopCommand("seek " + timepos, []);
};

// Stop
googleplaymusic.prototype.stop = function () {
  this.pushConsoleMessage("googleplaymusic::stop");
};

// Google play music pause
googleplaymusic.prototype.pause = function () {
  this.pushConsoleMessage("googleplaymusic::pause");
};

// Get state
googleplaymusic.prototype.getState = function () {
  this.pushConsoleMessage("googleplaymusic::getState");
};

//Parse state
googleplaymusic.prototype.parseState = function (sState) {
  this.pushConsoleMessage("googleplaymusic::parseState");
  //Use this method to parse the state and eventually send it with the following function
};

// Announce updated State
googleplaymusic.prototype.pushState = function (state) {
  this.pushConsoleMessage("googleplaymusic::pushState");
  return this.commandRouter.servicePushState(state, this.servicename);
};

googleplaymusic.prototype.pushConsoleMessage = function (message) {
  this.commandRouter.pushConsoleMessage("[" + Date.now() + "] " + message);
};

googleplaymusic.prototype.explodeUri = function (uri) {
  var self = this;
  var defer = libQ.defer();
  var response = [];
  var trackData;
  if (uri.includes('playlist')) {
    return self.handlePlaylistUri(uri);
  } else if (uri.includes('station')) {
    if (uri.includes('googleplaymusic:station:track')) {
      trackData = self.getTrackInfo(uri);
      response.push(trackData);
    } else {
      self.logger.info("googleplaymusic::explodeUri Station: " + uri);
      // getting songs for a particular station to add in queue.
      var stationId = uri.split('/').pop();
      return self.addStationSongsToQueue(stationId); // returns a promise don't need to create something on the defer vaiable.
    }
  } else if (uri.startsWith('googleplaymusic:album:')) {
    var albumId = uri.split(':').pop();
    return self.getAlbumTracks(self, albumId);
  } else {
    trackData = self.getTrackInfo(uri);
    response.push(trackData);
  }
  defer.resolve(response);
  return defer.promise;
};

googleplaymusic.prototype.handlePlaylistUri = function (uri) {
  var self = this;
  var response = [];
  var defer = libQ.defer();
  self.logger.info("googleplaymusic::explodeUri Playlist: " + uri);
  if (uri.includes('shared')) {
    var sharedPlaylistId = uri.split(':').pop();
    response = self.addPlaylistToQueue(sharedPlaylistId, { shared: true })
      .then(function (tracks) {
        defer.resolve(tracks);
      })
      .fail(function (error) {
        defer.reject(error);
      });
  } else {
    var playlistId = uri.split('/').pop();
    response = self.addPlaylistToQueue(playlistId, { shared: false })
      .then(function (tracks) {
        defer.resolve(tracks);
      })
      .fail(function (error) {
        defer.reject(error);
      });
  }
  return defer.promise;
};

googleplaymusic.prototype.addPlaylistToQueue = playMusicCore.addPlaylistToQueue;

googleplaymusic.prototype.addStationSongsToQueue = playMusicCore.addStationSongsToQueue;

// googleplaymusic.prototype.getSongsByStationId = playMusicCore.getSongsByStationId;

googleplaymusic.prototype.getAlbumTracks = playMusicCore.getAlbumTracks;
googleplaymusic.prototype.getTrackInfo = playMusicCore.getTrackInfo;

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
  playMusicCore.searchQuery(self, query.value).then(function (categoryData) {
    defer.resolve(categoryData);
  }).fail(function (error) {
    console.error('Error getting song based on search query from Google Play Music Server.', error);
    defer.reject(error);
  });
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
