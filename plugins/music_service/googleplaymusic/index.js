"use strict";

var libQ = require("kew");
var fs = require("fs-extra");
var config = new (require("v-conf"))();
var exec = require("child_process").exec;
var execSync = require("child_process").execSync;
var PLAY_MUSIC = require("playmusic");

// TODO: Remove it, if it is still commented out.
// PLAY_MUSIC.prototype.getPlayListById = function () {
//   let url = `https://play.google.com/music/services/loaduserplaylist?u=1&format=jsarray&xt=CjUKATASMEFNLVdiWGcxRGNVa3FLakI2N2lkeWRid1BKRUJnM0tfOEE6MTU1Mjg5Njg4NDQ5OAo1CgExEjBBTS1XYlhpZTN6LVVobHNJQWF0by1PZUxjeldnY2xBZi1nOjE1NTI4OTY5MTc0MjA%3D&dv=235752084&obfid=12329453552080486674`
// }

module.exports = googleplaymusic;
function googleplaymusic(context) {
  var self = this;

  this.context = context;
  this.commandRouter = this.context.coreCommand;
  this.logger = this.context.logger;
  this.configManager = this.context.configManager;
  this.playMusic = new PLAY_MUSIC();
  this.playListSongs = []
}

googleplaymusic.prototype.onVolumioStart = function () {
  var self = this;
  var configFile = this.commandRouter.pluginManager.getConfigurationFile(
    this.context,
    "config.json"
  );
  this.config = new (require("v-conf"))();
  this.config.loadFile(configFile);

  return libQ.resolve();
};

googleplaymusic.prototype.onStart = function () {
  var self = this;
  var defer = libQ.defer();
  // Once the Plugin has successfull started resolve the promise
  self.addToBrowseSources();
  let masterToken = self.config.get("masterToken");
  let androidId = self.config.get("androidId");
  let googleAuthData = { masterToken: masterToken, androidId: androidId };
  console.log("google login data", googleAuthData);
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
  self.config.set("email", email);
  self.config.set("password", password);
  self.config.set("bitrate", bitrate);
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
    console.log("returned token", authTokenData);
    // place code here
    // // place code here
    // console.log('Google play Music', playMusic.getPlayListEntries(function (err, playlists){
    // 	if(err) console.log('error in getting playlist', err);
    // 	console.log('Playlists', JSON.stringify(playlists, undefined, 2) );
    // }));
    // 	this.playMusic.getAllTracks(function(err, library) {
    // 		var song = library.data.items.pop();
    // 		console.log(song);
    // 		playMusic.getStreamUrl(song.id, function(err, streamUrl) {
    // 				console.log('streamurl', streamUrl);
    // 				defer.resolve({});
    // 		});
    // });
  });
  return defer.promise;
};

// Configuration Methods -----------------------------------------------------------------------------

googleplaymusic.prototype.getUIConfig = function () {
  var defer = libQ.defer();
  var self = this;

  var lang_code = this.commandRouter.sharedVars.get("language_code");

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
  var data = {
    name: "Googel Play Music",
    uri: "googleplaymusic",
    plugin_type: "music_service",
    plugin_name: "googleplaymusic"
  };
  this.commandRouter.volumioAddToBrowseSources(data);
};

