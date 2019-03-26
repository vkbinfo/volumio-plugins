"use strict";
var libQ = require("kew");
var fs = require("fs-extra");
var config = new (require("v-conf"))();
var exec = require("child_process").exec;
var execSync = require("child_process").execSync;
var PLAY_MUSIC = require("playmusic");

var PLAY_MUSIC_CONSTANTS = require('./playMusic/playMusicConstants');
var uriHandler = require('./uriHandler');
var playMusicCore = require('./playMusic/playMusicCore');
var playMusicSearch = require('./playMusic/playMusicSearch');
var playMusicUtility = require('./playMusic/playMusicUtility');
var playActions = require('./playMusic/playActions');

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

googleplaymusic.prototype.addToBrowseSources = function () {
  var self = this;
  var data = PLAY_MUSIC_CONSTANTS.playMusicBrowseWindowOptions;
  self.commandRouter.volumioAddToBrowseSources(data);
};

googleplaymusic.prototype.saveGoogleAccount = playMusicCore.saveGoogleAccount;

googleplaymusic.prototype.handleBrowseUri = uriHandler.handleBrowseUri;

// Exploding uri for further music action like returning playlist songs to add into queue.
googleplaymusic.prototype.explodeUri = uriHandler.explodeUri;


googleplaymusic.prototype.renderAlbumTracks = function (curUri) {
  var self = this;
  var defer = libQ.defer();
  var albumId = curUri.split(':').pop();
  var response = PLAY_MUSIC_CONSTANTS.volumioExpectedObjectStructure;
  response.navigation.prev.uri = curUri; // setting previous uri for navigation
  playMusicCore.getAlbumTracks(self, albumId)
    .then(function (tracks) {
      response.navigation.lists[0].items = tracks;
      defer.resolve(response);
    })
    .fail(function (error) {
      self.commandRouter.pushToastMessage(
        "error",
        "Error Getting Album Tracks",
        error
      );
      defer.reject(response);
    });
  return defer.promise;
};

googleplaymusic.prototype.getArtistData = function (curUri) {
  var self = this;
  var artistId = curUri.split(':').pop();
  var defer = libQ.defer();
  playMusicSearch.getArtistData(self, artistId).then(function (categoryData) {
    defer.resolve(categoryData);
  }).fail(function (error) {
    self.commandRouter.pushToastMessage(
      "error",
      "Error Getting Artist data",
      error
    );
    console.error('Error getting song based on search query from Google Play Music Server.', error);
    defer.reject(error);
  });
  return defer.promise;
};


googleplaymusic.prototype.clearAddPlayTrack = function (track) {
  var self = this;
  var defer = libQ.defer();
  var storeId = track.uri.split(':').pop();
  self.playMusic.getStreamUrl(storeId, function (error, stream) {
    if (error) {
      self.commandRouter.pushToastMessage(
        "error",
        "Error gettting stream url",
        error
      );
      return console.error('Error gettting stream url', error);
    }
    self.playStreamUrl(stream)
      .then(function () {
        defer.resolve();
      })
      .fail(function (error) {
        console.error('Failed to Play song from Stream url ' + stream, error);
        defer.reject(error);
      });
  });
  return defer.promise;
};

googleplaymusic.prototype.playStreamUrl = function (streamUrl) {
  var self = this;
  return self.mpdPlugin.sendMpdCommand('stop', []) // sending command to stop current playing song.
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
    });
};


googleplaymusic.prototype.seek = playActions.seek;

googleplaymusic.prototype.next = playActions.next;

googleplaymusic.prototype.previous = playActions.previous;

googleplaymusic.prototype.stop = playActions.stop;

googleplaymusic.prototype.pause = playActions.pause;

googleplaymusic.prototype.resume = playActions.resume;

googleplaymusic.prototype.getState = playActions.getState;

googleplaymusic.prototype.parseState = playActions.parseState;


googleplaymusic.prototype.pushState = function (state) {
  this.pushConsoleMessage("googleplaymusic::pushState");
  return this.commandRouter.servicePushState(state, this.servicename);
};

googleplaymusic.prototype.pushConsoleMessage = function (message) {
  this.commandRouter.pushConsoleMessage("[" + Date.now() + "] " + message);
};

googleplaymusic.prototype.getAlbumArt = function (data, path) {
  var artist, album;
  if (data != undefined && data.path != undefined) {
    path = data.path;
  }
  var web;
  if (data != undefined && data.artist != undefined) {
    artist = data.artist;
    album = (data.album != undefined) ? data.album : data.artist;
    web = "?web=" +
      nodetools.urlEncode(artist) +
      "/" +
      nodetools.urlEncode(album) +
      "/large";
  }
  return getStructuredAlbumUrl(web, path);
}

function getStructuredAlbumUrl(web, path) {
  var url = "/albumart";
  if (web != undefined) url = url + web;
  if (web != undefined && path != undefined) url = url + "&";
  else if (path != undefined) url = url + "?";
  if (path != undefined) url = url + "path=" + nodetools.urlEncode(path);
  return url;
}


googleplaymusic.prototype.search = playMusicSearch.search;

// googleplaymusic.prototype._searchArtists = function (results) { };

// googleplaymusic.prototype._searchAlbums = function (results) { };

// googleplaymusic.prototype._searchPlaylists = function (results) { };

// googleplaymusic.prototype._searchTracks = function (results) { };

googleplaymusic.prototype.goto = function (data) {
  var self = this;
  var defer = libQ.defer();
  // Handle go to artist and go to album function
  return defer.promise;
};
