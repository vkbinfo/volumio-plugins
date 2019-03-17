'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var PLAY_MUSIC = require('playmusic');


module.exports = googleplaymusic;
function googleplaymusic(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;
	this.playMusic = new PLAY_MUSIC();

}



googleplaymusic.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

    return libQ.resolve();
}

googleplaymusic.prototype.onStart = function() {
    var self = this;
	var defer=libQ.defer();
	// let googleAuthTokenData = self.config.get('authTokenData');
	// console.log('google auth token data', googleAuthTokenData);
	// self.playMusic.login(googleAuthTokenData);
	// Once the Plugin has successfull started resolve the promise
	self.addToBrowseSources();
	defer.resolve();

    return defer.promise;
};

googleplaymusic.prototype.onStop = function() {
    var self = this;
    var defer=libQ.defer();

    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();

    return libQ.resolve();
};

googleplaymusic.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
};

googleplaymusic.prototype.saveGoogleAccount = function(data) {
	var self = this;
	var defer = libQ.defer();
	let email =  data['email'];
	let password = data['password'];
	let bitrate = data['bitrate'];
	console.log('email', email);
	console.log('password', password)
	self.config.set('email', email);
	self.config.set('password', password);
	self.config.set('bitrate', bitrate);
console.log('email', email);
console.log('password', password);
console.log('Google logging in...');

self.playMusic.login({email: email, password: password}, function(err, authTokenData) {
	if(err) {
		console.error('Google login failed', err);
		defer.reject({})
		return defer.promise;
	}
	self.commandRouter.pushToastMessage('success', "Configuration update", 'You have successfully signed in the google account.');
	self.config.set('email', email);
	self.config.set('bitrate', bitrate);
	self.config.set('masterToken', authTokenData.masterToken);
	self.config.set('androidId', authTokenData.androidId);
	console.log('returned token', authTokenData);
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
})
	return defer.promise;
}


googleplaymusic.prototype.getPlaylists = function() {
	var defer = libQ.defer();
    var self = this;
	var defer = libQ.defer();
	self.playMusic.getPlayLists(function(error, playLists){
		if(error){
			defer.reject('unsuccessfull from getting music playlist from google server');
			console.error('unsuccessfull from getting music playlist from google server');
		}
		console.log('PlayLists', JSON.stringify(playLists, undefined, 4));
		defer.resolve(playLists)
	});
	return defer.promise;
}


// Configuration Methods -----------------------------------------------------------------------------

googleplaymusic.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;

    var lang_code = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
        __dirname+'/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {


            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};

googleplaymusic.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}

googleplaymusic.prototype.setUIConfig = function(data) {
	var self = this;
	//Perform your installation tasks here
};

googleplaymusic.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};

googleplaymusic.prototype.setConf = function(varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};



// Playback Controls ---------------------------------------------------------------------------------------
// If your plugin is not a music_sevice don't use this part and delete it


googleplaymusic.prototype.addToBrowseSources = function () {

	// Use this function to add your music service plugin to music sources
		var data = {name: 'Googel Play Music',  uri: 'googleplaymusic',plugin_type:'music_service',plugin_name:'googleplaymusic'};
    this.commandRouter.volumioAddToBrowseSources(data);
};