googleplaymusic.prototype.handleBrowseUri = function (curUri) {
  var self = this;
  var self = this;

  //self.commandRouter.logger.info(curUri);
  var response;
  if (curUri == "googleplaymusic") {
    response = libQ.resolve({
      navigation: {
        lists: [
          {
            availableListViews: ["list"],
            items: [
              {
                service: "spop",
                type: "googleplaymusic-category",
                title: "My Playlists",
                artist: "",
                album: "",
                icon: "fa fa-folder-open-o",
                uri: "googleplaymusic/playlists"
              },
              {
                service: "spop",
                type: "googleplaymusic-category",
                title: "Featured Playlists",
                artist: "",
                album: "",
                icon: "fa fa-folder-open-o",
                uri: "googleplaymusic/featuredplaylists"
              },
              {
                service: "spop",
                type: "googleplaymusic-category",
                title: "What's New",
                artist: "",
                album: "",
                icon: "fa fa-folder-open-o",
                uri: "googleplaymusic/new"
              },
              {
                service: "spop",
                type: "googleplaymusic-category",
                title: "Genres & Moods",
                artist: "",
                album: "",
                icon: "fa fa-folder-open-o",
                uri: "googleplaymusic/categories"
              }
            ]
          }
        ],
        prev: {
          uri: "googleplaymusic"
        }
      }
    });
  } else if (curUri.startsWith("googleplaymusic/playlists")) {
    if (curUri == "googleplaymusic/playlists") {
      response = self.getPlaylists();
    } else {
      response = self.getSongsInPlaylist(curUri);
    }
  } else if (curUri.startsWith("googleplaymusic/featuredplaylists")) {
    response = self.featuredPlaylists(curUri);
  } else if (curUri.startsWith("googleplaymusic:user:")) {
    response = self.listWebPlaylist(curUri);
  } else if (curUri.startsWith("googleplaymusic/new")) {
    response = self.listWebNew(curUri);
  } else if (curUri.startsWith("googleplaymusic/categories")) {
    response = self.listWebCategories(curUri);
  } else if (curUri.startsWith("googleplaymusic:album")) {
    response = self.listWebAlbum(curUri);
  } else if (curUri.startsWith("googleplaymusic/category")) {
    response = self.listWebCategory(curUri);
  } else if (curUri.startsWith("googleplaymusic:artist:")) {
    response = self.listWebArtist(curUri);
  }
  response.then(function (data) {
    console.log("returning response", JSON.stringify(data, undefined, 4));
  });
  return response;
};

googleplaymusic.prototype.getPlaylists = function () {
  console.log("I am getting playlist.. bro Just wait for few seconds.");
  var self = this;
  var defer = libQ.defer();

  console.log("calling google api for playlist");
  self.playMusic.getPlayLists(function (error, response) {
    if (error) {
      defer.reject(
        "unsuccessfull from getting music playlist from google server"
      );
      return console.error(
        "unsuccessfull from getting music playlist from google server"
      );
    }
    console.log(
      "PlayLists api response",
      JSON.stringify(response, undefined, 4)
    );
    let playLists = response.data.items;
    console.log("PlayLists =", JSON.stringify(playLists, undefined, 4));
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
        // service: 'spop',
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
      console.log('Yeah got the playlist songs', JSON.stringify(playListSongs.data.items[0], undefined, 4))
    })
  });
  return defer.promise;
};

googleplaymusic.prototype.getSongsInPlaylist = function (curUri) {
  //  googleplaymusic/playlists/e757c0eb-2391-4f9b-a75a-f214476e94b4

  var self = this;
  var defer = libQ.defer();
  let playListId = curUri.split('/')[2];
  var response = {
    navigation: {
      prev: {
        uri: curUri
      },
      "lists": [
        {
          "availableListViews": [
            "list"
          ],
          "items": [

          ]
        }
      ]
    }
  };
  let playListSongs = self.playListSongs
  for (let i in playListSongs) {
    let track = playListSongs[i];
    if (track.playlistId === playListId) {
      self.playMusic.getStreamUrl(track.trackId, function (error, streamUri) {
        if (error) {
          return console.error('Error gettting stream data');
        }
        let trackData = track.track
        response.navigation.lists[0].items.push({
          // service: 'spop',
          type: 'song',
          title: trackData.title,
          artist: trackData.artist,
          album: trackData.album,
          icon: 'fa fa-spotify',
          uri: streamUri,
        });
      })
    }
  }
  setTimeout(() => { defer.resolve(response); }, 3000)
  return defer.promise
}

// googleplaymusic.prototype.listPlaylist = function (uri) {
//   let playlistIndex = 
// }
// Define a method to clear, add, and play an array of tracks
googleplaymusic.prototype.clearAddPlayTrack = function (track) {
  var self = this;
  self.commandRouter.pushConsoleMessage(
    "[" + Date.now() + "] " + "googleplaymusic::clearAddPlayTrack"
  );

  self.commandRouter.logger.info(JSON.stringify(track));

  return self.sendSpopCommand("uplay", [track.uri]);
};

googleplaymusic.prototype.seek = function (timepos) {
  this.commandRouter.pushConsoleMessage(
    "[" + Date.now() + "] " + "googleplaymusic::seek to " + timepos
  );

  return this.sendSpopCommand("seek " + timepos, []);
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

  // Mandatory: retrieve all info for a given URI

  return defer.promise;
};

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
