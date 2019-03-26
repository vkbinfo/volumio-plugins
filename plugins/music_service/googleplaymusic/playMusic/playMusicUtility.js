
/**
 * gets required playlist data from a playlist information object.
 * @param  {} playlist a object that contains information about a playlist
 */
function getFormatedPlaylistData(playlist) {
  return {
    service: 'googleplaymusic',
    type: "folder",
    title: playlist.name,
    icon: "fa fa-list-ol",
    uri: "googleplaymusic/playlists/" + playlist.id,
  };
}

/**
 * @param  {} tracksArray  A list which contains songs
 * @param  {} playListId playlist id, for which this function is going to filter songs from the tracksArray
 */
function retrievSongsOfAPlaylist(tracksArray, playListId) {
  return tracksArray.reduce(function (acc, track) {
    if (track.playlistId === playListId) {
      var trackData = track.track;
      var volumioFormatSong = getVolumioFormatOfSong(track.trackId, trackData);
      acc.push(volumioFormatSong);
    }
    return acc;
  }, []);
}

/**
 * gets required track data from a track's information object.
 * @param  {} track a object that contains information about a track
 */
function getStationSongFormat(track) {
  return {
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
    duration: Math.trunc(track.durationMillis / 1000),
    bitdepth: '16 bit',
    trackType: 'googleplaymusic',
  };
}

/**
 * get's a predefined song structure for volumio player to play or render.
 * @param  {} trackId trackId that required to be added into return data.
 * @param  {} trackInfo an object that contains information about the song.
 */
function getVolumioFormatOfSong(trackId, trackInfo) {
  return {
    uri: 'googleplaymusic:track:' + trackId,
    service: 'googleplaymusic', // plugin name
    type: 'song',
    title: trackInfo.title,
    artist: trackInfo.artist,
    album: trackInfo.album,
    albumart: trackInfo.albumArtRef[0].url,
    name: trackInfo.title,
    duration: Math.trunc(trackInfo.durationMillis / 1000),
    // samplerate: self.samplerate,
    bitdepth: '16 bit',
    trackType: 'googleplaymusic',
  };
}

/**
 * gets required station data from a stations's information object.
 * @param  {} station a object that contains information about a station
 */
function getFormatedStationData(station) {
  return {
    service: 'googleplaymusic',
    type: "folder",
    title: station.name,
    icon: "fa fa-list-ol",
    uri: "googleplaymusic/stations/" + station.id,
  };
}

/**
 * gets required album track data from a track's information object.
 * @param  {} track a object that contains information about a track
 */
function getFormatedAlbumTrackData(track) {
  return {
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
    duration: Math.trunc(track.durationMillis / 1000),
    bitdepth: '16 bit',
    trackType: 'googleplaymusic',
  };
}

module.exports = {
  getFormatedPlaylistData: getFormatedPlaylistData,
  retrievSongsOfAPlaylist: retrievSongsOfAPlaylist,
  getVolumioFormatOfSong: getVolumioFormatOfSong,
  getStationSongFormat: getStationSongFormat,
  getFormatedStationData: getFormatedStationData,
  getFormatedAlbumTrackData: getFormatedAlbumTrackData
};
