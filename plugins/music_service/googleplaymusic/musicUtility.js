function getAlbumUrl(data, path) {
  var artist, album;
  if (data != undefined && data.path != undefined) {
    path = data.path;
  }
  var web;
  if (data != undefined && data.artist != undefined) {
    artist = data.artist;
    if (data.album != undefined) album = data.album;
    else album = data.artist;
    web = "?web=" +
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
}

module.exports = {
  getAlbumUrl: getAlbumUrl,
};