googleplaymusic.prototype.handleBrowseUri = function (curUri) {
    var self = this;

    //self.commandRouter.logger.info(curUri);
		var response;
		if (curUri == 'googleplaymusic') {
			response = libQ.resolve({
				navigation: {
					lists: [
						{
							"availableListViews": [
								"list"
							],
							"items": [
								{
									service: 'spop',
									type: 'googleplaymusic-category',
									title: 'My Playlists',
									artist: '',
									album: '',
									icon: 'fa fa-folder-open-o',
									uri: 'googleplaymusic/playlists'
								},
								{
									service: 'spop',
									type: 'googleplaymusic-category',
									title: 'Featured Playlists',
									artist: '',
									album: '',
									icon: 'fa fa-folder-open-o',
									uri: 'googleplaymusic/featuredplaylists'
								},
								{
									service: 'spop',
									type: 'googleplaymusic-category',
									title: 'What\'s New',
									artist: '',
									album: '',
									icon: 'fa fa-folder-open-o',
									uri: 'googleplaymusic/new'
								},
								{
									service: 'spop',
									type: 'googleplaymusic-category',
									title: 'Genres & Moods',
									artist: '',
									album: '',
									icon: 'fa fa-folder-open-o',
									uri: 'googleplaymusic/categories'
								}
							]
						}
					],
					"prev": {
						uri: 'googleplaymusic'
					}
				}
			});
		}
		else if (curUri.startsWith('googleplaymusic/playlists')) {
			if (curUri == 'googleplaymusic/playlists')
				response = self.getPlaylists();
			else {
				response = self.listPlaylist(curUri);
			}
		}
		else if (curUri.startsWith('googleplaymusic/featuredplaylists')) {
			response = self.featuredPlaylists(curUri);
		}
		else if (curUri.startsWith('googleplaymusic:user:')) {
			response = self.listWebPlaylist(curUri);
		}
		else if (curUri.startsWith('googleplaymusic/new')) {
			response = self.listWebNew(curUri);
		}
		else if (curUri.startsWith('googleplaymusic/categories')) {
			response = self.listWebCategories(curUri);
		}
		else if (curUri.startsWith('googleplaymusic:album')) {
			response = self.listWebAlbum(curUri);
		}
		else if (curUri.startsWith('googleplaymusic/category')) {
			response = self.listWebCategory(curUri);
		}
		else if (curUri.startsWith('googleplaymusic:artist:')) {
			response = self.listWebArtist(curUri);
		}
		return response;
	}

// Define a method to clear, add, and play an array of tracks
googleplaymusic.prototype.clearAddPlayTrack = function(track) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'googleplaymusic::clearAddPlayTrack');

	self.commandRouter.logger.info(JSON.stringify(track));

	return self.sendSpopCommand('uplay', [track.uri]);
};

googleplaymusic.prototype.seek = function (timepos) {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'googleplaymusic::seek to ' + timepos);

    return this.sendSpopCommand('seek '+timepos, []);
};

// Stop
googleplaymusic.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'googleplaymusic::stop');


};

// Spop pause
googleplaymusic.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'googleplaymusic::pause');


};

// Get state
googleplaymusic.prototype.getState = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'googleplaymusic::getState');


};

//Parse state
googleplaymusic.prototype.parseState = function(sState) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'googleplaymusic::parseState');

	//Use this method to parse the state and eventually send it with the following function
};

// Announce updated State
googleplaymusic.prototype.pushState = function(state) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'googleplaymusic::pushState');

	return self.commandRouter.servicePushState(state, self.servicename);
};


googleplaymusic.prototype.explodeUri = function(uri) {
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
		if (data.album != undefined)
			album = data.album;
		else album = data.artist;

		web = '?web=' + nodetools.urlEncode(artist) + '/' + nodetools.urlEncode(album) + '/large'
	}

	var url = '/albumart';

	if (web != undefined)
		url = url + web;

	if (web != undefined && path != undefined)
		url = url + '&';
	else if (path != undefined)
		url = url + '?';

	if (path != undefined)
		url = url + 'path=' + nodetools.urlEncode(path);

	return url;
};





googleplaymusic.prototype.search = function (query) {
	var self=this;
	var defer=libQ.defer();

	// Mandatory, search. You can divide the search in sections using following functions

	return defer.promise;
};

googleplaymusic.prototype._searchArtists = function (results) {

};

googleplaymusic.prototype._searchAlbums = function (results) {

};

googleplaymusic.prototype._searchPlaylists = function (results) {


};

googleplaymusic.prototype._searchTracks = function (results) {

};

googleplaymusic.prototype.goto=function(data){
    var self=this
    var defer=libQ.defer()

// Handle go to artist and go to album function

     return defer.promise;
};
